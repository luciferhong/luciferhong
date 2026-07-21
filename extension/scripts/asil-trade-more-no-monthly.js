// [확장 이식] 원본: [루시퍼홍] 거래현황 더보기 월세 제외.user.js v0.01
// greasyfork 업데이트 팝업 제거 — 웹스토어 자동 업데이트로 대체. 본문은 원본 그대로.
// MAIN world(페이지 컨텍스트) 실행 — 페이지의 javascript: 링크 클릭이 확장 CSP에 막히지 않도록. 토글은 common/gate.js가 localStorage로 미러링.
(() => {
  const SCRIPT_ID = 'asil-chart-price'; // [확장 이식] 아실 차트 가격표와 토글 통합
  try {
    const __en = JSON.parse(localStorage.getItem('__luciferhongExtEnabled') || '{}');
    if (__en[SCRIPT_ID] === false) return; // 미설정 = 켜짐
  } catch (e) {}
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
