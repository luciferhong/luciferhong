// [확장 이식] 원본: [루시퍼홍] 지인 수요-공급 표 필터링.user.js v1.1
// greasyfork 업데이트 팝업 제거 — 웹스토어 자동 업데이트로 대체. 본문은 원본 그대로.
(async () => {
  const SCRIPT_ID = 'gin-supply-demand-filter';
  const { enabled = {} } = await chrome.storage.sync.get('enabled');
  if (enabled[SCRIPT_ID] === false) return; // 미설정 = 켜짐
  console.log('지인 수요-공급 표 필터링 v1.1 (extension)');


(function () {
  const container = document.getElementById('AllForAptList');
  if (!container) return alert('#AllForAptList 요소를 찾을 수 없습니다');

  // ✅ 필터 UI 생성 함수
  function createRegionFilter() {
    // 기존 필터 제거
    document.getElementById('aptRegionFilterBox')?.remove();

    const lockedRows = container.querySelectorAll('.k-grid-content-locked tbody tr');
    const dataRows = container.querySelectorAll('.k-grid-content tbody tr');
    const regions = Array.from(lockedRows).map(row => row.cells[0]?.textContent.trim());
    const uniqueRegions = [...new Set(regions)];

    if (uniqueRegions.length === 0) return; // 데이터 없으면 생성하지 않음

    // 필터 UI DOM 생성
    const filterBox = document.createElement('div');
    filterBox.id = 'aptRegionFilterBox';
    filterBox.style.border = '1px solid #ccc';
    filterBox.style.padding = '8px 12px';
    filterBox.style.marginBottom = '10px';
    filterBox.style.background = '#f9f9f9';
    filterBox.style.fontSize = '14px';

    filterBox.innerHTML = `
      <strong>📌 지역 필터 : </strong>
      <label style="margin-right: 12px;">
        <input type="checkbox" id="aptRegionAll" checked> 전체선택
      </label>
      ${uniqueRegions.map(r => `
        <label style="margin-right: 10px;">
          <input type="checkbox" class="aptRegionCheck" data-region="${r}" checked> ${r}
        </label>
      `).join('')}
    `;

    container.parentNode.insertBefore(filterBox, container);
      const box = document.getElementById('aptRegionFilterBox');
  if (!box) return alert('필터 박스가 없습니다.');

  // 모든 라벨에 줄간격 스타일 적용
  box.querySelectorAll('label').forEach(label => {
    label.style.display = 'inline-block';
    label.style.marginBottom = '10px'; // 기존보다 줄 간격 2배
  });

  // 전체 박스의 line-height 증가도 적용
  box.style.lineHeight = '2.2';

    // 필터 동작
    function applyFilter() {
      const checked = Array.from(document.querySelectorAll('.aptRegionCheck:checked'))
        .map(cb => cb.dataset.region);
      for (let i = 0; i < lockedRows.length; i++) {
        const region = lockedRows[i].cells[0]?.textContent.trim();
        const show = checked.includes(region);
        lockedRows[i].style.display = show ? '' : 'none';
        dataRows[i].style.display = show ? '' : 'none';
      }
    }

    document.getElementById('aptRegionAll').addEventListener('change', e => {
      const check = e.target.checked;
      document.querySelectorAll('.aptRegionCheck').forEach(cb => cb.checked = check);
      applyFilter();
    });

    document.querySelectorAll('.aptRegionCheck').forEach(cb => {
      cb.addEventListener('change', () => {
        const all = document.getElementById('aptRegionAll');
        const allChecks = document.querySelectorAll('.aptRegionCheck');
        const checked = document.querySelectorAll('.aptRegionCheck:checked');
        all.checked = allChecks.length === checked.length;
        applyFilter();
      });
    });

    applyFilter();
  }

  // ✅ 최초 생성
  createRegionFilter();

  // ✅ MutationObserver로 테이블 감시
  const observer = new MutationObserver(mutations => {
    // 테이블 내용 바뀌면 필터 재생성
    createRegionFilter();
  });

  observer.observe(container, {
    childList: true,
    subtree: true
  });

  console.log('✅ 지역 필터 감시 시작됨');
})();
})();
