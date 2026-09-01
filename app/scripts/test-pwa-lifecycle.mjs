import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const serviceWorkerSource = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')

const cacheKey = (request) => typeof request === 'string' ? request : request.url

export async function runPwaLifecycleTests() {
  const listeners = new Map()
  const cacheBuckets = new Map()
  const clientMessages = [[], []]
  const timers = new Map()
  let nextTimerId = 1
  let claimCount = 0
  let skipWaitingCount = 0
  let afterCachePut = null

  const scheduleTimeout = (callback) => {
    const id = nextTimerId++
    timers.set(id, callback)
    return id
  }
  const cancelTimeout = (id) => timers.delete(id)
  const runTimers = () => {
    const callbacks = [...timers.values()]
    timers.clear()
    callbacks.forEach((callback) => callback())
  }

  const openCache = (name) => {
    let entries = cacheBuckets.get(name)
    if (!entries) {
      entries = new Map()
      cacheBuckets.set(name, entries)
    }
    return {
      addAll: async () => {},
      delete: async (request) => entries.delete(cacheKey(request)),
      match: async (request) => entries.get(cacheKey(request)),
      put: async (request, response) => {
        entries.set(cacheKey(request), response)
        afterCachePut?.(request)
      },
    }
  }

  const clients = clientMessages.map((messages, index) => ({
    id: `client-${index + 1}`,
    url: `https://example.test/PalDawn/?tab=${index + 1}`,
    postMessage: (message) => messages.push(JSON.parse(JSON.stringify(message))),
  }))
  const changedClientMessages = []
  const changedClient = {
    id: 'client-3',
    url: 'https://example.test/PalDawn/?tab=3',
    postMessage: (message) => changedClientMessages.push(JSON.parse(JSON.stringify(message))),
  }
  let currentClients = clients

  const worker = {
    addEventListener: (name, listener) => listeners.set(name, listener),
    clients: {
      claim: async () => { claimCount += 1 },
      matchAll: async (options) => {
        assert.deepEqual(JSON.parse(JSON.stringify(options)), { type: 'window', includeUncontrolled: true })
        return currentClients
      },
    },
    location: { origin: 'https://example.test' },
    registration: { scope: 'https://example.test/PalDawn/' },
    skipWaiting: async () => { skipWaitingCount += 1 },
  }

  vm.runInNewContext(serviceWorkerSource, {
    URL,
    Request,
    Response,
    clearTimeout: cancelTimeout,
    caches: {
      delete: async (name) => cacheBuckets.delete(name),
      keys: async () => [...cacheBuckets.keys()],
      open: async (name) => openCache(name),
      match: async (request) => {
        for (const entries of cacheBuckets.values()) {
          const response = entries.get(cacheKey(request))
          if (response) return response
        }
        return undefined
      },
    },
    fetch: async () => { throw new Error('fetch is outside this lifecycle test') },
    setTimeout: scheduleTimeout,
    self: worker,
  }, { filename: 'sw.js' })

  const dispatch = async (name, event = {}) => {
    let lifetime
    listeners.get(name)?.({
      ...event,
      waitUntil: (promise) => { lifetime = promise },
    })
    await lifetime
  }

  await openCache('paldawn-foundation-old')
  await openCache('unrelated-cache')
  await dispatch('activate')
  assert.equal(claimCount, 1, 'first install must claim without asking clients to reload')
  assert.deepEqual(clientMessages, [[], []], 'first install must not broadcast an update reload')
  assert.equal(cacheBuckets.has('paldawn-foundation-old'), false, 'old PalDawn caches must be removed')
  assert.equal(cacheBuckets.has('unrelated-cache'), true, 'unrelated caches must remain untouched')

  await dispatch('message', {
    data: { type: 'PALDAWN_REQUEST_UPDATE', requestId: 'request-1' },
    source: { url: 'https://attacker.example/PalDawn/' },
  })
  assert.equal(skipWaitingCount, 0, 'cross-origin clients cannot request activation')

  await dispatch('message', {
    data: { type: 'PALDAWN_REQUEST_UPDATE', requestId: 'request-1' },
    source: { url: 'https://example.test/outside-scope/' },
  })
  assert.equal(skipWaitingCount, 0, 'same-origin clients outside the registration scope cannot request activation')

  await dispatch('message', {
    data: { type: 'SKIP_WAITING' },
    source: clients[0],
  })
  assert.equal(skipWaitingCount, 0, 'a legacy request must never bypass the preparation handshake')
  assert.deepEqual(clientMessages[0], [{
    type: 'PALDAWN_UPDATE_BLOCKED',
    requestId: clientMessages[0][0].requestId,
    reason: 'legacy',
  }], 'a legacy request must receive a fail-closed response with a modern request ID')
  assert.match(clientMessages[0][0].requestId, /\S+/)

  clientMessages.forEach((messages) => messages.splice(0))
  const vetoedRequest = dispatch('message', {
    data: { type: 'PALDAWN_REQUEST_UPDATE', requestId: 'request-1' },
    source: clients[0],
  })
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(clientMessages, [
    [{ type: 'PALDAWN_PREPARE_UPDATE', requestId: 'request-1' }],
    [{ type: 'PALDAWN_PREPARE_UPDATE', requestId: 'request-1' }],
  ], 'every in-scope client must prepare before activation')
  await dispatch('message', {
    data: { type: 'PALDAWN_UPDATE_PREPARED', requestId: 'request-1', ready: true },
    source: clients[0],
  })
  await dispatch('message', {
    data: { type: 'PALDAWN_UPDATE_PREPARED', requestId: 'request-1', ready: false },
    source: clients[1],
  })
  await vetoedRequest
  assert.equal(skipWaitingCount, 0, 'one client veto must prevent activation')
  assert.deepEqual(clientMessages.map((messages) => messages.at(-1)), [
    { type: 'PALDAWN_UPDATE_BLOCKED', requestId: 'request-1', reason: 'unsaved' },
    { type: 'PALDAWN_UPDATE_BLOCKED', requestId: 'request-1', reason: 'unsaved' },
  ], 'a veto must produce a truthful result in every modern client')

  clientMessages.forEach((messages) => messages.splice(0))
  const timedOutRequest = dispatch('message', {
    data: { type: 'PALDAWN_REQUEST_UPDATE', requestId: 'request-2' },
    source: clients[0],
  })
  await new Promise((resolve) => setImmediate(resolve))
  await dispatch('message', {
    data: { type: 'PALDAWN_UPDATE_PREPARED', requestId: 'request-2', ready: true },
    source: clients[0],
  })
  runTimers()
  await timedOutRequest
  assert.equal(skipWaitingCount, 0, 'a missing client acknowledgement must time out without activation')
  assert.deepEqual(clientMessages.map((messages) => messages.at(-1)), [
    { type: 'PALDAWN_UPDATE_BLOCKED', requestId: 'request-2', reason: 'timeout' },
    { type: 'PALDAWN_UPDATE_BLOCKED', requestId: 'request-2', reason: 'timeout' },
  ], 'a missing acknowledgement must produce a truthful timeout result')

  clientMessages.forEach((messages) => messages.splice(0))
  const changedRequest = dispatch('message', {
    data: { type: 'PALDAWN_REQUEST_UPDATE', requestId: 'request-changed' },
    source: clients[0],
  })
  await new Promise((resolve) => setImmediate(resolve))
  await dispatch('message', {
    data: { type: 'PALDAWN_UPDATE_PREPARED', requestId: 'request-changed', ready: true },
    source: clients[0],
  })
  listeners.get('message')?.({
    data: { type: 'PALDAWN_UPDATE_PREPARED', requestId: 'request-changed', ready: true },
    source: clients[1],
    waitUntil: () => {},
  })
  currentClients = [...clients, changedClient]
  await changedRequest
  assert.equal(skipWaitingCount, 0, 'a client opened after acknowledgements must block activation')
  assert.deepEqual([
    ...clientMessages.map((messages) => messages.at(-1)),
    changedClientMessages.at(-1),
  ], [
    { type: 'PALDAWN_UPDATE_BLOCKED', requestId: 'request-changed', reason: 'changed' },
    { type: 'PALDAWN_UPDATE_BLOCKED', requestId: 'request-changed', reason: 'changed' },
    { type: 'PALDAWN_UPDATE_BLOCKED', requestId: 'request-changed', reason: 'changed' },
  ], 'the prepared and newly opened clients must receive a truthful changed-set result')
  const changedCache = cacheBuckets.get('paldawn-foundation-__PALDAWN_BUILD_ID__')
  assert.equal([...changedCache.keys()].some((key) => key.endsWith('/.paldawn-update-request')), false, 'a changed client set must not leave an activation marker')

  currentClients = clients
  clientMessages.forEach((messages) => messages.splice(0))
  changedClientMessages.splice(0)
  afterCachePut = (request) => {
    if (!cacheKey(request).endsWith('/.paldawn-update-request')) return
    afterCachePut = null
    currentClients = [clients[0]]
  }
  const closedAfterMarkerRequest = dispatch('message', {
    data: { type: 'PALDAWN_REQUEST_UPDATE', requestId: 'request-closed-after-marker' },
    source: clients[0],
  })
  await new Promise((resolve) => setImmediate(resolve))
  for (const client of clients) {
    await dispatch('message', {
      data: { type: 'PALDAWN_UPDATE_PREPARED', requestId: 'request-closed-after-marker', ready: true },
      source: client,
    })
  }
  await closedAfterMarkerRequest
  assert.equal(skipWaitingCount, 0, 'a client closed after marker creation must block activation')
  assert.deepEqual(clientMessages.map((messages) => messages.at(-1)), [
    { type: 'PALDAWN_UPDATE_BLOCKED', requestId: 'request-closed-after-marker', reason: 'changed' },
    { type: 'PALDAWN_UPDATE_BLOCKED', requestId: 'request-closed-after-marker', reason: 'changed' },
  ], 'a post-marker client-set change must notify every initially prepared client')
  assert.equal([...changedCache.keys()].some((key) => key.endsWith('/.paldawn-update-request')), false, 'a post-marker client-set change must roll back the activation marker')

  currentClients = clients
  clientMessages.forEach((messages) => messages.splice(0))
  const cancelledRequest = dispatch('message', {
    data: { type: 'PALDAWN_REQUEST_UPDATE', requestId: 'request-cancelled' },
    source: clients[0],
  })
  await new Promise((resolve) => setImmediate(resolve))
  await dispatch('message', {
    data: { type: 'PALDAWN_UPDATE_PREPARED', requestId: 'request-cancelled', ready: true },
    source: clients[0],
  })
  listeners.get('message')?.({
    data: { type: 'PALDAWN_UPDATE_PREPARED', requestId: 'request-cancelled', ready: true },
    source: clients[1],
    waitUntil: () => {},
  })
  listeners.get('message')?.({
    data: { type: 'PALDAWN_CANCEL_UPDATE', requestId: 'request-cancelled' },
    source: clients[0],
    waitUntil: () => {},
  })
  await cancelledRequest
  assert.equal(skipWaitingCount, 0, 'a client watchdog cancellation must prevent activation before skipWaiting')
  assert.deepEqual(clientMessages.map((messages) => messages.at(-1)), [
    { type: 'PALDAWN_UPDATE_BLOCKED', requestId: 'request-cancelled', reason: 'activation-timeout' },
    { type: 'PALDAWN_UPDATE_BLOCKED', requestId: 'request-cancelled', reason: 'activation-timeout' },
  ], 'a watchdog cancellation must restore every prepared client with an actionable result')

  clientMessages.forEach((messages) => messages.splice(0))
  const acceptedRequest = dispatch('message', {
    data: { type: 'PALDAWN_REQUEST_UPDATE', requestId: 'request-3' },
    source: clients[0],
  })
  await new Promise((resolve) => setImmediate(resolve))
  for (const client of clients) {
    await dispatch('message', {
      data: { type: 'PALDAWN_UPDATE_PREPARED', requestId: 'request-3', ready: true },
      source: client,
    })
  }
  await acceptedRequest
  assert.equal(skipWaitingCount, 1, 'activation requires an affirmative response from every client')

  const currentCache = cacheBuckets.get('paldawn-foundation-__PALDAWN_BUILD_ID__')
  assert.ok([...currentCache.keys()].some((key) => key.endsWith('/.paldawn-update-request')), 'activation request must survive in the new worker cache')

  await dispatch('activate')
  assert.equal(claimCount, 2)
  assert.deepEqual(clientMessages, [
    [
      { type: 'PALDAWN_PREPARE_UPDATE', requestId: 'request-3' },
      { type: 'PALDAWN_UPDATE_ACTIVATED', requestId: 'request-3' },
    ],
    [
      { type: 'PALDAWN_PREPARE_UPDATE', requestId: 'request-3' },
      { type: 'PALDAWN_UPDATE_ACTIVATED', requestId: 'request-3' },
    ],
  ], 'every in-scope window must receive the same activation request')
  assert.equal([...currentCache.keys()].some((key) => key.endsWith('/.paldawn-update-request')), false, 'activation marker must be consumed once')

  clientMessages.forEach((messages) => messages.splice(0))
  await dispatch('activate')
  assert.deepEqual(clientMessages, [[], []], 'a consumed request must not create a reload loop')

  const reloadRequest = dispatch('message', {
    data: { type: 'PALDAWN_REQUEST_RELOAD', requestId: 'request-reload' },
    source: clients[0],
  })
  await new Promise((resolve) => setImmediate(resolve))
  for (const client of clients) {
    await dispatch('message', {
      data: { type: 'PALDAWN_UPDATE_PREPARED', requestId: 'request-reload', ready: true },
      source: client,
    })
  }
  await reloadRequest
  assert.equal(skipWaitingCount, 1, 'an already-active worker retry must not invoke skipWaiting again')
  assert.deepEqual(clientMessages, [
    [
      { type: 'PALDAWN_PREPARE_UPDATE', requestId: 'request-reload' },
      { type: 'PALDAWN_UPDATE_ACTIVATED', requestId: 'request-reload' },
    ],
    [
      { type: 'PALDAWN_PREPARE_UPDATE', requestId: 'request-reload' },
      { type: 'PALDAWN_UPDATE_ACTIVATED', requestId: 'request-reload' },
    ],
  ], 'a safe retry after late activation must coordinate the active worker across the same client set')
}
