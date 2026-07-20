// [확장 이식] 원본: [루시퍼홍] 네부 부동산 새창으로 열기.user.js v1.1
// greasyfork 업데이트 팝업 제거 — 웹스토어 자동 업데이트로 대체. 본문은 원본 그대로.
(async () => {
  const SCRIPT_ID = 'naver-new-window';
  const { enabled = {} } = await chrome.storage.sync.get('enabled');
  if (enabled[SCRIPT_ID] === false) return; // 미설정 = 켜짐
  console.log('네부 부동산 새창으로 열기 v1.1 (extension)');


(function () {
  'use strict';

  // ✅ 클릭 대상 확장
  const TARGET_SELECTOR = 'a.agent_name, a.article_link';

  function getReactFiberKey(el) {
    if (!el) return null;
    return Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')) || null;
  }
  function getReactPropsKey(el) {
    if (!el) return null;
    return Object.keys(el).find(k => k.startsWith('__reactProps$')) || null;
  }

  function deepFindRealtorId(obj, maxDepth = 7) {
    const seen = new Set();
    const q = [{ v: obj, d: 0 }];
    while (q.length) {
      const { v, d } = q.shift();
      if (!v || d > maxDepth) continue;
      if (typeof v !== 'object') continue;
      if (seen.has(v)) continue;
      seen.add(v);

      if (typeof v.realtorId === 'string' && v.realtorId.trim()) return v.realtorId.trim();

      for (const k of Object.keys(v)) {
        const val = v[k];
        if (val && typeof val === 'object') q.push({ v: val, d: d + 1 });
      }
    }
    return null;
  }

  function extractRealtorIdFromElement(el) {
    // 1) props에서
    const propsKey = getReactPropsKey(el);
    if (propsKey && el[propsKey]) {
      const id = deepFindRealtorId(el[propsKey]);
      if (id) return id;
    }

    // 2) fiber 체인에서
    let f = null;
    let cur = el;
    for (let i = 0; i < 10 && cur; i++) {
      const fk = getReactFiberKey(cur);
      if (fk) { f = cur[fk]; break; }
      cur = cur.parentElement;
    }

    for (let step = 0; step < 30 && f; step++) {
      const id1 = deepFindRealtorId(f.memoizedProps);
      if (id1) return id1;

      const id2 = deepFindRealtorId(f.pendingProps);
      if (id2) return id2;

      f = f.return;
    }
    return null;
  }

  function buildNewTabUrl(realtorId) {
    const u = new URL(location.href);
    u.searchParams.set('realtorId', realtorId);
    return u.toString();
  }

  function openInNewTabSafe(url) {
    const w = window.open('about:blank', '_blank'); // 팝업차단 우회
    if (!w) return false;
    try { w.location.href = url; } catch {}
    return true;
  }

  // 중복 방지
  let lastUrl = '';
  let lastAt = 0;

  window.addEventListener('click', (e) => {
    const a = e.target?.closest?.(TARGET_SELECTOR);
    if (!a) return;

    // ✅ 원탭 이동 막기
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

    const realtorId = extractRealtorIdFromElement(a);
    if (!realtorId) {
      console.warn('[hongbu] realtorId를 찾지 못했습니다.', a);
      return;
    }

    const url = buildNewTabUrl(realtorId);

    const now = Date.now();
    if (url === lastUrl && now - lastAt < 800) return;
    lastUrl = url; lastAt = now;

    const ok = openInNewTabSafe(url);
    if (!ok) console.warn('[hongbu] popup blocked');
  }, true);

})();
})();
