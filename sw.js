'use strict'

// StreamSaver.js v2.0.6 호환 서비스 워커
// StreamSaver 라이브러리가 { id, filename } 형식으로 메시지를 보내면
// scope + '__getSW/' + id 경로를 fetch 인터셉트 URL로 사용

let supportsTransferable = false
try {
  const { readable } = new TransformStream()
  const mc = new MessageChannel()
  mc.port1.postMessage(readable, [readable])
  supportsTransferable = true
} catch (e) {
  supportsTransferable = false
}

const map = new Map()

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('message', evt => {
  if (evt.data === 'ping') {
    evt.ports[0].postMessage('pong')
    return
  }

  const data = evt.data
  const downloadUrl = self.registration.scope + '__getSW/' + data.id
  const port = evt.ports[0]

  map.set(downloadUrl, [port, data])
  port.postMessage({ download: downloadUrl })
})

self.addEventListener('fetch', evt => {
  const url = evt.request.url
  if (!map.has(url)) return
  evt.respondWith(respond(url))
})

async function respond(url) {
  const [port, data] = map.get(url)
  map.delete(url)

  const { filename, size, headers: additionalHeaders = {} } = data

  const headers = new Headers({
    'Content-Type': 'application/octet-stream; charset=utf-8',
    'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(filename),
    ...additionalHeaders,
  })

  if (Number.isFinite(size)) headers.set('Content-Length', size)

  const { readable, writable } = new TransformStream()

  if (supportsTransferable) {
    port.postMessage({ writablePort: writable }, [writable])
  } else {
    port.postMessage({ writablePort: writable })
  }

  return new Response(readable, { headers })
}
