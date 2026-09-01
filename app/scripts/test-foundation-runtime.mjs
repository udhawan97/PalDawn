import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url))
const SETTINGS_KEY = 'paldawn:settings:v1'
const JOURNEY_KEY = 'paldawn:journey:v1'
const BOOKMARKS_KEY = 'paldawn:bookmarks:v1'
const WORKSPACE_KEY = 'paldawn:workspace:v1'
const RESET_KEY = 'paldawn:reset:v1'
const RESET_PENDING_KEY = 'paldawn:reset-pending:v1'

class MemoryStorage {
  #values = new Map()

  get length() { return this.#values.size }
  key(index) { return [...this.#values.keys()][index] ?? null }
  getItem(key) { return this.#values.get(key) ?? null }
  setItem(key, value) { this.#values.set(key, String(value)) }
  removeItem(key) { this.#values.delete(key) }
  clear() { this.#values.clear() }
}

class FailingStorage extends MemoryStorage {
  setItem() { throw new Error('storage blocked') }
}

const installBrowserStubs = (localStorage, dispatchedEvents) => {
  Object.defineProperty(globalThis, 'CustomEvent', {
    configurable: true,
    value: class CustomEvent {
      constructor(type, init = {}) {
        this.type = type
        this.detail = init.detail
      }
    },
  })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorage })
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { hardwareConcurrency: 8, onLine: true },
  })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      devicePixelRatio: 2,
      localStorage,
      dispatchEvent: (event) => {
        dispatchedEvents.push(event)
        return true
      },
      matchMedia: () => ({ matches: false }),
    },
  })
}

const withModules = async (localStorage, run) => {
  const dispatchedEvents = []
  installBrowserStubs(localStorage, dispatchedEvents)
  const server = await createServer({
    root: APP_ROOT,
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  })
  try {
    await run((path) => server.ssrLoadModule(path), dispatchedEvents)
  } finally {
    await server.close()
  }
}

await withModules(new MemoryStorage(), async (load) => {
  const journey = await load('/src/journey/journey.ts')
  assert.equal(journey.stageIdFromHash('#stage/portal'), 'portal')
  assert.equal(journey.stageIdFromHash('#stage/%E0%A4%A'), null)

  const localData = await load('/src/platform/localData.ts?tab=a')
  const otherTabLocalData = await load('/src/platform/localData.ts?tab=b')
  localStorage.setItem(JOURNEY_KEY, JSON.stringify({ progress: 4, narrationMode: 'invalid' }))
  assert.deepEqual(localData.loadJourneySession(), { progress: 1, narrationMode: 'guide' })

  localData.saveJourneySession({ progress: 0.42, narrationMode: 'engineering' })
  assert.equal(JSON.parse(localStorage.getItem(JOURNEY_KEY)).progress, 0.42)
  localData.saveStageBookmarks(['portal', 'portal', 'not-a-stage'])
  assert.deepEqual(localData.loadStageBookmarks(), ['portal'], 'unknown stage IDs must fail closed')
  localData.saveLearnerWorkspace({
    notes: { portal: 'Compare the handoff.', arrival: 'x'.repeat(1300), 'not-a-stage': 'reject' },
    checkpoints: ['portal', 'portal', 'not-a-stage'],
  })
  assert.deepEqual(localData.loadLearnerWorkspace().checkpoints, ['portal'])
  assert.deepEqual(Object.keys(localData.loadLearnerWorkspace().notes), ['portal', 'arrival'])
  assert.equal(localData.loadLearnerWorkspace().notes.arrival.length, 1200)
  otherTabLocalData.resetLocalData()
  localData.saveJourneySession({ progress: 0.75, narrationMode: 'guide' })
  localData.saveStageBookmarks(['arrival'])
  localData.saveLearnerWorkspace({ notes: { arrival: 'stale' }, checkpoints: ['arrival'] })
  assert.equal(localStorage.getItem(JOURNEY_KEY), null, 'reset must suppress a stale tab flush')
  assert.equal(localStorage.getItem(BOOKMARKS_KEY), null, 'reset must suppress stale bookmark writes')
  assert.equal(localStorage.getItem(WORKSPACE_KEY), null, 'reset must suppress stale workspace writes')
  assert.ok(localStorage.getItem(RESET_KEY), 'reset must publish a cross-tab token')
  localStorage.setItem(JOURNEY_KEY, JSON.stringify({ progress: 0.75, narrationMode: 'guide', resetToken: null }))
  assert.deepEqual(localData.loadJourneySession(), { progress: 0, narrationMode: 'guide' })
  assert.equal(localStorage.getItem(JOURNEY_KEY), null, 'stale-generation records must be removed on load')
})

await withModules(new MemoryStorage(), async (load, dispatchedEvents) => {
  const originalToken = 'generation-before-corrupt-fence'
  const originalJourney = JSON.stringify({ progress: 0.42, narrationMode: 'engineering', resetToken: originalToken })
  localStorage.setItem(RESET_KEY, originalToken)
  localStorage.setItem(JOURNEY_KEY, originalJourney)
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify({ stageIds: ['portal'], resetToken: originalToken }))
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify({ notes: { portal: 'Keep me' }, checkpoints: [], resetToken: originalToken }))
  localStorage.setItem(RESET_PENDING_KEY, '{"schemaVersion":')

  const localData = await load('/src/platform/localData.ts?corrupt-fence-reset')
  assert.equal(localStorage.getItem(JOURNEY_KEY), originalJourney, 'startup must not erase records behind a corrupt fence')
  assert.ok(
    dispatchedEvents.some(({ type, detail }) => type === 'paldawn:storage-failure' && detail?.key === RESET_KEY),
    'corrupt startup recovery must report that the reset fence needs attention',
  )
  assert.deepEqual(localData.loadJourneySession(), { progress: 0, narrationMode: 'guide' })
  assert.equal(localStorage.getItem(JOURNEY_KEY), originalJourney, 'a fail-closed read must preserve the fenced record')
  assert.equal(localData.saveJourneySession({ progress: 0.64, narrationMode: 'guide' }), false)
  assert.ok(
    dispatchedEvents.some(({ type, detail }) => type === 'paldawn:storage-failure' && detail?.key === JOURNEY_KEY),
    'rejected reads and writes must report their affected key',
  )
  assert.deepEqual(localData.getLocalDataRecoveryState(), {
    status: 'blocked',
    reason: 'corrupt-receipt',
  })
  const normalExport = localData.exportLocalData()
  assert.equal(normalExport.ok, false, 'a corrupt receipt must not produce a successful empty normal backup')
  assert.equal(normalExport.error, 'recovery-required')
  assert.deepEqual(normalExport.recovery, {
    status: 'blocked',
    reason: 'corrupt-receipt',
  })
  const rawExport = localData.exportRawLocalDataRecoveryBackup()
  assert.equal(rawExport.ok, true)
  const rawBackup = JSON.parse(rawExport.text)
  assert.equal(rawBackup.importable, false)
  assert.equal(rawBackup.records[JOURNEY_KEY], originalJourney)
  assert.equal(rawBackup.records[BOOKMARKS_KEY], localStorage.getItem(BOOKMARKS_KEY))
  assert.equal(rawBackup.records[WORKSPACE_KEY], localStorage.getItem(WORKSPACE_KEY))
  assert.equal(rawBackup.metadata[RESET_KEY], originalToken)
  assert.equal(rawBackup.metadata[RESET_PENDING_KEY], '{"schemaVersion":')

  const resetResult = localData.resetLocalData()
  assert.equal(resetResult.ok, true, 'an explicit reset may replace a corrupt fence')
  assert.equal(localStorage.getItem(JOURNEY_KEY), null)
  assert.equal(localStorage.getItem(BOOKMARKS_KEY), null)
  assert.equal(localStorage.getItem(WORKSPACE_KEY), null)
  assert.equal(JSON.parse(localStorage.getItem(RESET_PENDING_KEY)).token, resetResult.resetToken)
  await new Promise((resolve) => setTimeout(resolve, 300))
  assert.equal(
    localData.saveJourneySession({ progress: 0.64, narrationMode: 'guide' }),
    true,
    'a successful reset must release its in-page write guard even if the caller does not reload',
  )
  assert.equal(JSON.parse(localStorage.getItem(JOURNEY_KEY)).resetToken, resetResult.resetToken)
})

await withModules(new MemoryStorage(), async (load) => {
  localStorage.setItem(RESET_KEY, 'generation-before-corrupt-import')
  localStorage.setItem(JOURNEY_KEY, JSON.stringify({
    progress: 0.21,
    narrationMode: 'guide',
    resetToken: 'generation-before-corrupt-import',
  }))
  localStorage.setItem(RESET_PENDING_KEY, '{corrupt-json')
  const localData = await load('/src/platform/localData.ts?corrupt-fence-import')
  const parsed = localData.parseLocalDataImport(JSON.stringify({
    schema_version: 2,
    local_only: true,
    journey: { progress: 0.73, narrationMode: 'engineering' },
  }))
  assert.equal(parsed.ok, true)
  assert.equal(localData.replaceLocalDataFromImport(parsed.data).ok, true, 'an explicit import may replace a corrupt fence')
  const committedToken = localStorage.getItem(RESET_KEY)
  assert.equal(JSON.parse(localStorage.getItem(JOURNEY_KEY)).progress, 0.73)
  assert.deepEqual(
    (({ token, kind }) => ({ token, kind }))(JSON.parse(localStorage.getItem(RESET_PENDING_KEY))),
    { token: committedToken, kind: 'import' },
  )
  await new Promise((resolve) => setTimeout(resolve, 300))
  assert.equal(
    localData.saveJourneySession({ progress: 0.81, narrationMode: 'engineering' }),
    true,
    'a successful import must also release its in-page write guard',
  )
  assert.equal(JSON.parse(localStorage.getItem(JOURNEY_KEY)).resetToken, committedToken)
})

await withModules(new MemoryStorage(), async (load) => {
  const legacyToken = '123e4567-e89b-42d3-a456-426614174000'
  localStorage.setItem(RESET_KEY, 'generation-before-legacy-recovery')
  localStorage.setItem(JOURNEY_KEY, JSON.stringify({
    progress: 0.5,
    narrationMode: 'guide',
    resetToken: 'generation-before-legacy-recovery',
  }))
  localStorage.setItem(RESET_PENDING_KEY, legacyToken)
  await load('/src/platform/localData.ts?legacy-fence-recovery')
  assert.equal(localStorage.getItem(JOURNEY_KEY), null, 'the valid legacy token fence must still finish its reset')
  assert.equal(localStorage.getItem(RESET_KEY), legacyToken)
  assert.deepEqual(
    (({ token, kind }) => ({ token, kind }))(JSON.parse(localStorage.getItem(RESET_PENDING_KEY))),
    { token: legacyToken, kind: 'reset' },
  )
})

await withModules(new MemoryStorage(), async (load) => {
  const localData = await load('/src/platform/localData.ts?import')
  const exported = localData.exportLocalData()
  assert.equal(exported.ok, true)
  assert.equal(JSON.parse(exported.text).schema_version, 2)
  assert.equal(localData.parseLocalDataImport('{broken').ok, false)
  assert.equal(localData.parseLocalDataImport(JSON.stringify({ schema_version: 99, local_only: true })).ok, false)
  assert.equal(localData.parseLocalDataImport(JSON.stringify({ schema_version: 2, local_only: true })).ok, false)

  const parsed = localData.parseLocalDataImport(JSON.stringify({
    schema_version: 1,
    local_only: true,
    settings: { state: { qualityTier: 'low', reducedMotion: true, playbackRate: 1.5 }, version: 1 },
    journey: { progress: 4, narrationMode: 'engineering' },
    bookmarks: { stageIds: ['portal', 'not-a-stage'] },
    workspace: {
      notes: { portal: 'Imported note', 'not-a-stage': 'reject' },
      checkpoints: ['arrival', 'not-a-stage'],
    },
  }))
  assert.equal(parsed.ok, true)
  assert.equal(parsed.preview.progressPercent, 100)
  assert.deepEqual(parsed.data.bookmarks, ['portal'])
  assert.deepEqual(parsed.data.workspace, { notes: { portal: 'Imported note' }, checkpoints: ['arrival'] })
  assert.equal(localData.replaceLocalDataFromImport(parsed.data).ok, true)
  const resetToken = localStorage.getItem(RESET_KEY)
  assert.ok(resetToken)
  assert.deepEqual(
    (({ token, kind }) => ({ token, kind }))(JSON.parse(localStorage.getItem(RESET_PENDING_KEY))),
    { token: resetToken, kind: 'import' },
  )
  assert.equal(JSON.parse(localStorage.getItem(SETTINGS_KEY)).resetToken, resetToken)
  assert.equal(JSON.parse(localStorage.getItem(JOURNEY_KEY)).resetToken, resetToken)
  assert.equal(JSON.parse(localStorage.getItem(WORKSPACE_KEY)).resetToken, resetToken)
  assert.equal(JSON.parse(localStorage.getItem(SETTINGS_KEY)).state.qualityTier, 'low')
})

await withModules(new FailingStorage(), async (load) => {
  const localData = await load('/src/platform/localData.ts?blocked-import')
  const parsed = localData.parseLocalDataImport(JSON.stringify({
    schema_version: 2,
    local_only: true,
    workspace: { notes: { approach: 'Bounded' }, checkpoints: [] },
  }))
  assert.equal(parsed.ok, true)
  const outcome = localData.replaceLocalDataFromImport(parsed.data)
  assert.equal(outcome.ok, false, 'blocked storage must fail without reloading')
  assert.equal(outcome.recoveryPending, null, 'unreadable storage cannot promise a durable recovery plan')
})

await withModules(new MemoryStorage(), async (load) => {
  localStorage.setItem(JOURNEY_KEY, JSON.stringify({ progress: 0.42, narrationMode: 'engineering' }))
  const { useExperience } = await load('/src/state/experience.ts')
  assert.deepEqual(
    (({ entered, playing, progress, narrationMode }) => ({ entered, playing, progress, narrationMode }))(useExperience.getState()),
    { entered: false, playing: false, progress: 0.42, narrationMode: 'engineering' },
  )

  useExperience.getState().resume()
  assert.equal(useExperience.getState().playing, false, 'resume must never autoplay')
  useExperience.getState().start(false)
  const rateStart = useExperience.getState().progress
  useExperience.getState().advance(2, 0.5)
  assert.ok(
    Math.abs(useExperience.getState().progress - (rateStart + 1 / 42)) < 1e-10,
    '0.5x playback must advance one journey second for two wall-clock seconds',
  )
  useExperience.getState().restart()
  assert.equal(useExperience.getState().entered, false, 'restart must return to the introduction')
  assert.equal(JSON.parse(localStorage.getItem(JOURNEY_KEY)).progress, 0, 'restart must clear only progress')
  useExperience.getState().replay(true)
  for (let step = 0; step < 5; step += 1) useExperience.getState().togglePlayback(true)
  assert.equal(useExperience.getState().progress, 1, 'reduced-motion controls must reach completion')
  assert.equal(JSON.parse(localStorage.getItem(JOURNEY_KEY)).progress, 1)

  const { useExperience: restoredCompletion } = await load('/src/state/experience.ts?completed')
  assert.equal(restoredCompletion.getState().entered, true, 'persisted completion must restore its summary')
})

await withModules(new MemoryStorage(), async (load) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    state: { qualityTier: 'broken', captionScale: 'tiny', playbackRate: 4, highContrast: 'yes' },
    version: 1,
  }))
  const { useSettings } = await load('/src/state/settings.ts')
  assert.equal(useSettings.getState().qualityTier, 'auto')
  assert.equal(useSettings.getState().captionScale, 'standard')
  assert.equal(useSettings.getState().playbackRate, 1)
  assert.equal(useSettings.getState().highContrast, false)
})

console.log('foundation runtime checks: corrupt state safe · cross-tab reset durable · workspace/import bounded · completion restores')
