const CACHE_PREFIX = 'paldawn-foundation-'
const BUILD_ID = '__PALDAWN_BUILD_ID__'
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_ID}`
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
    const names = await caches.keys()
    const stalePalDawnCaches = names.filter((name) =>
      name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
    await Promise.all(stalePalDawnCaches.map((name) => caches.delete(name)))
    await self.clients.claim()
  })())
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
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
