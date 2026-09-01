const CACHE_PREFIX = 'paldawn-foundation-'
const BUILD_ID = '__PALDAWN_BUILD_ID__'
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_ID}`
const UPDATE_REQUEST_MESSAGE = 'PALDAWN_REQUEST_UPDATE'
const UPDATE_PREPARE_MESSAGE = 'PALDAWN_PREPARE_UPDATE'
const UPDATE_PREPARED_MESSAGE = 'PALDAWN_UPDATE_PREPARED'
const UPDATE_ACTIVATED_MESSAGE = 'PALDAWN_UPDATE_ACTIVATED'
const UPDATE_BLOCKED_MESSAGE = 'PALDAWN_UPDATE_BLOCKED'
const LEGACY_UPDATE_MESSAGE = 'SKIP_WAITING'
const UPDATE_REQUEST_URL = new URL('./.paldawn-update-request', self.registration.scope).href
const PREPARE_TIMEOUT_MS = 4_000
let pendingPreparation = null
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

const validRequestId = (value) =>
  typeof value === 'string' && value.length > 0 && value.length <= 128

const updateRequestId = () => {
  try {
    return self.crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }
}

const scopedClient = (client) => {
  if (!client?.url) return false
  try {
    const url = new URL(client.url)
    return url.origin === self.location.origin && url.href.startsWith(self.registration.scope)
  } catch {
    return false
  }
}

const scopedWindows = async () => {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  return windows.filter(scopedClient)
}

const notifyBlocked = async (requestId, reason, clients = null) => {
  const windows = clients ?? await scopedWindows()
  for (const client of windows) {
    client.postMessage({ type: UPDATE_BLOCKED_MESSAGE, requestId, reason })
  }
}

const prepareClients = async (requestId) => {
  const windows = await scopedWindows()
  if (windows.length === 0) return { ready: false, reason: 'failed', windows }
  if (pendingPreparation) return { ready: false, reason: 'busy', windows }

  const expected = new Set(windows.map((client) => client.id))
  let settle
  const result = new Promise((resolve) => { settle = resolve })
  const timer = setTimeout(() => settle({ ready: false, reason: 'timeout', windows }), PREPARE_TIMEOUT_MS)
  pendingPreparation = {
    expected,
    requestId,
    settle: (outcome) => {
      clearTimeout(timer)
      settle({ ...outcome, windows })
    },
  }

  for (const client of windows) {
    client.postMessage({ type: UPDATE_PREPARE_MESSAGE, requestId })
  }

  const outcome = await result
  if (pendingPreparation?.requestId === requestId) pendingPreparation = null
  return outcome
}

const handlePrepared = (event) => {
  const requestId = event.data?.requestId
  const pending = pendingPreparation
  if (!pending || requestId !== pending.requestId || !scopedClient(event.source)) return
  if (!pending.expected.has(event.source.id)) return
  if (event.data.ready !== true) {
    pending.settle({ ready: false, reason: 'unsaved' })
    return
  }
  pending.expected.delete(event.source.id)
  if (pending.expected.size === 0) pending.settle({ ready: true })
}

const handleLegacyRequest = async (event) => {
  if (!scopedClient(event.source)) return
  const requestId = updateRequestId()
  // The audited base client cannot flush or acknowledge current in-memory work.
  // Recognize its request, but preserve every tab until a modern client can coordinate them.
  await notifyBlocked(requestId, 'legacy', [event.source])
}

const handleUpdateRequest = async (event) => {
  const requestId = event.data?.requestId
  if (!validRequestId(requestId) || !scopedClient(event.source)) return

  const prepared = await prepareClients(requestId)
  if (!prepared.ready) {
    await notifyBlocked(requestId, prepared.reason, prepared.windows)
    return
  }

  let cache = null
  try {
    cache = await caches.open(CACHE_NAME)
    await cache.put(UPDATE_REQUEST_URL, new Response(JSON.stringify({ requestId }), {
      headers: { 'content-type': 'application/json' },
    }))
    await self.skipWaiting()
  } catch {
    if (cache) await cache.delete(UPDATE_REQUEST_URL)
    await notifyBlocked(requestId, 'failed', prepared.windows)
  }
}

self.addEventListener('message', (event) => {
  if (event.data?.type === UPDATE_PREPARED_MESSAGE) {
    handlePrepared(event)
    return
  }
  if (event.data?.type === LEGACY_UPDATE_MESSAGE) {
    event.waitUntil(handleLegacyRequest(event))
    return
  }
  if (event.data?.type === UPDATE_REQUEST_MESSAGE) {
    event.waitUntil(handleUpdateRequest(event))
  }
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
