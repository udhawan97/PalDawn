const CACHE_PREFIX = 'paldawn-foundation-'
const BUILD_ID = '__PALDAWN_BUILD_ID__'
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_ID}`
const UPDATE_REQUEST_MESSAGE = 'PALDAWN_REQUEST_UPDATE'
const UPDATE_ACTIVATED_MESSAGE = 'PALDAWN_UPDATE_ACTIVATED'
const UPDATE_REQUEST_URL = new URL('./.paldawn-update-request', self.registration.scope).href
const SHELL = [
  './',
  './asset-manifest.json',
  './site.webmanifest',
  './icon.svg',
  './icon-static.svg',
  './icon-app.svg',
  './icon-maskable.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    await cache.addAll(SHELL)
    const manifestResponse = await fetch('./asset-manifest.json')
    const manifest = await manifestResponse.json()
    const assets = Array.isArray(manifest.files)
      ? manifest.files.filter((path) => typeof path === 'string' && path.startsWith('./assets/'))
      : []
    await cache.addAll(assets)
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    const updateRequestResponse = await cache.match(UPDATE_REQUEST_URL)
    let requestId = null
    if (updateRequestResponse) {
      try {
        const updateRequest = await updateRequestResponse.json()
        if (typeof updateRequest.requestId === 'string' && updateRequest.requestId.length > 0 && updateRequest.requestId.length <= 128) {
          requestId = updateRequest.requestId
        }
      } catch {
        // An invalid marker must not turn a first install into a reload loop.
      }
    }

    const names = await caches.keys()
    const stalePalDawnCaches = names.filter((name) =>
      name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
    await Promise.all(stalePalDawnCaches.map((name) => caches.delete(name)))
    await self.clients.claim()

    if (requestId) {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) {
        client.postMessage({ type: UPDATE_ACTIVATED_MESSAGE, requestId })
      }
    }
    if (updateRequestResponse) {
      await cache.delete(UPDATE_REQUEST_URL)
    }
  })())
})

self.addEventListener('message', (event) => {
  if (event.data?.type !== UPDATE_REQUEST_MESSAGE) return
  const requestId = event.data.requestId
  if (typeof requestId !== 'string' || requestId.length === 0 || requestId.length > 128) return

  let sourceUrl = null
  try {
    sourceUrl = event.source?.url ? new URL(event.source.url) : null
  } catch {
    return
  }
  if (sourceUrl?.origin !== self.location.origin || !sourceUrl.href.startsWith(self.registration.scope)) return

  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(UPDATE_REQUEST_URL, new Response(JSON.stringify({ requestId }), {
      headers: { 'content-type': 'application/json' },
    }))
    await self.skipWaiting()
  })())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME)
          await cache.put('./', response.clone())
        }
        return response
      } catch {
        return (await caches.match(request)) ?? (await caches.match('./')) ?? Response.error()
      }
    })())
    return
  }

  event.respondWith((async () => {
    const cached = await caches.match(request)
    if (cached) return cached
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      await cache.put(request, response.clone())
    }
    return response
  })())
})
