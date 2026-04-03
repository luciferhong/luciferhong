import json, sys, io, openpyxl
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# ── 1. 데이터 추출 (전체 단지, top20 제한 없음) ──────────────────────────
wb = openpyxl.load_workbook('시세트래킹 (3).xlsx', data_only=True)
ws = wb['시세트래킹']
max_col = ws.max_column

row3  = [ws.cell(row=3,  column=c).value for c in range(1, max_col+1)]
row8  = [ws.cell(row=8,  column=c).value for c in range(1, max_col+1)]
row12 = [ws.cell(row=12, column=c).value for c in range(1, max_col+1)]  # 전용면적(㎡)
row14 = [ws.cell(row=14, column=c).value for c in range(1, max_col+1)]  # 전용형(평)

apt_cols = [c for c in range(2, max_col+1)
            if row8[c-1] and isinstance(row8[c-1], str) and len(row8[c-1]) > 1]

# 날짜 시점 탐색
date_rows = []
for i in range(1, ws.max_row+1):
    v = ws.cell(row=i, column=1).value
    if v and str(v).startswith('20') and ('-' in str(v) or '.' in str(v)):
        date_rows.append((i, str(v)))

# meta: key -> {name, region, area, pyeong}
meta = {}
for c in apt_cols:
    name   = row8[c-1]
    region = row3[c-1] if row3[c-1] and row3[c-1] != '지역(시군구)' else ''
    key    = f'{name}||{region}'
    area   = row12[c-1]  # 전용면적 ㎡
    pyeong = row14[c-1]  # 전용형 평
    meta[key] = {
        'name':   name,
        'region': region,
        'area':   round(float(area), 1) if area and isinstance(area, (int, float)) else None,
        'pyeong': round(float(pyeong), 1) if pyeong and isinstance(pyeong, (int, float)) else None,
    }

# 각 시점별 전체 단지 데이터 (forward-fill 적용, 실제 데이터 없는 시점 제외)
last_price = {}  # key -> 마지막으로 기록된 가격
all_frames = []
for row_num, date in date_rows:
    # 이번 시점 실제 데이터 수집
    has_new = False
    for c in apt_cols:
        price = ws.cell(row=row_num, column=c).value
        if price and isinstance(price, (int, float)) and price > 0:
            name   = row8[c-1]
            region = row3[c-1] if row3[c-1] and row3[c-1] != '지역(시군구)' else ''
            key    = f'{name}||{region}'
            last_price[key] = int(price)
            has_new = True

    # 실제 입력 데이터가 없는 시점은 프레임에서 제외
    if not has_new:
        continue

    # forward-fill: 지금까지 한 번이라도 기록된 단지는 모두 포함
    items = []
    for c in apt_cols:
        name   = row8[c-1]
        region = row3[c-1] if row3[c-1] and row3[c-1] != '지역(시군구)' else ''
        key    = f'{name}||{region}'
        if key in last_price:
            items.append({'key': key, 'name': name, 'region': region, 'price': last_price[key]})

    if items:
        items.sort(key=lambda x: x['price'], reverse=True)
        all_frames.append({'date': date, 'items': items})

regions_list = sorted({it['region'] for f in all_frames for it in f['items'] if it['region']})
print(f'프레임: {len(all_frames)}개, 지역: {len(regions_list)}개, meta: {len(meta)}개')

chart_data = json.dumps({
    'frames':  all_frames,
    'regions': regions_list,
    'meta':    meta
}, ensure_ascii=False)
print(f'JSON: {len(chart_data):,}바이트')

# ── 2. HTML 생성 ──────────────────────────────────────────────────────────
HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>아파트 매매가 시세 변화</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #0d0f17; color: #ddd; font-family: 'Noto Sans KR', sans-serif; overflow-x: hidden; }

/* ── Layout ── */
#layout { display: flex; gap: 0; min-height: 100vh; }

/* ── Sidebar ── */
#sidebar {
  width: 260px; min-width: 260px; background: #13151f;
  border-right: 1px solid #1e2030; padding: 16px 12px;
  display: flex; flex-direction: column; gap: 12px;
  overflow-y: auto; max-height: 100vh; position: sticky; top: 0;
}
#sidebar h2 { font-size: 0.85rem; color: #aaa; letter-spacing: 1px; text-transform: uppercase; }

.filter-section { display: flex; flex-direction: column; gap: 6px; }
.filter-title {
  font-size: 0.75rem; color: #888; display: flex;
  justify-content: space-between; align-items: center;
}
.filter-actions { display: flex; gap: 4px; }
.filter-actions button {
  font-size: 0.65rem; padding: 2px 7px; border-radius: 4px;
  background: #1e2030; border: 1px solid #2a2d3a; color: #aaa; cursor: pointer;
}
.filter-actions button:hover { background: #2a2d3a; color: #fff; }

.region-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 4px;
  max-height: 220px; overflow-y: auto;
}
.cb-item {
  display: flex; align-items: center; gap: 5px;
  font-size: 0.65rem; color: #bbb; cursor: pointer;
  padding: 3px 4px; border-radius: 4px; transition: background 0.15s;
}
.cb-item:hover { background: #1e2030; }
.cb-item input { accent-color: #4a6cf7; width: 12px; height: 12px; cursor: pointer; }
.color-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }

.apt-list {
  max-height: 260px; overflow-y: auto;
  display: flex; flex-direction: column; gap: 2px;
}
.apt-item {
  display: flex; align-items: center; gap: 5px;
  font-size: 0.63rem; color: #bbb; cursor: pointer;
  padding: 3px 4px; border-radius: 4px; transition: background 0.15s;
}
.apt-item:hover { background: #1e2030; }
.apt-item input { accent-color: #4a6cf7; width: 12px; height: 12px; cursor: pointer; }

#apt-search {
  background: #1e2030; border: 1px solid #2a2d3a; color: #ddd;
  padding: 5px 8px; border-radius: 6px; font-size: 0.72rem; width: 100%;
  outline: none;
}
#apt-search:focus { border-color: #4a6cf7; }

/* ── Main ── */
#main { flex: 1; padding: 20px; display: flex; flex-direction: column; gap: 14px; min-width: 0; }

h1 { font-size: 1.2rem; color: #fff; }
.subtitle { font-size: 0.75rem; color: #666; }

/* ── Controls ── */
#controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ctrl-btn {
  background: #1e2030; border: 1px solid #2a2d3a; color: #ddd;
  padding: 7px 18px; border-radius: 7px; cursor: pointer; font-size: 0.82rem;
  transition: background 0.2s; white-space: nowrap;
}
.ctrl-btn:hover { background: #2a2d3a; }
.ctrl-btn.active { background: #4a6cf7; border-color: #4a6cf7; color: #fff; }
.ctrl-label { font-size: 0.75rem; color: #666; }
input[type=range] { width: 90px; accent-color: #4a6cf7; }

#top-n-label { font-size: 0.75rem; color: #888; }

/* ── Timeline ── */
#timeline { display: flex; gap: 6px; flex-wrap: wrap; align-items: flex-end; }
.tl-item { display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; }
.tl-dot { width: 9px; height: 9px; border-radius: 50%; background: #2a2d3a; transition: all 0.2s; }
.tl-item.active .tl-dot { background: #4a6cf7; transform: scale(1.6); }
.tl-item.past   .tl-dot { background: #4a6cf7; opacity: 0.4; }
.tl-date { font-size: 0.52rem; color: #555; white-space: nowrap; }
.tl-item.active .tl-date { color: #6b8cf7; font-weight: 700; }

/* ── Chart ── */
#chart-wrap {
  position: relative; background: #13151f;
  border-radius: 12px; padding: 28px 14px 8px 14px;
  flex: 1; display: flex; flex-direction: column;
}

.grid-lines { position: absolute; left: 14px; right: 14px; top: 28px; bottom: 8px; pointer-events: none; }
.grid-line { position: absolute; left: 0; right: 0; height: 1px; background: rgba(255,255,255,0.04); }
.grid-label { position: absolute; right: 0; top: -9px; font-size: 0.58rem; color: #3a3d4a; }

#bars-container { display: flex; align-items: flex-end; gap: 4px; height: 400px; position: relative; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
.bar {
  width: 100%; border-radius: 4px 4px 0 0;
  position: relative; min-height: 2px; will-change: height;
}
.bar-val {
  position: absolute; top: -19px; left: 50%; transform: translateX(-50%);
  font-size: 0.58rem; color: #ddd; white-space: nowrap; font-weight: 700;
}
.bar-rank {
  position: absolute; top: 4px; left: 50%; transform: translateX(-50%);
  font-size: 0.58rem; color: rgba(255,255,255,0.35); font-weight: 800;
}
#x-labels { display: flex; gap: 4px; margin-top: 6px; align-items: flex-start; }
.x-lbl {
  flex: 1; font-size: 0.6rem; color: #888;
  writing-mode: vertical-lr; text-orientation: mixed;
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  max-height: 110px; cursor: default; transition: color 0.2s;
}
.x-lbl:hover { color: #eee; }

/* ── Progress ── */
#progress-bar { width: 100%; height: 3px; background: #1e2030; border-radius: 2px; overflow: hidden; }
#progress-fill { height: 100%; background: linear-gradient(90deg, #4a6cf7, #a78bfa); border-radius: 2px; width: 0%; }

/* ── Legend ── */
#legend { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 12px; }
.legend-item { display: flex; align-items: center; gap: 5px; font-size: 0.72rem; color: #bbb; }
.legend-dot { width: 11px; height: 11px; border-radius: 3px; flex-shrink: 0; }

/* ── Y-axis ── */
#chart-wrap { padding-left: 52px; }
#y-axis {
  position: absolute; left: 0; top: 28px; bottom: 8px; width: 48px;
  display: flex; flex-direction: column; justify-content: space-between;
  align-items: flex-end; pointer-events: none;
}
.y-tick { font-size: 0.62rem; color: #666; padding-right: 6px; white-space: nowrap; line-height: 1; }

/* ── Date overlay ── */
#date-display {
  position: fixed; right: 32px; bottom: 32px;
  font-size: 3rem; font-weight: 900; color: rgba(255,255,255,0.06);
  pointer-events: none; letter-spacing: 2px;
}

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #2a2d3a; border-radius: 2px; }
</style>
</head>
<body>
<div id="layout">

<!-- ── Sidebar ── -->
<div id="sidebar">
  <h2>&#9776; 필터</h2>

  <div class="filter-section">
    <div class="filter-title">
      지역
      <div class="filter-actions">
        <button onclick="toggleAllRegions(true)">전체</button>
        <button onclick="toggleAllRegions(false)">해제</button>
      </div>
    </div>
    <div class="region-grid" id="region-list"></div>
  </div>

  <div class="filter-section">
    <div class="filter-title">
      전용면적
      <div class="filter-actions">
        <button onclick="toggleAllAreas(true)">전체</button>
        <button onclick="toggleAllAreas(false)">해제</button>
      </div>
    </div>
    <div class="region-grid" id="area-list"></div>
  </div>

  <div class="filter-section">
    <div class="filter-title">
      단지
      <div class="filter-actions">
        <button onclick="toggleAllApts(true)">전체</button>
        <button onclick="toggleAllApts(false)">해제</button>
      </div>
    </div>
    <input type="text" id="apt-search" placeholder="단지 검색...">
    <div class="apt-list" id="apt-list"></div>
  </div>
</div>

<!-- ── Main ── -->
<div id="main">
  <div>
    <h1>아파트 매매가 시세 변화</h1>
    <p class="subtitle">Space: 재생/정지 &nbsp;|&nbsp; ←→: 이동</p>
  </div>

  <div id="controls">
    <button class="ctrl-btn" id="btn-play">&#9654; 재생</button>
    <button class="ctrl-btn" id="btn-reset">&#8635; 처음</button>
    <span class="ctrl-label">속도:</span>
    <input type="range" id="speed" min="1" max="10" value="1" step="0.5">
    <span class="ctrl-label" id="speed-val">1x</span>
    <span class="ctrl-label" id="top-n-label"></span>
  </div>

  <div id="timeline"></div>

  <div id="chart-wrap">
    <div id="y-axis"></div>
    <div class="grid-lines" id="grid-lines"></div>
    <div id="bars-container"></div>
    <div id="x-labels"></div>
  </div>

  <div id="progress-bar"><div id="progress-fill"></div></div>
  <div id="legend"></div>
</div>
</div>

<div id="date-display"></div>

<script>
// ── 데이터 ──────────────────────────────────────────────────────────────
const RAW = CHART_DATA_PLACEHOLDER;

const REGION_COLORS = {
  '서울 마포구':       '#4a6cf7',
  '서울 성동구':       '#06b6d4',
  '서울 동작구':       '#10b981',
  '서울 서대문구':     '#f59e0b',
  '서울 영등포구':     '#ef4444',
  '서울 은평구':       '#8b5cf6',
  '서울 동대문구':     '#ec4899',
  '경기 광명시':       '#84cc16',
  '경기 구리시':       '#f97316',
  '경기 군포시':       '#14b8a6',
  '경기 수원시팔달구': '#a855f7',
  '경기도 의왕시':     '#fb923c',
  '용인시 수지구':     '#22d3ee',
  '인천연수구':        '#fbbf24',
  '안양시 동안구':     '#6ee7b7',
  '안양시 만안구':     '#c4b5fd',
  '부산 남구':         '#f87171',
  '대구 동구':         '#34d399',
  '대구 수성구':       '#60a5fa',
  '대구 중구':         '#a3e635',
  '대전광역시 서구':   '#fb7185',
  '대전광역시 중구':   '#e879f9',
  '경북 구미시':       '#fde68a',
  '천안 서북구':       '#99f6e4',
  '천안 동남구':       '#bfdbfe',
  '청주 서원구':       '#ddd6fe',
};
function regionColor(r) { return REGION_COLORS[r] || '#6b7280'; }

// ── 필터 상태 ────────────────────────────────────────────────────────────
const activeRegions = new Set(RAW.regions);
const activeApts    = new Set(Object.keys(RAW.meta));

// 면적 구간 정의 (㎡ 기준)
const AREA_BANDS = [
  { label: '~59㎡',        min: 0,   max: 59  },
  { label: '60~74㎡',      min: 60,  max: 74  },
  { label: '75~84㎡',      min: 75,  max: 84  },
  { label: '85㎡~',        min: 85,  max: 9999 },
  { label: '면적미입력',   min: null, max: null },
];
const activeAreaBands = new Set(AREA_BANDS.map(b => b.label));

function areaInBand(area, band) {
  if (band.min === null) return area == null;
  return area != null && area >= band.min && area <= band.max;
}
function isAreaActive(area) {
  return [...activeAreaBands].some(label => {
    const band = AREA_BANDS.find(b => b.label === label);
    return band && areaInBand(area, band);
  });
}

// ── Sidebar: 지역 ────────────────────────────────────────────────────────
const regionListEl = document.getElementById('region-list');
RAW.regions.forEach(r => {
  const label = document.createElement('label');
  label.className = 'cb-item';
  const cb = document.createElement('input');
  cb.type = 'checkbox'; cb.checked = true;
  cb.addEventListener('change', () => {
    if (cb.checked) activeRegions.add(r); else activeRegions.delete(r);
    rebuildAptList();
    onFilterChange();
  });
  const dot  = document.createElement('div');
  dot.className = 'color-dot';
  dot.style.background = regionColor(r);
  label.appendChild(cb);
  label.appendChild(dot);
  label.appendChild(document.createTextNode(r));
  regionListEl.appendChild(label);
});

function toggleAllRegions(on) {
  regionListEl.querySelectorAll('input').forEach(cb => {
    cb.checked = on;
    const r = cb.parentElement.textContent.trim();
    if (on) activeRegions.add(r); else activeRegions.delete(r);
  });
  rebuildAptList();
  onFilterChange();
}

// ── Sidebar: 면적 ────────────────────────────────────────────────────────
const areaListEl = document.getElementById('area-list');
AREA_BANDS.forEach(band => {
  const label = document.createElement('label');
  label.className = 'cb-item';
  const cb = document.createElement('input');
  cb.type = 'checkbox'; cb.checked = true;
  cb.addEventListener('change', () => {
    if (cb.checked) activeAreaBands.add(band.label);
    else activeAreaBands.delete(band.label);
    rebuildAptList();
    onFilterChange();
  });
  label.appendChild(cb);
  label.appendChild(document.createTextNode(band.label));
  areaListEl.appendChild(label);
});

function toggleAllAreas(on) {
  areaListEl.querySelectorAll('input').forEach(cb => { cb.checked = on; });
  AREA_BANDS.forEach(b => { if (on) activeAreaBands.add(b.label); else activeAreaBands.delete(b.label); });
  rebuildAptList();
  onFilterChange();
}

// ── Sidebar: 단지 ────────────────────────────────────────────────────────
const aptListEl   = document.getElementById('apt-list');
const aptSearchEl = document.getElementById('apt-search');
let aptCheckboxes = {}; // key -> cb element

function rebuildAptList() {
  const q = aptSearchEl.value.toLowerCase();
  aptListEl.innerHTML = '';
  aptCheckboxes = {};
  const visible = Object.entries(RAW.meta)
    .filter(([key, m]) => activeRegions.has(m.region) && isAreaActive(m.area))
    .filter(([key, m]) => !q || m.name.toLowerCase().includes(q))
    .sort((a, b) => a[1].name.localeCompare(b[1].name, 'ko'));

  visible.forEach(([key, m]) => {
    const label = document.createElement('label');
    label.className = 'apt-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = activeApts.has(key);
    cb.addEventListener('change', () => {
      if (cb.checked) activeApts.add(key); else activeApts.delete(key);
      onFilterChange();
    });
    const dot = document.createElement('div');
    dot.className = 'color-dot';
    dot.style.background = regionColor(m.region);
    const areaText = m.area != null
      ? `${m.area}㎡` + (m.pyeong != null ? `(${m.pyeong.toFixed(0)}평)` : '')
      : '';
    label.appendChild(cb);
    label.appendChild(dot);
    const nameSpan = document.createElement('span');
    nameSpan.textContent = m.name;
    label.appendChild(nameSpan);
    if (areaText) {
      const aSpan = document.createElement('span');
      aSpan.style.cssText = 'color:#555;font-size:0.58rem;margin-left:2px;';
      aSpan.textContent = areaText;
      label.appendChild(aSpan);
    }
    aptListEl.appendChild(label);
    aptCheckboxes[key] = cb;
  });
}

function toggleAllApts(on) {
  aptListEl.querySelectorAll('input').forEach(cb => { cb.checked = on; });
  Object.entries(RAW.meta).forEach(([key, m]) => {
    if (activeRegions.has(m.region) && isAreaActive(m.area)) {
      if (on) activeApts.add(key); else activeApts.delete(key);
    }
  });
  onFilterChange();
}

aptSearchEl.addEventListener('input', rebuildAptList);

// ── 안정 순서 & 첫 데이터 프레임 ─────────────────────────────────────────
let stableOrder  = []; // 고정된 컬럼 순서 (key 배열)
let yAxisMax     = 1;  // Y축 고정 최대값 (역대 최고가)

function computeStableOrder() {
  // 최대 가격 (Y축용)
  const maxPrices = new Map();
  for (const frame of RAW.frames) {
    for (const it of frame.items) {
      const m = RAW.meta[it.key] || {};
      if (activeRegions.has(it.region) && activeApts.has(it.key) && isAreaActive(m.area)) {
        if ((it.price || 0) > (maxPrices.get(it.key) || 0))
          maxPrices.set(it.key, it.price);
      }
    }
  }

  // 시작 시점 가격: 데이터가 있는 첫 프레임 기준
  const firstIdx = getFirstFrameWithData();
  const firstPrices = new Map();
  for (const it of RAW.frames[firstIdx].items) {
    if (activeRegions.has(it.region) && activeApts.has(it.key))
      firstPrices.set(it.key, it.price);
  }

  stableOrder = [...maxPrices.keys()]
    .sort((a, b) => (firstPrices.get(b) || 0) - (firstPrices.get(a) || 0));

  // Y축 최대값: stableOrder 내 단지들의 역대 최고가
  yAxisMax = stableOrder.length > 0
    ? Math.max(...stableOrder.map(k => maxPrices.get(k) || 0), 1)
    : 1;

  const lbl = document.getElementById('top-n-label');
  if (lbl) lbl.textContent = stableOrder.length > 0 ? '단지 ' + stableOrder.length + '개' : '';

  updateLegend();
  updateYAxis();
}

function updateLegend() {
  const regions = [...new Set(stableOrder.map(k => (RAW.meta[k] || {}).region).filter(Boolean))];
  legendEl.innerHTML = regions.map(r =>
    `<div class="legend-item"><div class="legend-dot" style="background:${regionColor(r)}"></div><span>${r}</span></div>`
  ).join('');
}

function updateYAxis() {
  yAxisEl.innerHTML = '';
  for (let i = GRID_N; i >= 0; i--) {
    const tick = document.createElement('div');
    tick.className = 'y-tick';
    tick.id = 'yt' + i;
    tick.textContent = formatPrice(Math.round(yAxisMax * i / GRID_N));
    yAxisEl.appendChild(tick);
  }
}

function getFirstFrameWithData() {
  const effectiveRegions = new Set(
    Object.entries(RAW.meta)
      .filter(([key, m]) => activeRegions.has(m.region) && activeApts.has(key) && isAreaActive(m.area))
      .map(([, m]) => m.region)
  );
  if (effectiveRegions.size === 0) return 0;

  for (let i = 0; i < RAW.frames.length; i++) {
    const regionsInFrame = new Set(
      RAW.frames[i].items
        .filter(it => activeRegions.has(it.region) && activeApts.has(it.key))
        .map(it => it.region)
    );
    // 유효한 모든 지역이 이 프레임에 데이터를 가지고 있어야 함
    if ([...effectiveRegions].every(r => regionsInFrame.has(r))) return i;
  }
  return 0;
}

// ── 필터 변경 처리 ────────────────────────────────────────────────────────
function onFilterChange() {
  stopAnim();
  computeStableOrder();
  tweenState.clear();
  jumpToFrame(getFirstFrameWithData());
  updateTimeline();
}

// ── 애니메이션 상태 ──────────────────────────────────────────────────────
// tweenState: key -> { prevPrice, targetPrice, name, region }
const tweenState = new Map();
let currentFrame    = 0;
let playing         = false;
let playTimer       = null;
let rafId           = null;
let tweenStartTime  = 0;
const BASE_MS       = 1800;
const TWEEN_MS      = () => Math.max(150, BASE_MS / parseFloat(speedInput.value));

function easeInOutCubic(t) {
  // 부드러운 시작·끝, 중간은 선형에 가깝게 (Smoothstep 변형)
  return t * t * (3 - 2 * t);
}
function lerp(a, b, t) { return a + (b - a) * t; }

function getProgress() {
  return Math.min(1, (performance.now() - tweenStartTime) / TWEEN_MS());
}

// 프레임의 가격 맵 (필터 적용)
function getFramePrices(frameIdx) {
  const map = new Map();
  for (const it of RAW.frames[frameIdx].items) {
    const m = RAW.meta[it.key] || {};
    if (activeRegions.has(it.region) && activeApts.has(it.key) && isAreaActive(m.area))
      map.set(it.key, it.price);
  }
  return map;
}

// 즉시 점프 (애니메이션 없이)
function jumpToFrame(idx) {
  cancelAnimationFrame(rafId); rafId = null;
  currentFrame = idx;
  tweenState.clear();
  const prices = getFramePrices(idx);
  for (const key of stableOrder) {
    const meta  = RAW.meta[key] || {};
    const price = prices.get(key) || 0;
    tweenState.set(key, { prevPrice: price, targetPrice: price,
                          name: meta.name || '', region: meta.region || '' });
  }
  tweenStartTime = performance.now() - TWEEN_MS();
  drawBars(1);
  updateOverlay(idx, 1);
}

// 다음 프레임으로 tween 전환
function transitionTo(newIdx) {
  cancelAnimationFrame(rafId); rafId = null;
  const ep        = easeInOutCubic(getProgress());
  const newPrices = getFramePrices(newIdx);

  // 현재 interpolated 가격 먼저 저장 (clear 전에)
  const curPrices = new Map();
  for (const key of stableOrder) {
    const s = tweenState.get(key);
    curPrices.set(key, s ? lerp(s.prevPrice, s.targetPrice, ep) : 0);
  }

  tweenState.clear();
  for (const key of stableOrder) {
    const meta = RAW.meta[key] || {};
    tweenState.set(key, {
      prevPrice:   curPrices.get(key) || 0,
      targetPrice: newPrices.get(key) || 0,
      name: meta.name || '', region: meta.region || ''
    });
  }

  currentFrame   = newIdx;
  tweenStartTime = performance.now();
  rafId = requestAnimationFrame(rafLoop);
}

function rafLoop() {
  const progress = getProgress();
  drawBars(easeInOutCubic(progress));
  updateOverlay(currentFrame, progress);
  if (progress < 1) {
    rafId = requestAnimationFrame(rafLoop);
  } else {
    rafId = null;
    if (playing) scheduleNext();
  }
}

// ── 렌더링 ───────────────────────────────────────────────────────────────
const barsEl   = document.getElementById('bars-container');
const xLblsEl  = document.getElementById('x-labels');
const gridEl   = document.getElementById('grid-lines');
const dateEl   = document.getElementById('date-display');
const progEl   = document.getElementById('progress-fill');
const yAxisEl  = document.getElementById('y-axis');
const legendEl = document.getElementById('legend');

// 그리드 초기 생성
const GRID_N = 5;
const gridLineEls  = [];
const gridLabelEls = [];
for (let i = 0; i <= GRID_N; i++) {
  const line = document.createElement('div');
  line.className = 'grid-line';
  line.style.bottom = (i / GRID_N * 100) + '%';
  const lbl = document.createElement('span');
  lbl.className = 'grid-label';
  line.appendChild(lbl);
  gridEl.appendChild(line);
  gridLineEls.push(line);
  gridLabelEls.push(lbl);
}

function formatPrice(p) {
  if (p >= 10000) return (p / 10000).toFixed(1) + '억';
  return Math.round(p / 1000) + '천';
}

// 바 DOM 풀 관리
const barPool = [];
function getBarSlot(i) {
  while (barPool.length <= i) {
    const col  = document.createElement('div'); col.className = 'bar-col';
    const bar  = document.createElement('div'); bar.className = 'bar';
    const rank = document.createElement('div'); rank.className = 'bar-rank';
    const val  = document.createElement('div'); val.className = 'bar-val';
    bar.appendChild(rank); bar.appendChild(val);
    col.appendChild(bar);
    barsEl.appendChild(col);
    const lbl = document.createElement('div'); lbl.className = 'x-lbl';
    xLblsEl.appendChild(lbl);
    barPool.push({ col, bar, rank, val, lbl });
  }
  return barPool[i];
}

function drawBars(ep) {
  const N = stableOrder.length;
  if (N === 0) {
    for (let i = 0; i < barPool.length; i++) {
      barPool[i].col.style.display = 'none';
      barPool[i].lbl.style.display = 'none';
    }
    return;
  }

  // 각 단지의 현재 interpolated 가격
  const prices = stableOrder.map(key => {
    const s = tweenState.get(key);
    return s ? lerp(s.prevPrice, s.targetPrice, ep) : 0;
  });

  const maxP = yAxisMax;

  // 그리드 레이블 (희미한 보조선 레이블 — y축이 주 레이블이므로 숨김)
  for (let i = 0; i <= GRID_N; i++) {
    gridLabelEls[i].textContent = '';
  }

  // 바 표시 (stableOrder 순서 고정)
  for (let i = 0; i < N; i++) {
    const key   = stableOrder[i];
    const price = prices[i];
    const meta  = RAW.meta[key] || {};
    const { col, bar, rank, val, lbl } = getBarSlot(i);
    const c    = regionColor(meta.region || '');
    const hPct = (price / maxP) * 95;
    const hasData = price > 100;

    col.style.display = '';
    lbl.style.display = '';
    bar.style.height     = hPct + '%';
    bar.style.background = hasData ? `linear-gradient(180deg, ${c}ee, ${c}66)` : 'transparent';
    bar.style.boxShadow  = hasData ? `0 0 12px ${c}44` : 'none';
    bar.style.opacity    = '1';
    val.textContent      = hasData ? formatPrice(price) : '';
    rank.textContent     = hasData ? '#' + (i + 1) : '';
    lbl.textContent      = meta.name || '';
    lbl.style.color      = hasData ? c : '#333';
    lbl.style.opacity    = '1';
  }
  // 나머지 슬롯 숨기기
  for (let i = N; i < barPool.length; i++) {
    barPool[i].col.style.display = 'none';
    barPool[i].lbl.style.display = 'none';
  }
}

function updateOverlay(frameIdx, progress) {
  const frame = RAW.frames[frameIdx];
  dateEl.textContent  = frame.date;
  const totalFrames   = RAW.frames.length;
  const pct = ((frameIdx + (progress < 1 ? 0 : 0)) / (totalFrames - 1)) * 100;
  progEl.style.width  = pct + '%';
  progEl.style.transition = 'none';
  updateTimeline(frameIdx);
}

// ── Timeline ─────────────────────────────────────────────────────────────
const timelineEl = document.getElementById('timeline');
RAW.frames.forEach((f, i) => {
  const item = document.createElement('div');
  item.className = 'tl-item';
  item.innerHTML = '<div class="tl-dot"></div><div class="tl-date">' + f.date + '</div>';
  item.addEventListener('click', () => { stopAnim(); jumpToFrame(i); });
  timelineEl.appendChild(item);
});

function updateTimeline(idx) {
  idx = idx ?? currentFrame;
  timelineEl.querySelectorAll('.tl-item').forEach((el, i) => {
    el.className = 'tl-item' + (i === idx ? ' active' : i < idx ? ' past' : '');
  });
}

// ── 재생 제어 ────────────────────────────────────────────────────────────
const speedInput = document.getElementById('speed');
const btnPlay    = document.getElementById('btn-play');

function play() {
  if (currentFrame >= RAW.frames.length - 1) { jumpToFrame(getFirstFrameWithData()); }
  playing = true;
  btnPlay.textContent = '⏸ 일시정지';
  btnPlay.classList.add('active');
  if (currentFrame < RAW.frames.length - 1) {
    transitionTo(currentFrame + 1);
  } else {
    stopAnim();
  }
}

function stopAnim() {
  playing = false;
  cancelAnimationFrame(rafId); rafId = null;
  clearTimeout(playTimer); playTimer = null;
  btnPlay.textContent = '▶ 재생';
  btnPlay.classList.remove('active');
}

function scheduleNext() {
  if (!playing) return;
  if (currentFrame < RAW.frames.length - 1) {
    transitionTo(currentFrame + 1);
  } else {
    stopAnim();
  }
}

btnPlay.addEventListener('click', () => { playing ? stopAnim() : play(); });
document.getElementById('btn-reset').addEventListener('click', () => {
  stopAnim(); jumpToFrame(getFirstFrameWithData());
});

speedInput.addEventListener('input', () => {
  const v = parseFloat(speedInput.value);
  document.getElementById('speed-val').textContent = (v % 1 === 0 ? v : v.toFixed(1)) + 'x';
});

document.addEventListener('keydown', e => {
  if (e.target === aptSearchEl) return;
  if (e.key === ' ') { e.preventDefault(); playing ? stopAnim() : play(); }
  if (e.key === 'ArrowRight') { stopAnim(); if (currentFrame < RAW.frames.length-1) transitionTo(currentFrame+1); }
  if (e.key === 'ArrowLeft')  { stopAnim(); if (currentFrame > 0) transitionTo(currentFrame-1); }
});

// ── 초기화 ───────────────────────────────────────────────────────────────
rebuildAptList();
computeStableOrder();
jumpToFrame(getFirstFrameWithData());
</script>
</body>
</html>"""

html_final = HTML_TEMPLATE.replace('CHART_DATA_PLACEHOLDER', chart_data)
with open('sise_chart_race.html', 'w', encoding='utf-8') as f:
    f.write(html_final)
print(f'생성 완료: sise_chart_race.html ({len(html_final):,}바이트)')
