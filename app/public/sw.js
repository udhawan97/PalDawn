const CACHE_PREFIX = 'paldawn-foundation-'
const BUILD_ID = '__PALDAWN_BUILD_ID__'
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_ID}`
const UPDATE_REQUEST_MESSAGE = 'PALDAWN_REQUEST_UPDATE'
const UPDATE_PREPARE_MESSAGE = 'PALDAWN_PREPARE_UPDATE'
const UPDATE_PREPARED_MESSAGE = 'PALDAWN_UPDATE_PREPARED'
const UPDATE_CANCEL_MESSAGE = 'PALDAWN_CANCEL_UPDATE'
const UPDATE_RELOAD_MESSAGE = 'PALDAWN_REQUEST_RELOAD'
const UPDATE_COMMITTED_MESSAGE = 'PALDAWN_UPDATE_COMMITTED'
const UPDATE_ACTIVATED_MESSAGE = 'PALDAWN_UPDATE_ACTIVATED'
const UPDATE_BLOCKED_MESSAGE = 'PALDAWN_UPDATE_BLOCKED'
const LEGACY_UPDATE_MESSAGE = 'SKIP_WAITING'
const UPDATE_REQUEST_URL = new URL('./.paldawn-update-request', self.registration.scope).href
const PREPARE_TIMEOUT_MS = 4_000
let pendingPreparation = null
let activeUpdateAttemptId = null
let committedRequestId = null
const cancelledRequests = new Set()
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
    let updateRequest = null
    if (updateRequestResponse) {
      try {
        const candidate = await updateRequestResponse.json()
        if (validRequestId(candidate.requestId) && validClientIds(candidate.clientIds)) updateRequest = candidate
      } catch {
        // An invalid marker must not turn a first install into a reload loop.
      }
    }

    if (updateRequest) {
      committedRequestId = updateRequest.requestId
      const beforeClaim = await scopedWindows()
      notifyCommitted(updateRequest.requestId, beforeClaim)
      if (!sameClientIds(beforeClaim, updateRequest.clientIds)) {
        await self.clients.claim()
        await notifyBlocked(updateRequest.requestId, 'changed', beforeClaim)
        committedRequestId = null
        await cache.delete(UPDATE_REQUEST_URL)
        return
      }

      await self.clients.claim()
      const beforeCleanup = await scopedWindows()
      if (!sameClientIds(beforeCleanup, updateRequest.clientIds)) {
        await notifyBlocked(updateRequest.requestId, 'changed', mergeClients(beforeClaim, beforeCleanup))
        committedRequestId = null
        await cache.delete(UPDATE_REQUEST_URL)
        return
      }

      notifyCommitted(updateRequest.requestId, beforeCleanup)
      // PALDAWN_ACTIVATION_CACHE_COMMIT: browser acceptance delays this boundary.
      await deleteStalePalDawnCaches()
      for (const client of beforeCleanup) {
        client.postMessage({ type: UPDATE_ACTIVATED_MESSAGE, requestId: updateRequest.requestId })
      }
      committedRequestId = null
      await cache.delete(UPDATE_REQUEST_URL)
      return
    }

    await deleteStalePalDawnCaches()
    await self.clients.claim()
    if (updateRequestResponse) {
      await cache.delete(UPDATE_REQUEST_URL)
    }
  })())
})

const validRequestId = (value) =>
  typeof value === 'string' && value.length > 0 && value.length <= 128

const validClientIds = (value) =>
  Array.isArray(value) && value.length > 0 && value.length <= 64 &&
  value.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 256) &&
  new Set(value).size === value.length

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

const sameClientIds = (windows, expectedIds) => {
  if (windows.length !== expectedIds.length) return false
  const currentIds = new Set(windows.map((client) => client.id))
  return expectedIds.every((id) => currentIds.has(id))
}

const mergeClients = (...groups) => {
  const clients = new Map()
  for (const group of groups) {
    for (const client of group) clients.set(client.id, client)
  }
  return [...clients.values()]
}

const deleteStalePalDawnCaches = async () => {
  const names = await caches.keys()
  const stalePalDawnCaches = names.filter((name) =>
    name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
  await Promise.all(stalePalDawnCaches.map((name) => caches.delete(name)))
}

const notifyCommitted = (requestId, clients) => {
  for (const client of clients) {
    client.postMessage({ type: UPDATE_COMMITTED_MESSAGE, requestId })
  }
}

const notifyBlocked = async (requestId, reason, clients = null) => {
  const windows = clients ?? await scopedWindows()
  for (const client of windows) {
    client.postMessage({ type: UPDATE_BLOCKED_MESSAGE, requestId, reason })
  }
}

const prepareClients = async (requestId) => {
  const windows = await scopedWindows()
  const clientIds = windows.map((client) => client.id)
  if (windows.length === 0) return { ready: false, reason: 'failed', windows, clientIds }
  if (pendingPreparation) return { ready: false, reason: 'busy', windows, clientIds }

  const expected = new Set(windows.map((client) => client.id))
  let settle
  const result = new Promise((resolve) => { settle = resolve })
  const timer = setTimeout(() => settle({ ready: false, reason: 'timeout', windows, clientIds }), PREPARE_TIMEOUT_MS)
  pendingPreparation = {
    expected,
    requestId,
    settle: (outcome) => {
      clearTimeout(timer)
      settle({ ...outcome, windows, clientIds })
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

const handleCancelRequest = async (event) => {
  const requestId = event.data?.requestId
  if (!validRequestId(requestId) || !scopedClient(event.source)) return

  if (committedRequestId === requestId) {
    notifyCommitted(requestId, [event.source])
    return
  }
  if (activeUpdateAttemptId !== requestId) {
    try {
      const cache = await caches.open(CACHE_NAME)
      const markerResponse = await cache.match(UPDATE_REQUEST_URL)
      const marker = markerResponse ? await markerResponse.json() : null
      if (marker && marker.requestId === requestId && validClientIds(marker.clientIds)) {
        committedRequestId = requestId
        notifyCommitted(requestId, [event.source])
        return
      }
    } catch {
      // A corrupt or unavailable marker is not evidence that activation committed.
    }
  }
  cancelledRequests.add(requestId)
  if (cancelledRequests.size > 16) cancelledRequests.delete(cancelledRequests.values().next().value)
  if (pendingPreparation?.requestId === requestId) {
    pendingPreparation.settle({ ready: false, reason: 'activation-timeout' })
  }
}

const preparedClientFailure = (requestId, prepared, currentWindows) => {
  if (cancelledRequests.delete(requestId)) return 'activation-timeout'
  if (!sameClientIds(currentWindows, prepared.clientIds)) return 'changed'
  return null
}

const handleUpdateRequest = async (event) => {
  const requestId = event.data?.requestId
  if (!validRequestId(requestId) || !scopedClient(event.source)) return

  if (committedRequestId) {
    notifyCommitted(committedRequestId, [event.source])
    return
  }
  if (activeUpdateAttemptId && activeUpdateAttemptId !== requestId) {
    await notifyBlocked(requestId, 'busy', [event.source])
    return
  }
  activeUpdateAttemptId = requestId

  let prepared = null
  let cache = null
  try {
    prepared = await prepareClients(requestId)
    if (!prepared.ready) {
      cancelledRequests.delete(requestId)
      await notifyBlocked(requestId, prepared.reason, prepared.windows)
      return
    }

    cache = await caches.open(CACHE_NAME)
    const beforeMarker = await scopedWindows()
    const markerFailure = preparedClientFailure(requestId, prepared, beforeMarker)
    if (markerFailure) {
      await notifyBlocked(requestId, markerFailure, mergeClients(prepared.windows, beforeMarker))
      return
    }

    await cache.put(UPDATE_REQUEST_URL, new Response(JSON.stringify({
      requestId,
      clientIds: prepared.clientIds,
    }), {
      headers: { 'content-type': 'application/json' },
    }))

    const beforeActivation = await scopedWindows()
    const activationFailure = preparedClientFailure(requestId, prepared, beforeActivation)
    if (activationFailure) {
      await cache.delete(UPDATE_REQUEST_URL)
      await notifyBlocked(requestId, activationFailure, mergeClients(prepared.windows, beforeActivation))
      return
    }
    committedRequestId = requestId
    const activation = self.skipWaiting()
    notifyCommitted(requestId, beforeActivation)
    await activation
  } catch {
    committedRequestId = null
    if (cache) await cache.delete(UPDATE_REQUEST_URL)
    await notifyBlocked(requestId, 'failed', prepared?.windows ?? [event.source])
  } finally {
    activeUpdateAttemptId = null
    cancelledRequests.delete(requestId)
  }
}

const handleReloadRequest = async (event) => {
  const requestId = event.data?.requestId
  if (!validRequestId(requestId) || !scopedClient(event.source)) return

  const prepared = await prepareClients(requestId)
  if (!prepared.ready) {
    cancelledRequests.delete(requestId)
    await notifyBlocked(requestId, prepared.reason, prepared.windows)
    return
  }

  try {
    const beforeReload = await scopedWindows()
    const reloadFailure = preparedClientFailure(requestId, prepared, beforeReload)
    if (reloadFailure) {
      await notifyBlocked(requestId, reloadFailure, mergeClients(prepared.windows, beforeReload))
      return
    }
    committedRequestId = requestId
    notifyCommitted(requestId, beforeReload)
    for (const client of beforeReload) {
      client.postMessage({ type: UPDATE_ACTIVATED_MESSAGE, requestId })
    }
    committedRequestId = null
    const cache = await caches.open(CACHE_NAME)
    await cache.delete(UPDATE_REQUEST_URL)
    await deleteStalePalDawnCaches()
  } catch {
    committedRequestId = null
    await notifyBlocked(requestId, 'failed', prepared.windows)
  } finally {
    cancelledRequests.delete(requestId)
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
  if (event.data?.type === UPDATE_CANCEL_MESSAGE) {
    event.waitUntil(handleCancelRequest(event))
    return
  }
  if (event.data?.type === UPDATE_REQUEST_MESSAGE) {
    event.waitUntil(handleUpdateRequest(event))
    return
  }
  if (event.data?.type === UPDATE_RELOAD_MESSAGE) {
    event.waitUntil(handleReloadRequest(event))
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
