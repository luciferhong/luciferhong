importScripts('common/registry.js');

// 액션 아이콘 클릭 시 사이드 패널 열기 (팝업은 600px 높이 제한이 있어 사이드 패널로 전환)
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((e) => console.error('sidePanel 설정 실패:', e));

// 설치/업데이트 시 아직 저장값이 없는 스크립트에 registry의 기본값(on)을 기록.
// 각 스크립트의 실행 가드는 저장소 값만 보므로, 여기서 시딩해야 기본 꺼짐이 실제로 적용됨.
// 사용자가 이미 토글한 값은 건드리지 않음.
chrome.runtime.onInstalled.addListener(async () => {
  const { enabled = {} } = await chrome.storage.sync.get('enabled');
  let changed = false;
  for (const s of SCRIPT_REGISTRY) {
    if (!(s.id in enabled)) {
      enabled[s.id] = s.on !== false; // 기본값: on 미지정 시 켜짐
      changed = true;
    }
  }
  if (changed) await chrome.storage.sync.set({ enabled });
});
