'use strict';
// 실거래 알림 서비스워커 (2026-10-11) — 범위 /luciferhong/realAlert/ 전용.
// ⚠ 루트 sw.js(옛 memoBackup3 정리용, 범위 /luciferhong/)와 범위가 다르므로 공존한다. 이 파일을 루트로 옮기면 안 된다.
// fetch 처리기 없음(캐시 안 함) — 푸시 수신·알림 클릭만.
// 알림 내용(payload)은 알림 객체 data 에 통째로 담아 두고, 클릭하면 ① 같은 주소의 탭이 열려 있으면 그 탭에 postMessage
// ② 없으면 `주소#raPush=<JSON>` 으로 새로 연다 → hongbuAlert.html 이 해시를 읽어 패널로 보여 준다(2026-10-11 사용자: "알림을 눌러도 내용을 볼 수 없다").

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; }
  catch (err) { d = { title: '실거래 알림', body: e.data ? e.data.text() : '' }; }
  d.receivedAt = Date.now();
  const opts = {
    body: d.body || '',
    icon: './icon.png',
    badge: './icon.png',
    data: { url: d.url || './', payload: d },
    timestamp: d.receivedAt,
  };
  if (d.tag) { opts.tag = d.tag; opts.renotify = true; }
  e.waitUntil((async () => {
    await self.registration.showNotification(d.title || '실거래 알림', opts);
    // 페이지가 이미 열려 있으면 바로 넘겨 준다(알림을 안 눌러도 패널이 뜬다)
    try {
      const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      list.forEach(c => c.postMessage({ type: 'raPush', payload: d, live: true }));
    } catch (err) {}
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const data = e.notification.data || {};
  const payload = data.payload || {};
  const base = new URL(data.url || './', self.location.href);
  base.hash = '';
  const target = base.href + '#raPush=' + encodeURIComponent(JSON.stringify(payload));
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      let cu;
      try { cu = new URL(c.url); cu.hash = ''; } catch (err) { continue; }
      if (cu.href === base.href && 'focus' in c) {
        await c.focus();
        c.postMessage({ type: 'raPush', payload, live: false });
        return;
      }
    }
    return self.clients.openWindow(target);
  })());
});

// 브라우저가 구독을 갈아끼우는 경우(드묾) — 기기 키를 워커가 모르므로 재등록은 페이지가 다시 열릴 때 '알림 켜기'로.
self.addEventListener('pushsubscriptionchange', () => {});
