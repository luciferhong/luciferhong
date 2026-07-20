// [확장 이식] 원본: [루시퍼홍] 거래현황 더보기 월세 제외.user.js v0.01
// greasyfork 업데이트 팝업 제거 — 웹스토어 자동 업데이트로 대체. 본문은 원본 그대로.
(async () => {
  const SCRIPT_ID = 'asil-trade-more-no-monthly';
  const { enabled = {} } = await chrome.storage.sync.get('enabled');
  if (enabled[SCRIPT_ID] === false) return; // 미설정 = 켜짐
  console.log('거래현황 더보기 월세 제외 v0.01 (extension)');




(function () {
  'use strict';

  const tryClickDeal3 = () => {
    const selectW = document.querySelector("#deal3");
    console.log("selectW", selectW);
    if (selectW) {
      console.log("✅ #deal3 발견됨:", selectW);
      if (selectW.classList.contains("on")) {
        selectW.click();
        console.log("🖱️ 클릭 실행됨");
      }
      return true;
    }
    return false;
  };

  // 즉시 실행 + 반복 확인
  let attempts = 0;
  const interval = setInterval(() => {
    if (tryClickDeal3() || ++attempts > 100) {
      clearInterval(interval);
    }
  }, 100);

  // MutationObserver 병행
  const observer = new MutationObserver(() => {
    tryClickDeal3();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();

})();
