const CACHE_PREFIX = 'paldawn-foundation-'
const BUILD_ID = '__PALDAWN_BUILD_ID__'
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_ID}`
const SHELL = ['./', './site.webmanifest', './icon.svg']

const sameOriginAssetsFrom = async (response) => {
  const html = await response.clone().text()
  const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => new URL(match[1], self.registration.scope))
    .filter((url) => url.origin === self.location.origin)
  return [...new Set(urls.map((url) => url.href))]
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    await cache.addAll(SHELL)
    const index = await fetch('./')
    const assets = await sameOriginAssetsFrom(index)
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
