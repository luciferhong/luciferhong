'use strict'

// 정리용 서비스 워커 (2026-10-04)
// 예전 memoBackup3.html 이 '/luciferhong/' 범위에 다운로드용 서비스 워커(sw.js)를 등록했다가 코드를 되돌렸는데
// (커밋 f040454 → ea94498), 등록은 그 브라우저에 남았다. 그 워커가 시작 중(STARTING)에서 멈추면
// 이 주소 아래 모든 페이지가 로딩만 돈다(사용자 크롬 실측). 브라우저가 업데이트를 확인하며 이 파일을 받으면
// 옛 워커를 대신해 설치되고, 곧바로 자기 등록을 해제한다.
// ⚠ fetch 처리기를 두지 않는다 — 요청은 전부 그대로 네트워크로 간다. 열린 페이지를 강제로 새로고침하지도 않는다
//   (입력 중이던 내용을 잃지 않게). 이 파일을 지우면 옛 워커가 남은 브라우저가 다시 정리되지 않으니 그대로 둔다.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil(self.registration.unregister())
})
