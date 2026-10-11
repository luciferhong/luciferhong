'use strict';
// 실거래 알림 서비스워커 (2026-10-11) — 범위 /luciferhong/realAlert/ 전용.
// ⚠ 루트 sw.js(옛 memoBackup3 정리용, 범위 /luciferhong/)와 범위가 다르므로 공존한다. 이 파일을 루트로 옮기면 안 된다.
// fetch 처리기 없음(캐시 안 함) — 푸시 수신·알림 클릭만.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; }
  catch (err) { d = { title: '실거래 알림', body: e.data ? e.data.text() : '' }; }
  const opts = {
    body: d.body || '',
    icon: './icon.png',
    badge: './icon.png',
    data: { url: d.url || './' },
    timestamp: Date.now(),
  };
  if (d.tag) { opts.tag = d.tag; opts.renotify = true; }
  e.waitUntil(self.registration.showNotification(d.title || '실거래 알림', opts));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil((async () => {
    const target = new URL(url, self.location.href).href;
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if (c.url === target && 'focus' in c) return c.focus();
    }
    return self.clients.openWindow(target);
  })());
});

// 브라우저가 구독을 갈아끼우는 경우(드묾) — 기기 키를 워커가 모르므로 재등록은 페이지가 다시 열릴 때 '알림 켜기'로.
self.addEventListener('pushsubscriptionchange', () => {});
