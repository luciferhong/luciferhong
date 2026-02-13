// ==UserScript==
// @name        [루시퍼홍] 월닷 투자공부인증 게시글 숨기기
// @namespace   Violentmonkey Scripts
// @match       https://weolbu.com/*
// @grant       GM_info
// @grant       none
// @version     1.1
// @description 월부닷컴 투자공부인증 게시글 숨기기

// @downloadURL https://update.greasyfork.org/scripts/566131/%5B%EB%A3%A8%EC%8B%9C%ED%8D%BC%ED%99%8D%5D%20%EC%9B%94%EB%8B%B7%20%ED%88%AC%EC%9E%90%EA%B3%B5%EB%B6%80%EC%9D%B8%EC%A6%9D%20%EA%B2%8C%EC%8B%9C%EA%B8%80%20%EC%88%A8%EA%B8%B0%EA%B8%B0.user.js
// @updateURL https://update.greasyfork.org/scripts/566131/%5B%EB%A3%A8%EC%8B%9C%ED%8D%BC%ED%99%8D%5D%20%EC%9B%94%EB%8B%B7%20%ED%88%AC%EC%9E%90%EA%B3%B5%EB%B6%80%EC%9D%B8%EC%A6%9D%20%EA%B2%8C%EC%8B%9C%EA%B8%80%20%EC%88%A8%EA%B8%B0%EA%B8%B0.meta.js
// ==/UserScript==


(() => {
  let currentObserver = null; // 현재 옵저버 저장

  // URL이 변경될 때마다 호출될 메인 함수
  const initScript = () => {
    // URL에서 subTab 값 확인
    const params = new URLSearchParams(window.location.search);
    const subTab = params.get('subTab');

    console.log(`현재 URL subTab 값: "${subTab}" | 현재 옵저버 상태: ${currentObserver ? '✅ 활성' : '❌ 없음'}`);

    // 조건 불일치 시 이전 옵저버 정리 후 중단
    if (subTab !== '11') {
      console.log(`⚠️ 조건 불일치: subTab="${subTab}" (필요: "11") - 스크립트 중단`);

      // 옵저버 정리
      if (currentObserver) {
        console.log("🧹 옵저버 정리 시작...");
        currentObserver.disconnect();
        currentObserver = null;
        console.log("🛑 옵저버 정리 완료");
      } else {
        console.log("ℹ️ 이미 정리된 옵저버입니다.");
      }

      // 스타일 제거
      const styleId = "hong-delete-style-right";
      const style = document.getElementById(styleId);
      if (style) {
        style.remove();
        console.log("🗑️ 스타일 제거 완료");
      }

      // 버튼 제거
      document.querySelectorAll(".hong-delete-btn").forEach(btn => {
        btn.remove();
      });
      console.log("🗑️ 모든 삭제 버튼 제거 완료");

      return;
    }

    console.log("✅ subTab=11 확인됨: 스크립트 실행 시작");

    // 스타일 추가 함수
    const addStyles = () => {
      const styleId = "hong-delete-style-right";
      if (document.getElementById(styleId)) return;

      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        /* 레이아웃 안 밀리게: padding/margin 건드리지 않음 */
        ul.mb-14 > li {
          position: relative; /* 버튼 절대배치 기준만 잡음 */
        }

        .hong-delete-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: #ff4d4f;
          color: #fff;
          border: none;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          line-height: 1;
          white-space: nowrap; /* '삭제' 안 잘리게 */
          z-index: 9999;

          opacity: 0;
          pointer-events: none;
          transition: opacity .15s ease;
        }

        ul.mb-14 > li:hover .hong-delete-btn {
          opacity: 1;
          pointer-events: auto;
        }
      `;
      document.head.appendChild(style);
    };

    // 버튼 추가 함수
    const addDeleteButtons = () => {
      try {
        document.querySelectorAll("ul.mb-14 > li").forEach((li) => {
          if (li.querySelector(".hong-delete-btn")) return;

          const btn = document.createElement("button");
          btn.className = "hong-delete-btn";
          btn.type = "button";
          btn.textContent = "숨기기";

          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();

            // 요소를 삭제하지 말고 숨기기 (사이트 원본 코드 간섭 방지)
            li.style.display = "none";
            console.log("✅ 게시글 숨김 처리됨");
          });

          li.appendChild(btn);
        });
      } catch (error) {
        console.log("⚠️ 버튼 추가 중 오류: ", error.message);
      }
    };

    // DOM 준비 완료 대기
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        try {
          addStyles();
          addDeleteButtons();
          console.log("✅ 오른쪽 삭제 버튼 적용 완료 (DOMContentLoaded)");
        } catch (error) {
          console.log("⚠️ DOMContentLoaded 처리 중 오류: ", error.message);
        }
      });
    } else {
      // 이미 로드됨
      try {
        addStyles();
        addDeleteButtons();
        console.log("✅ 오른쪽 삭제 버튼 적용 완료 (즉시)");
      } catch (error) {
        console.log("⚠️ 초기 처리 중 오류: ", error.message);
      }
    }

    // 동적으로 추가되는 요소도 감지
    if (currentObserver) {
      console.log("🔄 기존 옵저버가 있음 - 새로 생성 전 정리");
      currentObserver.disconnect();
      currentObserver = null;
    }

    currentObserver = new MutationObserver(() => {
      try {
        addDeleteButtons();
      } catch (error) {
        console.log("⚠️ MutationObserver 처리 중 오류: ", error.message);
      }
    });

    currentObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    console.log("👁️ ✅ 새로운 MutationObserver 생성 및 시작");
  };

  // 초기 실행
  initScript();

  // URL 변경 감지 (이벤트 기반 - 더 효율적)

  // 1️⃣ popstate 이벤트 (뒤로가기/앞으로가기)
  window.addEventListener('popstate', () => {
    console.log("📍 popstate 감지");
    setTimeout(() => initScript(), 100);
  });

  // 2️⃣ History API 오버라이드 (pushState, replaceState)
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(history, args);
    console.log("📍 pushState 감지");
    setTimeout(() => initScript(), 100);
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(history, args);
    console.log("📍 replaceState 감지");
    setTimeout(() => initScript(), 100);
  };

  // 3️⃣ 링크 클릭 감지 (SPA 라우팅)
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (link && link.href && link.href.startsWith(window.location.origin)) {
      setTimeout(() => initScript(), 100);
    }
  }, true);
})();
