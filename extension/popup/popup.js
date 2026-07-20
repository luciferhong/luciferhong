// 스크립트 레지스트리 — 새 스크립트 편입 시 여기에 1줄 추가
const SCRIPTS = [
  { id: 'naver-complex-label', name: '네이버부동산 단지라벨 색상변경' },
  { id: 'naver-price-filter', name: '부동산 매물 가격 필터(based on 모느나님)' },
  { id: 'nac', name: 'NAC(New Asil Chart)' },
  { id: 'asil-trade-more-no-monthly', name: '거래현황 더보기 월세 제외' },
  { id: 'naver-new-window', name: '네부 부동산 새창으로 열기' },
  { id: 'naver-article-download', name: '네이버 부동산 매물 다운로드' },
  { id: 'asil-multi-compare', name: '아실 여러단지비교 편하게 써보자' },
  { id: 'asil-chart-price', name: '아실 차트 가격표' },
  { id: 'asil-chart-hogang', name: '아실차트 호갱노노처럼' },
  { id: 'asil-chart-price-deal-link', name: '아실 차트 가격표[실거래 바로가기][단독사용X]' },
  { id: 'naver-agent-download', name: '네이버 부동산 중개소 다운로드' },
  { id: 'asil-map-deal-count', name: '아실 지도에 실거래수 표시하기' },
  { id: 'weolbu-hide-study-posts', name: '월닷 투자공부인증 게시글 숨기기' },
  { id: 'gin-supply-demand-filter', name: '지인 수요-공급 표 필터링' },
  { id: 'gin-national-demand-download', name: '지인 전국 수요-입주 플러스 다운로드' },
  { id: 'gin-demand-download', name: '지인 수요-입주 다운로드' },
  { id: 'tutoring-day-helper', name: '튜터링데이 인증샷 Helper' },
  { id: 'asil-school-env-complex', name: '아실 학군&환경&단지 함께 표시' },
];

const listEl = document.getElementById('scriptList');

async function render() {
  const { enabled = {} } = await chrome.storage.sync.get('enabled');
  listEl.textContent = '';
  for (const script of SCRIPTS) {
    const li = document.createElement('li');

    const label = document.createElement('label');
    label.textContent = script.name;
    label.htmlFor = `toggle-${script.id}`;

    const wrap = document.createElement('span');
    wrap.className = 'switch';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `toggle-${script.id}`;
    checkbox.checked = enabled[script.id] !== false; // 미설정 = 켜짐
    checkbox.addEventListener('change', () => save(script.id, checkbox.checked));
    wrap.appendChild(checkbox);

    li.appendChild(label);
    li.appendChild(wrap);
    listEl.appendChild(li);
  }
}

async function save(id, isOn) {
  const { enabled = {} } = await chrome.storage.sync.get('enabled');
  enabled[id] = isOn;
  await chrome.storage.sync.set({ enabled });
}

// 팝업 높이 = 브라우저 창 높이의 80% (크롬 팝업 상한 600px 이내)
(async () => {
  try {
    const win = await chrome.windows.getCurrent();
    document.body.style.height = Math.min(600, Math.round(win.height * 0.8)) + 'px';
  } catch (e) {}
})();

document.getElementById('reloadBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) chrome.tabs.reload(tab.id);
  window.close();
});

render();
