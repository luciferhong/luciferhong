/* hongbuRep.js — 대표 평형 말풍선 (공개용, git 미추적 시험판)
 * 2026-11-15 사용자 요청: 네이버식 말풍선처럼 단지마다 평형 하나만 표시 — 매매 호가(매)와 최근 실거래(실).
 *   전용 55~64 구간 / 79~85 구간 중 어느 구간의 '세대수 최다 평형'을 보일지 옵션으로 고른다. 색은 남색 한 가지.
 * 공개 기능: 시세보기 애드온과 무관하게 동작한다. 시세는 공개 경로 /pub/rep_price 에서 보이는 단지 몫만 모아 받는다.
 * 구성: hongbuRep.html(= hongbutest 사본) 맨 끝에서 이 파일을 불러온다. hongbutest.html·server/hongbuSise.js 는 손대지 않는다.
 * 동작: 마커 DOM(.apartment-marker-container)에 남색 클래스(hbrep-on)와 말풍선(.hbrep-bub)을 덧붙이고,
 *   CSS 로 연식·세대수 줄과 시세보기 가격표를 가린다. 대표 평형이 없는 단지(해당 구간 타입 없음)는 원래 마커 그대로 둔다.
 */
(function () {
  'use strict';
  if (window.__hbRepInit) return;
  window.__hbRepInit = true;

  const LS_KEY = 'hbRepState';
  const BANDS = {
    s: { lo: 55, hi: 64, label: '전용 55~64㎡' },
    l: { lo: 79, hi: 85, label: '전용 79~85㎡' },
  };
  const state = { on: false, band: 'l' };
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      state.on = !!saved.on;
      if (BANDS[saved.band]) state.band = saved.band;
    }
  } catch (e) { /* 저장소를 못 읽어도 기본값으로 동작 */ }
  function saveState() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* 무시 */ }
  }

  const BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:7123' : 'https://sise-cloud.luciferhong.com';

  // ── 스타일 ───────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('hbRepStyle')) return;
    const st = document.createElement('style');
    st.id = 'hbRepStyle';
    st.textContent = `
      .apartment-marker-container.hbrep-on { background: #1d2b4a !important; color: #fff !important; min-width: 96px !important; box-sizing: border-box; }
      .apartment-marker-container.hbrep-on > .apartment-details-marker,
      .apartment-marker-container.hbrep-on > .apt-sise-price-rows { display: none !important; }
      .apartment-marker-container.hbrep-on > .apartment-name-marker { border-radius: 6px 6px 0 0 !important; }
      .hbrep-bub { padding: 3px 5px 4px; line-height: 1.2; text-align: center; white-space: nowrap; }
      .hbrep-a { font-size: 11px; font-weight: 600; opacity: .9; }
      .hbrep-p { font-size: 12px; font-weight: 600; }
      .hbrep-p b { font-size: 15px; font-weight: 800; }
      .hbrep-r { font-size: 11px; font-weight: 700; color: #7fe3a4; }
      #hbRepWrap { display: inline-flex; align-items: center; gap: 5px; margin-left: 6px; }
      #hbRepWrap label { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 700; color: #1d2b4a; cursor: pointer; white-space: nowrap; }
      #hbRepWrap select { height: 26px; font-size: 12px; border: 1px solid #9aa6c4; border-radius: 6px; background: #fff; color: #1d2b4a; cursor: pointer; }
    `;
    document.head.appendChild(st);
  }

  // ── 대표 평형 고르기(타입정보만 쓴다 — 공개 데이터) ─────────────────
  // 구간 안 전용면적(정수 내림)별 '평형 세대수'를 합쳐 최다 면적을 고른다.
  // 같은 면적에 구조 다른 타입이 둘 이상이면 그중 세대수 큰 타입의 구조·방·욕실과 맞는 호가 행을 쓴다.
  function pickType(aptId, bandKey) {
    const band = BANDS[bandKey];
    const detail = (typeof apartmentDetailData !== 'undefined' && apartmentDetailData) ? apartmentDetailData[aptId] : null;
    const types = (detail && detail.타입정보) || [];
    const groups = new Map();
    types.forEach((t) => {
      const fa = Math.floor(Number(t['전용면적']) || 0);
      if (fa < band.lo || fa > band.hi) return;
      const hh = Number(t['평형 세대수']) || 0;
      const g = groups.get(fa) || { units: 0, top: null, topHh: -1 };
      g.units += hh;
      if (hh > g.topHh) { g.top = t; g.topHh = hh; }
      groups.set(fa, g);
    });
    if (!groups.size) return null;
    let bestFa = null, best = null;
    groups.forEach((g, fa) => { if (!best || g.units > best.units) { best = g; bestFa = fa; } });
    return { fa: bestFa, top: best.top || {} };
  }

  // ── 시세 받기: 보이는 단지 몫을 모아 한 번에(최대 100개), 15분 캐시 ──
  const cache = new Map();      // id → { t, d } (d 는 서버 응답 또는 null=없음)
  const inflight = new Set();
  const want = new Set();
  let cacheVer = 0, timer = 0, blockedUntil = 0;
  const TTL = 15 * 60 * 1000;

  function need(id) {
    const c = cache.get(id);
    if (c && Date.now() - c.t < (c.d ? TTL : 60 * 1000)) return;
    if (inflight.has(id)) return;
    want.add(id);
    if (!timer) timer = setTimeout(flush, 200);
  }
  function flush() {
    timer = 0;
    if (Date.now() < blockedUntil) { if (want.size) timer = setTimeout(flush, 5000); return; }
    const ids = Array.from(want).slice(0, 100);
    ids.forEach((i) => { want.delete(i); inflight.add(i); });
    if (!ids.length) return;
    fetch(BASE + '/pub/rep_price?ids=' + ids.join(','))
      .then((r) => {
        if (r.status === 429) { blockedUntil = Date.now() + 60 * 1000; throw new Error('rate'); }
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      })
      .then((j) => {
        const data = (j && j.data) || {};
        ids.forEach((i) => cache.set(i, { t: Date.now(), d: data[i] || null }));
      })
      .catch(() => { ids.forEach((i) => cache.set(i, { t: Date.now(), d: null })); })
      .then(() => {
        ids.forEach((i) => inflight.delete(i));
        cacheVer++;
        if (want.size && !timer) timer = setTimeout(flush, 200);
      });
  }

  // 만원 → 억(소수 첫째 자리 버림, 시세보기와 같은 규칙). 정수면 소수점 없이.
  function fmtEok(v) {
    const e = Math.floor(v / 1000) / 10;
    return (e % 1 === 0 ? e.toFixed(0) : e.toFixed(1)) + '억';
  }

  // 단지 하나의 표시 값 — 시세가 아직 안 왔으면 pending.
  function repFor(aptId) {
    const pt = pickType(aptId, state.band);
    if (!pt) return null;
    need(aptId);
    const c = cache.get(aptId);
    const out = { area: pt.fa, sale: 0, real: 0, ready: !!c };
    const d = c && c.d;
    if (d) {
      const rows = (d.a && d.a[String(pt.fa)]) || [];
      if (rows.length) {
        const t = pt.top;
        const row = rows.find((r) => String(r[0] || '').trim() === String(t['구조'] || '').trim()
          && (Number(r[1]) || 0) === (Number(t['방 갯수']) || 0)
          && (Number(r[2]) || 0) === (Number(t['화장실 갯수']) || 0)) || rows[0];
        out.sale = Number(row[3]) || 0;
      }
      const rr = d.r && d.r[String(pt.fa)];
      if (rr) out.real = Number(rr[0]) || 0;
    }
    return out;
  }

  // ── 마커에 입히기 ────────────────────────────────────────────────────
  function stamp() { return `${state.on}|${state.band}|${cacheVer}`; }

  function paint(marker) {
    const el = marker && marker.getIcon && marker.getIcon() && marker.getIcon().content;
    if (!el || !el.classList || !el.classList.contains('apartment-marker-container')) return;
    el.querySelectorAll(':scope > .hbrep-bub').forEach((n) => n.remove());
    el.classList.remove('hbrep-on');
    el.__hbRepStamp = stamp();
    if (!state.on) return;
    const rep = repFor(String(marker.apartmentId));
    if (!rep) return; // 해당 구간 타입이 없는 단지는 원래 마커 그대로
    const b = document.createElement('div');
    b.className = 'hbrep-bub';
    b.innerHTML = `<div class="hbrep-a">${rep.area}㎡</div><div class="hbrep-p">매 <b>${rep.sale ? fmtEok(rep.sale) : (rep.ready ? '-' : '…')}</b></div>`
      + (rep.real ? `<div class="hbrep-r">실 ${fmtEok(rep.real)}</div>` : '');
    el.appendChild(b);
    el.classList.add('hbrep-on');
  }

  function refreshAll(force) {
    if (typeof apartmentMarkers === 'undefined' || !apartmentMarkers) return;
    const cur = stamp();
    Object.keys(apartmentMarkers).forEach((id) => {
      const m = apartmentMarkers[id];
      const el = m && m.getIcon && m.getIcon() && m.getIcon().content;
      if (!el) return;
      if (force || el.__hbRepStamp !== cur) paint(m);
    });
  }

  // ── 툴바: 레이어·도구 단추 묶음 바로 뒤(시세 애드온 앵커 앞)에 독립 묶음으로 끼운다 ──
  function injectToolbar() {
    if (document.getElementById('hbRepWrap')) return true;
    const anchor = document.getElementById('siseToolbarAnchor');
    if (!anchor || !anchor.parentNode) return false;
    const wrap = document.createElement('span');
    wrap.id = 'hbRepWrap';
    wrap.innerHTML = `<label title="단지마다 평형 하나(매매 호가·최근 실거래)만 남색 말풍선으로 표시"><input type="checkbox" id="hbRepOn" />대표평형</label>
      <select id="hbRepBand" title="이 전용면적 구간에서 세대수가 가장 많은 평형을 표시">
        <option value="s">${BANDS.s.label}</option>
        <option value="l">${BANDS.l.label}</option>
      </select>`;
    anchor.parentNode.insertBefore(wrap, anchor);
    const on = document.getElementById('hbRepOn');
    const sel = document.getElementById('hbRepBand');
    on.checked = state.on;
    sel.value = state.band;
    on.addEventListener('change', () => { state.on = on.checked; saveState(); refreshAll(true); });
    sel.addEventListener('change', () => { state.band = sel.value; saveState(); refreshAll(true); });
    return true;
  }

  // ── 시작: 마커 함수와 툴바 앵커가 준비되면 끼운다 ──────────────────
  function start() {
    injectStyles();
    injectToolbar();
    const orig = window.createDefaultMarker;
    if (typeof orig === 'function') {
      window.createDefaultMarker = function () {
        const m = orig.apply(this, arguments);
        try { paint(m); } catch (e) { console.warn('[대표평형] 마커 처리 실패', e); }
        return m;
      };
    }
    // 시세가 늦게 도착하거나 다른 스크립트가 마커를 다시 칠한 뒤에도 따라가도록 가볍게 훑는다(스탬프가 같으면 건너뜀)
    setInterval(() => { try { refreshAll(false); } catch (e) { /* 무시 */ } }, 600);
  }

  let tries = 0;
  const wait = setInterval(() => {
    tries++;
    if (typeof window.createDefaultMarker === 'function' && document.getElementById('siseToolbarAnchor')) {
      clearInterval(wait);
      try { start(); } catch (e) { console.error('[대표평형] 시작 실패', e); }
    } else if (tries > 150) {
      clearInterval(wait);
    }
  }, 200);
})();
