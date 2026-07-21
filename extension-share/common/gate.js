// MAIN world(페이지 컨텍스트) 스크립트용 토글 브릿지.
// MAIN world에서는 chrome.storage에 접근할 수 없으므로,
// document_start에 storage 값을 페이지 localStorage로 미러링해 두면
// 각 MAIN 스크립트가 실행 시점(document_idle)에 동기적으로 읽는다.
(async () => {
  try {
    const { enabled = {} } = await chrome.storage.sync.get('enabled');
    localStorage.setItem('__luciferhongExtEnabled', JSON.stringify(enabled));
  } catch (e) {
    // 샌드박스 프레임 등 localStorage 접근 불가 시: 미러링 생략 → 기본값(켜짐)으로 동작
  }
})();
