'use strict'

// StreamSaver.js 서비스 워커
// 페이지에서 레코드를 순차 전송 → 브라우저가 디스크에 직접 스트리밍 저장

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

const map = new Map()

self.addEventListener('message', evt => {
  if (evt.data === 'ping') {
    evt.ports[0].postMessage('pong')
    return
  }

  const data = evt.data
  const port = evt.ports[0]
  map.set(data.url, [port, data])
  port.postMessage({ download: data.url })
})

self.addEventListener('fetch', evt => {
  const url = evt.request.url
  if (!map.has(url)) return

  const [port, data] = map.get(url)
  map.delete(url)

  const headers = new Headers({
    'Content-Type': 'application/octet-stream; charset=utf-8',
    'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(data.filename || 'download'),
  })

  if (data.size) headers.set('Content-Length', String(data.size))

  const { readable, writable } = new TransformStream()
  evt.respondWith(new Response(readable, { headers }))
  port.postMessage({ writablePort: writable }, [writable])
})
