// [확장 이식] 원본: [루시퍼홍] 튜터링데이 인증샷 Helper.user.js v1.00
// greasyfork 업데이트 팝업 제거 — 웹스토어 자동 업데이트로 대체. 본문은 원본 그대로.
(async () => {
  const SCRIPT_ID = 'tutoring-day-helper';
  const { enabled = {} } = await chrome.storage.sync.get('enabled');
  if (enabled[SCRIPT_ID] === false) return; // 미설정 = 켜짐
  console.log('튜터링데이 인증샷 Helper v1.00 (extension)');


(function () {
  'use strict';

  let draggedEl = null;

  /** 각 item 을 draggable 로 만들기 */
  function enableDrag() {
    document.querySelectorAll('.article-album-view .item').forEach(item => {
      if (item.getAttribute('draggable') === 'true') return;

      item.setAttribute('draggable', 'true');

      item.addEventListener('dragstart', function () {
        draggedEl = this;
      });

      item.addEventListener('dragover', function (e) {
        e.preventDefault();
      });

      item.addEventListener('drop', function (e) {
        e.preventDefault();
        if (!draggedEl || draggedEl === this) return;
        this.parentNode.insertBefore(draggedEl, this);
      });
    });
  }

  /** article-board 가 등장할 때까지 반복 체크 후 drag 만 적용 */
  function initWhenReady() {
    const board = document.querySelector('.article-board');
    if (!board) {
      setTimeout(initWhenReady, 200);
      return;
    }


    enableDrag();

    // ajax 로 item 이 새로 로딩될 때도 drag 재부여
    const observer = new MutationObserver(() => {
      enableDrag();
    });
    observer.observe(board, { childList: true, subtree: true });
  }

  initWhenReady();
})();
})();
