'use strict'

// 직접 구현한 스트리밍 다운로드 서비스 워커
// 외부 라이브러리 없이 memoBackup3.html과 직접 통신

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

const pending = new Map() // url → { port, filename }

self.addEventListener('message', evt => {
  const { id, filename } = evt.data
  const port = evt.ports[0]
  const url = self.registration.scope + '__dl__/' + id
  pending.set(url, { port, filename })
  port.postMessage({ url })
})

self.addEventListener('fetch', evt => {
  const entry = pending.get(evt.request.url)
  if (!entry) return

  pending.delete(evt.request.url)
  const { port, filename } = entry

  const { readable, writable } = new TransformStream()

  evt.respondWith(new Response(readable, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(filename),
    },
  }))

  port.postMessage({ writable }, [writable])
})
