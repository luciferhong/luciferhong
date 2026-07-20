// 액션 아이콘 클릭 시 사이드 패널 열기 (팝업은 600px 높이 제한이 있어 사이드 패널로 전환)
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((e) => console.error('sidePanel 설정 실패:', e));
