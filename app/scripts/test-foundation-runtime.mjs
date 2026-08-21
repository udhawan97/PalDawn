import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url))
const SETTINGS_KEY = 'paldawn:settings:v1'
const JOURNEY_KEY = 'paldawn:journey:v1'
const BOOKMARKS_KEY = 'paldawn:bookmarks:v1'
const WORKSPACE_KEY = 'paldawn:workspace:v1'
const RESET_KEY = 'paldawn:reset:v1'

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

const installBrowserStubs = (localStorage) => {
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
      matchMedia: () => ({ matches: false }),
    },
  })
}

const withModules = async (localStorage, run) => {
  installBrowserStubs(localStorage)
  const server = await createServer({
    root: APP_ROOT,
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  })
  try {
    await run((path) => server.ssrLoadModule(path))
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

await withModules(new MemoryStorage(), async (load) => {
  const localData = await load('/src/platform/localData.ts?import')
  assert.equal(JSON.parse(localData.exportLocalData()).schema_version, 2)
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
  assert.equal(localData.replaceLocalDataFromImport(parsed.data), true)
  const resetToken = localStorage.getItem(RESET_KEY)
  assert.ok(resetToken)
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
  assert.equal(localData.replaceLocalDataFromImport(parsed.data), false, 'blocked storage must fail without reloading')
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
