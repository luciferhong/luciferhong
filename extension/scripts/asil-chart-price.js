// [확장 이식] 원본: [루시퍼홍] 아실 차트 가격표.user.js v2.40 — MAIN world(페이지 컨텍스트) 실행
// greasyfork 업데이트 팝업 제거. 토글 플래그는 common/gate.js가 localStorage로 미러링.
(() => {
  const SCRIPT_ID = 'asil-chart-price';
  try {
    const __en = JSON.parse(localStorage.getItem('__luciferhongExtEnabled') || '{}');
    if (__en[SCRIPT_ID] === false) return; // 미설정 = 켜짐
  } catch (e) {}
  console.log('아실 차트 가격표 v2.40 (extension)');

// [확장 이식] 원본 L14~17 헬퍼 복원 (팝업 블록 제거 시 함께 잘렸던 부분)
const TS  = () => new Date().toISOString();
const log = (...a) => console.log(`[%s][ASIL]`, TS(), ...a);
const warn= (...a) => console.warn(`[%s][ASIL]`, TS(), ...a);
const err = (...a) => console.error(`[%s][ASIL]`, TS(), ...a);

(function () {
  'use strict';

  /* ===================== 0) 공통 유틸 (appendChild 우회 등) ===================== */
  const __insBefore = Node.prototype.insertBefore;
  const __remove    = Element.prototype.remove;
  function safeInsert(parent, node, ref = null){ try { return __insBefore.call(parent, node, ref); } catch(_){} }
  function safeAppend(parent, node){ return safeInsert(parent, node, null); }
  function safeRemove(node){ try { return __remove.call(node); } catch(_){} }

  /* ===================== (추가) 추가정보 토글(로컬스토리지 저장) ===================== */
  const ASIL_EXTRA_KEY = 'asil_priceTable_extraInfo'; // 1=show, 0=hide
  function getExtraInfoEnabled(){ return localStorage.getItem(ASIL_EXTRA_KEY) === '1'; }
  function setExtraInfoEnabled(v){ localStorage.setItem(ASIL_EXTRA_KEY, v ? '1' : '0'); }
  function applyExtraInfoVisibility(){
    const show = getExtraInfoEnabled();
    const ids = ['gapSpanId', 'new_chart_info1', 'new_chart_info2']; // 갭/최고 전세가율/전고점
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = show ? '' : 'none';
    });
    document.querySelectorAll('.magnifier_emoji').forEach(el => {
      el.style.display = show ? '' : 'none';
    });
  }

  /* ===================== 2) 상단 버튼바 ===================== */
  (function installTitleBar(){
    if (window.__asil_titlebar_installed) return;

    if (!document.getElementById('asil-titlebar-style')) {
      const st = document.createElement('style');
      st.id = 'asil-titlebar-style';
      st.textContent = [
        '.asil-titlebar{display:flex;gap:8px;align-items:center;',
        'margin:0 0 10px 0;padding:6px 10px;background:#fff;border-radius:8px;',
        'box-shadow:inset 0 0 0 1px #e5e7eb;position:relative;z-index:9;flex-wrap:wrap;}',
        '.asil-titlebar .hongbu-btn{display:inline-flex;align-items:center;justify-content:center;height:24px;',
        'padding:0 8px;border-radius:6px;border:1px solid rgba(0,0,0,.1);font-size:11px;font-weight:600;line-height:1;',
        'cursor:pointer;user-select:none;box-shadow:0 1px 0 rgba(0,0,0,.05);transition:filter .12s ease,transform .04s ease;}',
        '.asil-titlebar .hongbu-btn:hover{filter:brightness(.97);} .asil-titlebar .hongbu-btn:active{transform:translateY(1px);}',
        '.hongbu-green{background:#99CC00;color:#fff;border-color:#8ab800;}',
        '.hongbu-orange{background:#EB7B43;color:#fff;border-color:#d36f3d;}',
        '.hongbu-blue{background:#0070C0;color:#fff;border-color:#0063a8;}',
        '.asil-titlebar .asil-rightgroup{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;flex:0 0 auto;}',
        '.asil-titlebar .asil-extra-toggle{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 6px;border-radius:6px;border:1px solid rgba(0,0,0,.12);background:#fff;color:#111;font-size:11px;font-weight:700;cursor:pointer;user-select:none;white-space:nowrap;flex:0 0 auto;}',
        '.asil-titlebar .asil-extra-toggle input{',
        '  -webkit-appearance: checkbox !important;',
        '  appearance: auto !important;',
        '  opacity: 1 !important;',
        '  width: 14px !important;',
        '  height: 14px !important;',
        '  margin: 0 !important;',
        '  transform: translateY(1px);',
        '}',
        'body > div.asilScroll > div.apt_info > div.hgroup{padding:8px 12px 6px !important;}',
        'body > div.asilScroll > div.apt_info > div.hgroup h2.h2{margin:0 0 6px 0 !important;line-height:1.25;}',
      ].join('');
      safeAppend(document.head, st);
    }

    function findH2() {
      return document.querySelector('div.asilScroll div.apt_info div.hgroup h2.h2')
          || document.querySelector('div.asilScroll div.hgroup h2.h2')
          || document.querySelector('h2.h2');
    }
    function reflowForHeader(headerDiv){
      if (!headerDiv) return;
      headerDiv.style.height = 'auto';
      const scrollRoot = document.querySelector('body > div.asilScroll');
      const aptInfo    = document.querySelector('body > div.asilScroll > div.apt_info');
      if (!scrollRoot || !aptInfo) return;
      const bar = headerDiv.querySelector('.asil-titlebar');
      if (bar) {
        const padLeft = parseFloat(getComputedStyle(headerDiv).paddingLeft) || 0;
        bar.style.marginLeft = `-${padLeft}px`;
        bar.style.width      = `calc(100% + ${padLeft}px)`;
      }
      scrollRoot.style.paddingTop = '41px';
      const rectH = headerDiv.getBoundingClientRect();
      let h = 45;
      if (bar && rectH.width) {
        const rectB = bar.getBoundingClientRect();
        h = Math.ceil(rectB.bottom - rectH.top);
        if (!(h > 0 && h < 200)) h = 45;
        if (h < 30) h = 30;
      }
      aptInfo.style.height = `calc(100% - ${h}px)`;
    }

    function makeBtn(text, cls, onClick){
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `hongbu-btn ${cls}`;
      el.textContent = text;
      el.addEventListener('click', onClick);
      return el;
    }

    function mount(){
      const h2 = findH2();
      const headerDiv = h2 ? h2.parentElement : null;
      if (!h2 || !headerDiv || window.__asil_titlebar_installed) return false;

      const bar = document.createElement('div');
      bar.className = 'asil-titlebar';

      const btnNaver = makeBtn('네이버부동산 링크', 'hongbu-green', () => {
        const links = document.getElementsByTagName('a');
        for (let link of links) {
          if (link.textContent.trim() === '네이버평면도') { link.click(); break; }
        }
      });
      const btnBig   = makeBtn('크게 보기', 'hongbu-orange', () => window.open(location.href, '_blank'));
      const btnMore  = makeBtn('거래현황 더보기', 'hongbu-blue', () => { try { viewAll(); } catch(_){} });

      safeAppend(bar, btnNaver);
      safeAppend(bar, btnBig);

      const rightGroup = document.createElement('div');
      rightGroup.className = 'asil-rightgroup';
      safeAppend(rightGroup, btnMore);

      const extraLabel = document.createElement('label');
      extraLabel.className = 'asil-extra-toggle';

      const extraChk = document.createElement('input');
      extraChk.type = 'checkbox';
      extraChk.checked = getExtraInfoEnabled();

      const extraTxt = document.createElement('span');
      extraTxt.textContent = '추가정보';

      extraChk.addEventListener('change', () => {
        setExtraInfoEnabled(extraChk.checked);
        try { if (extraChk.checked) showGapSpan?.(); } catch(_) {}
        applyExtraInfoVisibility();
      });

      extraLabel.appendChild(extraChk);
      extraLabel.appendChild(extraTxt);
      safeAppend(rightGroup, extraLabel);

      safeAppend(bar, rightGroup);
      safeInsert(headerDiv, bar, h2);
      window.__asil_titlebar_installed = true;

      reflowForHeader(headerDiv);
      const ro = new ResizeObserver(() => reflowForHeader(headerDiv));
      ro.observe(headerDiv);
      window.addEventListener('resize', () => reflowForHeader(headerDiv));
      setTimeout(() => reflowForHeader(headerDiv), 0);

      applyExtraInfoVisibility();
      return true;
    }

    if (!mount()) {
      const mo = new MutationObserver(() => { if (mount()) mo.disconnect(); });
      mo.observe(document.documentElement, { childList:true, subtree:true });
      let tries = 0;
      const t = setInterval(() => { if (mount() || ++tries > 20) clearInterval(t); }, 300);
    }
  })();

  /* ===================== 2-1) 로드시 h2 위치 보정 ===================== */
  function adjustAptInfoTopByH2() {
    const aptInfo = document.querySelector('body > div.asilScroll > div.apt_info');
    const h2 = document.querySelector('body > div.asilScroll > div.apt_info > div.hgroup h2.h2')
            || document.querySelector('div.asilScroll div.hgroup h2.h2')
            || document.querySelector('h2.h2');
    if (!aptInfo || !h2) return;

    const h2Top = h2.getBoundingClientRect().top;
    aptInfo.style.position = 'relative';
    aptInfo.style.top = (Math.max(0, Math.round(h2Top) - 60)) + 'px';
  }

  /* ===================== 3) 기존: 차트/돋보기/갭/전고 ===================== */
  var chartElement;
  var currentColumnIndex = 1;

  function newViewAll(type){
    if (!type) return;
    const spanElementDate = document.getElementById('chart_info_yyyymm');
    const spanElementPy   = document.getElementById('txtPy');
    const textDate = spanElementDate?.textContent.trim() || '';
    const textPy   = spanElementPy?.textContent.trim() || '';

    function toYYYYMM(t){
      const m = t.match(/(\d{2})년 (\d{1,2})월/);
      if (!m) return null;
      return `20${m[1]}${m[2].padStart(2,'0')}`;
    }
    function toPy(t){
      const m = t.match(/(\d+)평/);
      return m ? `${m[1]}py` : null;
    }

    const yyyymm = toYYYYMM(textDate);
    const v_py   = toPy(textPy);

    const u = new URL(location.href);
    const apt = u.searchParams.get('apt') || '';

    let v_deal = (type === 'M' ? '1' : (type === 'J' ? '2' : ''));
    if (!yyyymm || !v_py || !apt || !v_deal) return;

    const newUrl = `/asil/apt_price_2020.jsp?os=pc&building=apt&evt=${v_py}&year=${yyyymm}&deal=${v_deal}&apt=${apt}`;
    parent.openSecond(newUrl);
  }

  function showIcon(){
    if (!getExtraInfoEnabled()) {
      document.querySelectorAll('.magnifier_emoji').forEach(el => el.style.display = 'none');
      return;
    }
    const mTxt = document.getElementById('chart_info_m')?.textContent || '';
    const jTxt = document.getElementById('chart_info_j')?.textContent || '';
    const mEl  = document.querySelector("body > div.asilScroll > div.apt_info > div.article.apt_info_chart.mt0 > p > div:nth-child(1) > span.magnifier_emoji");
    const jEl  = document.querySelector("body > div.asilScroll > div.apt_info > div.article.apt_info_chart.mt0 > p > div:nth-child(2) > span.magnifier_emoji");
    if (mEl) mEl.style.display = (mTxt === "매매 거래내역 없음") ? 'none' : 'block';
    if (jEl) jEl.style.display = (jTxt === "전세 거래내역 없음") ? 'none' : 'block';
  }

  function makeIcon() {
    const style = document.createElement('style');
    style.textContent = `
      .chart_info { display:flex; flex-direction:column; }
      .flex-container { display:flex; align-items:center; }
      #chart_info_m, #chart_info_j { width:150px; display:inline-block; }
      .magnifier_emoji { margin-left:0px; cursor:pointer; }
    `;
    safeAppend(document.head, style);

    const parent = document.querySelector('.chart_info');
    if (!parent) return;

    // 이미 만들어졌으면 중복 생성 금지
    if (parent.dataset.asilMagnifierBuilt === '1') {
      applyExtraInfoVisibility();
      return;
    }

    const spanM = document.getElementById('chart_info_m');
    const spanJ = document.getElementById('chart_info_j');
    if (spanM) {
      spanM.style.width = '140px';
      const box = document.createElement('div');
      box.className = 'flex-container';
      box.dataset.asilBox = 'm';
      const emoji = document.createElement('span');
      emoji.innerText = '🔎';
      emoji.className = 'magnifier_emoji';
      emoji.onclick = () => newViewAll('M');
      box.appendChild(spanM); box.appendChild(emoji);
      parent.insertBefore(box, spanJ || null);
    }
    if (spanJ) {
      spanJ.style.width = '140px';
      const box = document.createElement('div');
      box.className = 'flex-container';
      box.dataset.asilBox = 'j';
      const emoji = document.createElement('span');
      emoji.innerText = '🔎';
      emoji.className = 'magnifier_emoji';
      emoji.onclick = () => newViewAll('J');
      box.appendChild(spanJ); box.appendChild(emoji);
      parent.appendChild(box);
    }

    parent.dataset.asilMagnifierBuilt = '1';
    applyExtraInfoVisibility();
  }

  /* ========== 6) 호버 시 chart_info 갱신 ========== */
  (function installHoverUpdateOnce(){
    const GLOBAL_FLAG = '__asil_hover_update_installed';
    if (window[GLOBAL_FLAG]) { log('[hover] already installed — skip'); return; }
    window[GLOBAL_FLAG] = true;

    const PATCH_FLAG = '__asilHoverPatched';
    const newFn = function(seriesId, seriesName, index, xName, yName, data, values){
      if (!data) return '';
      if (seriesId === 'G') return '';
      if (seriesId === 'M' || seriesId === 'J') {
        try { showChartInfo(data); } catch (e) {}
        return '';
      }
      return '';
    };
    try { newFn[PATCH_FLAG] = true; } catch (_) {}

    try {
      Object.defineProperty(window, 'dataTipFuncForSingle', { configurable:true, writable:true, value:newFn });
    } catch { window.dataTipFuncForSingle = newFn; }

    let guardCount = 0;
    const guard = setInterval(() => {
      const fn = window.dataTipFuncForSingle;
      const patched = (typeof fn === 'function' && fn[PATCH_FLAG] === true);
      if (!patched) {
        try { window.dataTipFuncForSingle = newFn; window.dataTipFuncForSingle[PATCH_FLAG] = true; log('[hover] re-patched'); } catch (_) {}
      }
      if (++guardCount > 40) clearInterval(guard);
    }, 500);

    log('[hover] installed (idempotent)');
  })();

  /* ===================== 전고(유의미 전고) 분석 유틸 ===================== */
  function convertToDateFormat(monthYear) {
    if (!monthYear) return null;
    const parts = String(monthYear).trim().split(" ");
    if (parts.length < 2) return null;
    const year = "20" + parts[0].slice(0, -1);
    const month = ("0" + parts[1].slice(0, -1)).slice(-2);
    return year + "/" + month + "/01";
  }
  function addCommas(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function formatDate(date) {
    if (!date) return "";
    const parts = date.split("/");
    return parts[0] + "." + parts[1];
  }
  function parsePriceFromChartInfo(text, kind /* '매매'|'전세' */){
    if (!text) return NaN;
    const re = kind === '매매' ? /매매\s+(\d+),(\d+)/ : /전세\s+(\d+),(\d+)/;
    const m = String(text).match(re);
    if (!m) return NaN;
    return parseInt(m[1] + m[2], 10);
  }

  // chartPData에서 "현재(선택 월) 또는 직전 유효 M" 찾기 (매매 거래내역 없음 대응)
  function getBestCurrentMFromChartPData(curYYYYMMText){
    if (!Array.isArray(window.chartPData)) return { m: NaN, date: "" };
    const curDateStr = convertToDateFormat(curYYYYMMText); // "YYYY/MM/01"
    if (!curDateStr) return { m: NaN, date: "" };

    const exact = chartPData.find(d => d?.date === curDateStr);
    const exactM = exact ? parseInt(exact.M, 10) : NaN;
    if (Number.isFinite(exactM)) return { m: exactM, date: exact.date };

    const curT = new Date(curDateStr).getTime();
    let best = null;
    for (let i = chartPData.length - 1; i >= 0; i--) {
      const d = chartPData[i];
      if (!d?.date) continue;
      const t = new Date(d.date).getTime();
      if (!Number.isFinite(t) || t > curT) continue;
      const m = parseInt(d.M, 10);
      if (Number.isFinite(m)) { best = { m, date: d.date }; break; }
    }
    return best || { m: NaN, date: "" };
  }

  // 유의미 전고(사이클 전고) 찾기:
  // - curDate까지의 데이터에서 running max를 추적
  // - max 대비 drawdown이 dropPct(기본 20%) 이상 발생하면 그 max를 "사이클 전고 후보"로 기록
  // - 가장 "최근"에 확정된 사이클 전고를 전고로 사용
  // - 한 번도 dropPct 하락이 없었다면(상승만) curDate까지의 최고값(=현재 최고)을 전고로 사용
  function analyzeMeaningfulHigh(data, curDate, dropPct, opts){
    // opts: { preferStartYear: 2019, preferEndYear: 2022 }
    const preferStartYear = (opts && Number.isFinite(opts.preferStartYear)) ? opts.preferStartYear : 2019;
    const preferEndYear   = (opts && Number.isFinite(opts.preferEndYear))   ? opts.preferEndYear   : 2022;

    const items = (Array.isArray(data) ? data : [])
      .map(d => {
        const m = parseInt(d?.M, 10);
        const dt = d?.date ? new Date(d.date) : null;
        return (dt && Number.isFinite(dt.getTime()) && Number.isFinite(m)) ? { date: d.date, t: dt.getTime(), m } : null;
      })
      .filter(Boolean)
      .filter(d => d.t <= curDate.getTime())
      .sort((a,b)=>a.t-b.t);

    if (!items.length) return null;

    // 1) drawdown(dropPct)으로 "확정된" 사이클 고점들을 수집
    // 1) dropPct 하락이 '이후에 실제로 발생'한 고점만 확정 전고 후보로 수집(진짜 확정 방식)
const confirmedPeaks = [];
for (let i = 0; i < items.length; i++) {
  const peak = items[i];
  const threshold = peak.m * (1 - dropPct);

  let confirmed = false;
  for (let j = i + 1; j < items.length; j++) {
    if (items[j].m <= threshold) { confirmed = true; break; }
  }
  if (confirmed) confirmedPeaks.push(peak);
}

    // 2) 확정 전고가 하나도 없다면(상승만 지속) -> 최고가(참고용) 반환
    if (!confirmedPeaks.length) {
      let maxAll = items[0];
      for (const it of items) if (it.m > maxAll.m) maxAll = it;
      return maxAll;
    }

    // 3) 확정 전고가 여러 번이라면, 2019~2022 사이의 전고를 우선 선택
    const preferStartT = new Date(`${preferStartYear}-01-01`).getTime();
    const preferEndT   = new Date(`${preferEndYear + 1}-01-01`).getTime() - 1;

    const inPrefer = confirmedPeaks.filter(p => p.t >= preferStartT && p.t <= preferEndT);

    const pickMax = (arr) => {
      let best = arr[0];
      for (const p of arr) if (p.m > best.m) best = p;
      return best;
    };

    if (inPrefer.length) return pickMax(inPrefer);

    // 4) 선호 구간에 없으면: 가장 최근에 확정된 전고(마지막 사이클 고점)
    return confirmedPeaks[confirmedPeaks.length - 1];
  }


// ===== 전고 캐시(전체기간 1회 계산) =====
function getChartPDataSignature(data){
  if (!Array.isArray(data) || !data.length) return '';
  const first = data[0];
  const last  = data[data.length - 1];
  return `${data.length}|${first?.date||''}|${last?.date||''}|${first?.M||''}|${last?.M||''}`;
}

function getMeaningfulHighForWholePeriod(dropPct=0.20){
  const data = window.chartPData;
  if (!Array.isArray(data) || !data.length) return null;

  const sig = getChartPDataSignature(data);
  const cache = window.__asilMeaningfulHighCache;

  if (cache && cache.sig === sig && cache.dropPct === dropPct) {
    return cache.high; // { m, date, ... }
  }

  // 전체기간 기준: 마지막 데이터의 날짜를 curDate로 넣어서 "전체 구간" 대상으로 분석
  const lastDateStr = data[data.length - 1]?.date;
  const lastDateObj = lastDateStr ? new Date(lastDateStr) : null;
  if (!lastDateObj || isNaN(lastDateObj.getTime())) return null;

  const high = analyzeMeaningfulHigh(data, lastDateObj, dropPct, { preferStartYear: 2019, preferEndYear: 2022 });

  window.__asilMeaningfulHighCache = { sig, dropPct, high };
  return high;
}


  // 표시 요소를 매매/전세 다음에 "갭→최고전세가율→전고점" 순서로 강제 삽입
  function ensureExtraInfoOrder(parentEl, gapEl, rentEl, highEl){
    if (!parentEl) return;

    // 기존 노드가 parent에 붙어있으면 제거(재삽입으로 순서 보장)
    [gapEl, rentEl, highEl].forEach(el => {
      if (!el) return;
      if (el.parentNode === parentEl) parentEl.removeChild(el);
    });

    // 전세 라인(박스J)이 마지막이 되도록 기준 찾기
    const boxJ = parentEl.querySelector('.flex-container[data-asil-box="j"]');
    const anchor = boxJ || parentEl.lastElementChild;

    // anchor 다음에 순서대로 삽입
    const insertAfter = (ref, node) => {
      if (!node) return ref;
      if (!ref || !ref.parentNode) { parentEl.appendChild(node); return node; }
      if (ref.nextSibling) ref.parentNode.insertBefore(node, ref.nextSibling);
      else ref.parentNode.appendChild(node);
      return node;
    };

    let ref = anchor;
    ref = insertAfter(ref, gapEl);
    ref = insertAfter(ref, rentEl);
    ref = insertAfter(ref, highEl);
  }

  function showGapSpan() {
    // ✅ chart_info 및 값 준비가 안되면 스킵
    const parentElement = document.querySelector('.chart_info');
    if (!parentElement) return;

    // 돋보기 표시 상태 갱신
    showIcon();

    const chartInfoMText = document.getElementById("chart_info_m")?.innerText || "";
    const chartInfoJText = document.getElementById("chart_info_j")?.innerText || "";
    const curYYYYMMText  = document.getElementById("chart_info_yyyymm")?.innerText || "";

    let curM = parsePriceFromChartInfo(chartInfoMText, '매매');
    let curJ = parsePriceFromChartInfo(chartInfoJText, '전세');

    // ✅ 매매 거래내역이 없으면 chartPData로 보정
    let curM2 = curM;
    let curM2Date = "";
    if (!Number.isFinite(curM2)) {
      const r = getBestCurrentMFromChartPData(curYYYYMMText);
      curM2 = r.m;
      curM2Date = r.date;
    }

    // 갭/전세가율은 기존 방식 유지(매매 없으면 -/0%)
    const gap = (Number.isFinite(curM2) && Number.isFinite(curJ)) ? (curM2 - curJ) : null;
    const jspercent = (Number.isFinite(curM2) && Number.isFinite(curJ) && curM2 > 0) ? Math.floor(curJ / curM2 * 100) : 0;

    // 갭
    let gapSpan = document.getElementById("gapSpanId");
    if (!gapSpan) {
      gapSpan = document.createElement('span');
      gapSpan.style.color = 'green';
      gapSpan.setAttribute("id", "gapSpanId");
    }
    gapSpan.textContent = ' 갭 '.padEnd(6, '\u00A0')
      + (gap === null ? '-' : addCommas(gap))
      + " / " + jspercent + "%";

    // 최고 전세가율 + 날짜 계산(기존 방식)
    let highestRentRatio = 0;
    let highestRentDate = "";
    let bestHigh = null;

    if (Array.isArray(window.chartPData)) {
      for (let i = 0; i < chartPData.length; i++) {
        const rent = parseInt(chartPData[i]?.J, 10);
        const monthly = parseInt(chartPData[i]?.M, 10);

        if (Number.isFinite(rent) && Number.isFinite(monthly) && monthly > 0) {
          const rentRatio = (rent / monthly) * 100;
          if (rentRatio > highestRentRatio) {
            highestRentRatio = rentRatio;
            highestRentDate = chartPData[i].date;
          }
        }
      }
    }

    let newSpan1 = document.getElementById("new_chart_info1");
    if (!newSpan1) {
      newSpan1 = document.createElement("span");
      newSpan1.setAttribute("id", "new_chart_info1");
      newSpan1.style.color = 'black';
    }
    newSpan1.textContent = "최고 전세가율 : "
      + (highestRentRatio ? Math.floor(highestRentRatio) : 0)
      + "% (" + (highestRentDate ? formatDate(highestRentDate) : "-") + ")";

    // ✅ 유의미 전고점 계산 (dropPct=20%)
    let newSpan2 = document.getElementById("new_chart_info2");
    if (!newSpan2) {
      newSpan2 = document.createElement("span");
      newSpan2.setAttribute("id", "new_chart_info2");
      newSpan2.style.color = 'black';
    } else {
      newSpan2.innerHTML = ""; // 재렌더
    }

    const curDateStr = convertToDateFormat(curYYYYMMText);
    let curDateObj = curDateStr ? new Date(curDateStr) : null;
    if (curM2Date) curDateObj = new Date(curM2Date); // 보정된 현재값 날짜가 있으면 그걸 기준으로

        let highValue = NaN, highDate = "";

        // ✅ 전고점은 "전체기간" 기준으로 1번만 계산(hover 월이 바뀌어도 고정)
        const high = getMeaningfulHighForWholePeriod(0.15);
        if (high) { highValue = high.m; highDate = high.date; }

// 전고점 문구 + 전고대비 상승/하락률(2개만)
    if (Number.isFinite(highValue) && highValue > 0) {
      const head = document.createTextNode("전고점 : " + addCommas(highValue) + "(" + (highDate ? formatDate(highDate) : "-") + ") ");
      newSpan2.appendChild(head);

      const redTextSpan = document.createElement("span");
      redTextSpan.setAttribute("id", "new_chart_info3");
      redTextSpan.style.color = 'red';
      redTextSpan.style.display = 'inline';

      // 현재 월 row 찾기 (이미 위에서 구했다면 그 변수 사용)
const curRow = window.chartPData.find(d => {
  return d.date === curDateStr; // 현재 선택 월 문자열
});

// "현재 월에 실제 매매값이 있는지" 체크
const hasRealCurrentM =
  curRow &&
  curRow.M !== null &&
  curRow.M !== "null" &&
  Number.isFinite(parseInt(curRow.M, 10));

if (hasRealCurrentM && Number.isFinite(curM2)) {

  if (curM2 >= highValue) {
    const up = Math.round(((curM2 / highValue) - 1) * 100);
    redTextSpan.textContent = "전고대비 상승률 : " + up + "%";
  } else {
    const down = Math.round((1 - (curM2 / highValue)) * 100);
    redTextSpan.textContent = "전고대비 하락률 : " + down + "%";
  }

} else {
  // 현재 월 매매 데이터 없으면 퍼센트 표시 안함
  redTextSpan.textContent = "";
}
      newSpan2.appendChild(redTextSpan);
    } else {
      newSpan2.textContent = "전고점 : -";
    }

    // ✅ 순서 고정 삽입
    ensureExtraInfoOrder(parentElement, gapSpan, newSpan1, newSpan2);

    // ✅ 체크 상태에 따라 표시/숨김 반영
    applyExtraInfoVisibility();
  }

  function initWhenReady() {
    setTimeout(adjustAptInfoTopByH2, 300);
    setTimeout(addTableIfChartExistsInNestedIframe, 1000);
    setTimeout(showGapSpan, 1000);
    window.addEventListener('resize', () => setTimeout(adjustAptInfoTopByH2, 150));
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initWhenReady();
  } else {
    document.addEventListener('DOMContentLoaded', initWhenReady);
  }

  function addTableIfChartExistsInNestedIframe() {
    chartElement = document.getElementsByClassName("rMateH5__Combination2DChart")[0];
    if (!chartElement) { return; }

    makeIcon();

    function addNumberToTableCell(row, col, number) {
      const cell = document.getElementById("tbl_price").rows[row].cells[col];
      cell.innerText = Number(number).toLocaleString();
      cell.style.textAlign = "right";
    }
    function addDataToTableCell(row, col, data, isPercentage = false) {
      const cell = document.getElementById("tbl_price").rows[row].cells[col];
      if (isPercentage) {
        cell.innerText = `${data}%`;
      } else {
        if (row === 0) {
          data = String(data).replace(/(\d+)년 (\d+)월/g, (_,a,b)=>`${String(a).padStart(2,'0')}.${String(b).padStart(2,'0')}`);
          cell.innerText = data;
        } else {
          cell.innerText = data;
        }
      }
      cell.style.textAlign = (row === 0 && col === 0) ? 'center' : 'right';
    }

    function mouseupEventAdd() {
      setTimeout(function() {
        chartElement = document.getElementsByClassName("rMateH5__Combination2DChart")[0];
        if (!chartElement) return;
        if (chartElement.dataset.asilMouseupBound === '1') return;

        chartElement.addEventListener('mouseup', function(event) {
          if (event.button === 0 && !event.shiftKey && !event.ctrlKey) {
            let table = document.getElementById("tbl_price");
            if (!table) {
              createTable("initial");
            } else {
              table.style.userSelect = 'text';
              table.style.cursor = 'default';
            }

            const ym  = document.getElementById("chart_info_yyyymm")?.innerText || '';
            const mTxt= document.getElementById("chart_info_m")?.innerText || '';
            const jTxt= document.getElementById("chart_info_j")?.innerText || '';
            const m = mTxt.match(/매매\s+(\d+),(\d+)/);
            const j = jTxt.match(/전세\s+(\d+),(\d+)/);
            const vM = m ? +(m[1] + m[2]) : NaN;
            const vJ = j ? +(j[1] + j[2]) : NaN;

            const table2 = document.getElementById("tbl_price");
            if (table2 && currentColumnIndex < table2.rows[0].cells.length) {
              addDataToTableCell(0, currentColumnIndex, ym);
              if (Number.isFinite(vM)) addNumberToTableCell(1, currentColumnIndex, vM);
              if (Number.isFinite(vJ)) addNumberToTableCell(2, currentColumnIndex, vJ);
              if (Number.isFinite(vM) && Number.isFinite(vJ)) {
                addNumberToTableCell(3, currentColumnIndex, vM - vJ);
                addDataToTableCell(4, currentColumnIndex, Math.floor(vJ / vM * 100), true);
              } else {
                table2.rows[4].cells[currentColumnIndex].innerText = '0%';
                table2.rows[4].cells[currentColumnIndex].style.textAlign = "right";
              }

              const h2Title = (document.querySelector("div.asilScroll div.apt_info div.hgroup h2.h2")
                              || document.querySelector("h2.h2"));
              addDataToTableCell(0, 0, h2Title ? h2Title.innerText : '');

              const ths = document.querySelectorAll("#tbl_price th");
              ths.forEach(cell => {
                let fontSize = 14;
                const cellWidth = parseInt(cell.style.width||'76',10);
                while (cell.scrollWidth > cellWidth && fontSize > 10) {
                  fontSize--; cell.style.fontSize = fontSize + "px";
                }
              });
              currentColumnIndex++;
            }
          }
        });

        chartElement.dataset.asilMouseupBound = '1';
      }, 1000);
    }

    window.asilMouseupEventAdd = mouseupEventAdd;
    mouseupEventAdd();

    /* ===== chartPData 변경 감지 훅 ===== */
    (function hookChartPDataChanges(){
      if (window.__asil_chartp_hook_installed) return;
      window.__asil_chartp_hook_installed = true;

      const debounce = (fn, ms=150) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };
      const onChanged = debounce(() => {
        try { window.__asilMeaningfulHighCache = null; } catch(_) {}
        try { window.asilMouseupEventAdd?.(); } catch(_) {}
        try { showGapSpan?.(); } catch(_) {}
      }, 150);

      const proxifyArray = (arr) => {
        if (!Array.isArray(arr)) return arr;
        if (arr.__asilProxied) return arr;
        const p = new Proxy(arr, {
          set(target, prop, value){
            const ret = Reflect.set(target, prop, value);
            if (prop !== 'length' || value !== target.length) onChanged();
            return ret;
          }
        });
        Object.defineProperty(p, '__asilProxied', { value:true, enumerable:false });
        return p;
      };

      let __asil_last_bind_token = '';
      function __asil_stamp_bind(obj) {
        const token = `bind:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
        try { Object.defineProperty(obj, '__asilBindToken', { value: token, writable:true, configurable:true, enumerable:false }); }
        catch(_) { try { obj.__asilBindToken = token; } catch(_) {} }
        return token;
      }

      let _val = ('chartPData' in window) ? proxifyArray(window.chartPData) : undefined;

      const OWNER_MARK = Symbol('asilChartHook');
      function installAccessor() {
        const desc = Object.getOwnPropertyDescriptor(window, 'chartPData');
        if (desc && desc.get && desc.get[OWNER_MARK]) return true;
        try {
          Object.defineProperty(window, 'chartPData', {
            configurable: false,
            enumerable: true,
            get: (function(){ function g(){ return _val; } g[OWNER_MARK]=true; return g; })(),
            set(v){
              try { __asil_stamp_bind(v); } catch(_) {}
              _val = proxifyArray(v);
              const curToken = (v && v.__asilBindToken) ? v.__asilBindToken : '';
              if (curToken !== __asil_last_bind_token) {
                __asil_last_bind_token = curToken;
                onChanged();
              }
            }
          });
          return true;
        } catch (e) {
          return false;
        }
      }

      const ok = installAccessor();

      let guardTicks = 0;
      const guard = setInterval(() => {
        const desc = Object.getOwnPropertyDescriptor(window, 'chartPData');
        const ours = !!(desc && desc.get && desc.get[OWNER_MARK]);
        if (!ours) installAccessor();
        guardTicks++;
        if (guardTicks === 50) { clearInterval(guard); slowGuard(); }
      }, 200);

      function slowGuard(){
        setInterval(() => {
          const desc = Object.getOwnPropertyDescriptor(window, 'chartPData');
          const ours = !!(desc && desc.get && desc.get[OWNER_MARK]);
          if (!ours) installAccessor();
        }, 2000);
      }

      if (!ok) {
        let lastSig = '';
        setInterval(() => {
          try {
            const d = window.chartPData;
            const sig = Array.isArray(d)
              ? `${d.length}:${d[0]?.date||''}:${d[d.length-1]?.date||''}:${d[0]?.M||''}:${d[0]?.J||''}`
              : String(d);
            if (sig !== lastSig) { lastSig = sig; onChanged(); }
          } catch(_) {}
        }, 300);
      }

      onChanged();
    })();

    const obs2 = new MutationObserver(() => showGapSpan());
    const t2 = document.querySelector('#chart_info_m');
    if (t2) obs2.observe(t2, { childList:true, characterData:true, subtree:true });

    function createTable(option) {
      const priceTableDiv = document.createElement('div');
      Object.assign(priceTableDiv.style, { position:'absolute', left:'0', top:'617px', backgroundColor:'#fff', zIndex:'9999' });
      priceTableDiv.id = "priceTableDiv";
      if (option === "close") {
        document.getElementById("priceTableDiv")?.remove();
        currentColumnIndex = 1;
        return;
      }

      const tableHTML = '<table id="tbl_price" border="1" style="width:100%; height:110px">'+
        '<tr><th style="width:76px; background-color:#FAFAFA;">단지명</th>'+
        '<th style="width:76px; background-color:#FAFAFA;"></th>'+
        '<th style="width:76px; background-color:#FAFAFA;"></th>'+
        '<th style="width:76px; background-color:#FAFAFA;"></th>'+
        '<th style="width:76px; background-color:#FAFAFA;"></th></tr>'+
        '<tr><th style="width:76px; background-color:#FAFAFA;">매매</th>'+
        '<th style="width:76px"></th><th style="width:76px"></th>'+
        '<th style="width:76px"></th><th style="width:76px"></th></tr>'+
        '<tr><th style="width:76px; background-color:#FAFAFA;">전세</th>'+
        '<th style="width:76px"></th><th style="width:76px"></th>'+
        '<th style="width:76px"></th><th style="width:76px"></th></tr>'+
        '<tr><th style="width:76px; background-color:#FAFAFA;">갭</th>'+
        '<th style="width:76px"></th><th style="width:76px"></th>'+
        '<th style="width:76px"></th><th style="width:76px"></th></tr>'+
        '<tr><th style="width:76px; background-color:#FAFAFA;">전세가율</th>'+
        '<th style="width:76px"></th><th style="width:76px"></th>'+
        '<th style="width:76px"></th><th style="width:76px"></th></tr>'+
        '</table>';

      priceTableDiv.innerHTML = tableHTML;

      function makeBtn(txt, left, w, bg, color, fn){
        const b = document.createElement('button');
        b.innerText = txt;
        Object.assign(b.style, { position:'absolute', left: `${left}px`, width:`${w}px`,
          backgroundColor:bg, color, height:'24px' });
        b.addEventListener('click', fn);
        priceTableDiv.appendChild(b);
        return b;
      }

      const resetBtn = document.createElement('button');
      resetBtn.innerText = '리셋';
      Object.assign(resetBtn.style, { position:'relative', left:'0', width:'50px',
        backgroundColor:'red', color:'#fff', marginBottom:'8px' });
      resetBtn.addEventListener('click', () => {
        document.body.removeChild(priceTableDiv);
        currentColumnIndex = 1;
        createTable("reset");
      });
      priceTableDiv.appendChild(resetBtn);

      makeBtn('취소', 60, 50, '#E97132', '#fff', () => {
        const table = document.getElementById("tbl_price");
        if (table && currentColumnIndex > 1) {
          for (let i=0;i<5;i++) table.rows[i].cells[currentColumnIndex-1].innerText = '';
          currentColumnIndex = Math.max(1, currentColumnIndex - 1);
        }
      });
      makeBtn('닫기', 120, 50, '#000', '#fff', () => createTable("close"));
      makeBtn('전체 복사', 180, 70, '#4EA72E', '#fff', () => { makecomma(); copyResultToClipboard(5); });
      makeBtn('전세까지 복사', 260, 100, '#0F9ED5', '#fff', () => { makecomma(); copyResultToClipboard(3); });

      priceTableDiv.appendChild(document.createElement("br"));

      const moreBtn = document.createElement('button');
      moreBtn.innerText = '거래현황 더보기';
      Object.assign(moreBtn.style, { position:'relative', width:'360px', height:'30px',
        backgroundColor:'#1C32F7', color:'#fff' });
      moreBtn.addEventListener('click', () => { try { viewAll(); } catch(_){} });
      priceTableDiv.appendChild(moreBtn);

      function makecomma() {
        const table = document.getElementById('tbl_price');
        for (let j=4;j>0;j--) {
          for (let k=1;k<3;k++) {
            table.rows[k].cells[j].textContent =
              table.rows[k].cells[j].textContent.toString()
                .replace(/[^0-9.%]/g,'')
                .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
          }
        }
      }
      function copyResultToClipboard(rowNumber) {
        const result = getResult(rowNumber);
        const ta = document.createElement('textarea');
        ta.value = result;
        document.body.appendChild(ta);
        ta.select(); ta.setSelectionRange(0, result.length);
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      function getResult(rowNumber) {
        const table = document.getElementById('tbl_price');
        let out = '';
        for (let i=0;i<rowNumber;i++) {
          const row = table.rows[i];
          const first = row.cells[0].textContent.trim();
          out += first;
          for (let j=1;j<row.cells.length;j++) {
            const cell = row.cells[j];
            const cleaned = cell.textContent.trim().replace(/[^0-9,.%]/g,'');
            out += `\t${cleaned}`;
          }
          out += '\n';
        }
        return out;
      }

      document.body.appendChild(priceTableDiv);

      const tbl = document.getElementById("tbl_price");
      if (tbl) {
        tbl.style.tableLayout = "fixed";
        tbl.style.width  = "380px";
        tbl.style.height = "110px";
        document.querySelectorAll("#tbl_price th").forEach(cell=>{
          cell.style.width = "76px";
          cell.style.height = "22px";
          cell.style.whiteSpace = "nowrap";
          cell.style.overflow   = "hidden";
          cell.style.textOverflow = "ellipsis";
        });
      }

      if (option === "initial" || option === "reset") {
        document.getElementById('tbl_price').addEventListener('input', function() {
          const table = document.getElementById('tbl_price');
          for (let j=1;j<5;j++) {
            const sale = table.rows[1].cells[j].textContent.trim().replace(/[^0-9.%]/g,'');
            const rent = table.rows[2].cells[j].textContent.trim().replace(/[^0-9.%]/g,'');
            const s = +sale, r = +rent;
            if (sale !== "" && Number.isFinite(s) && Number.isFinite(r)) {
              table.rows[3].cells[j].textContent = (s-r).toLocaleString();
              table.rows[4].cells[j].textContent = `${Math.floor(r/s*100)}%`;
            }
          }
          outer: for (let j=4;j>0;j--) {
            for (let k=0;k<3;k++) {
              if (table.rows[k].cells[j].textContent) { currentColumnIndex = j+1; break outer; }
            }
          }
        });
      }

      if (chartElement && chartElement.dataset.asilRevealBound !== '1') {
        chartElement.addEventListener('mouseup', () => {
          const div = document.getElementById("priceTableDiv");
          if (div) div.style.display = "block";
        });
        chartElement.dataset.asilRevealBound = '1';
      }

      tbl?.setAttribute('contenteditable', 'true');
    }
  }

})();

/* ===== chartPData 강제 프록시 래핑 (configurable:false 대응) ===== */
(function forceWrapChartPData(){
  const debounce = (fn, ms=150) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };
  const onChanged = debounce(() => {
    try { window.asilMouseupEventAdd?.(); } catch(_) {}
    try { showGapSpan?.(); } catch(_) {}
  }, 150);

  const proxifyArray = (arr) => {
    if (!Array.isArray(arr)) return arr;
    if (arr.__asilProxied) return arr;
    const p = new Proxy(arr, {
      set(target, prop, value){
        const ret = Reflect.set(target, prop, value);
        if (prop !== 'length' || value !== target.length) onChanged();
        return ret;
      }
    });
    Object.defineProperty(p, '__asilProxied', { value:true, enumerable:false });
    return p;
  };

  const desc = Object.getOwnPropertyDescriptor(window, 'chartPData');
  if (!desc) return;
  if (desc.get || desc.set) return;

  if (desc.writable) {
    const stamp = () => `bind:${Date.now()}:${Math.random().toString(36).slice(2,8)}`;
    const wrapOnce = () => {
      try {
        const cur = window.chartPData;
        if (Array.isArray(cur) && !cur.__asilProxied) {
          const proxied = proxifyArray(cur);
          try { Object.defineProperty(proxied, '__asilBindToken', { value: stamp(), enumerable:false, configurable:true, writable:true }); }
          catch(_) { proxied.__asilBindToken = stamp(); }
          window.chartPData = proxied;
          onChanged();
        }
      } catch(_) {}
    };

    wrapOnce();
    setInterval(() => {
      try {
        const cur = window.chartPData;
        if (Array.isArray(cur) && !cur.__asilProxied) wrapOnce();
      } catch(_) {}
    }, 250);
  }
})();
})();
