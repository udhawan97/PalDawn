import { JOURNEY } from '../journey/journey'

const PRODUCT = 'PalDawn'
const STORAGE_SCOPE = `paldawn:${JOURNEY.id}`
const LEGACY_JOURNEY_KEY = 'paldawn:journey:v1'
const LEGACY_BOOKMARKS_KEY = 'paldawn:bookmarks:v1'
const LEGACY_WORKSPACE_KEY = 'paldawn:workspace:v1'
const LEGACY_RESET_KEY = 'paldawn:reset:v1'

export const PALDAWN_SETTINGS_KEY = 'paldawn:settings:v1'
export const PALDAWN_JOURNEY_KEY = `${STORAGE_SCOPE}:session:v3`
export const PALDAWN_BOOKMARKS_KEY = `${STORAGE_SCOPE}:bookmarks:v3`
export const PALDAWN_WORKSPACE_KEY = `${STORAGE_SCOPE}:workspace:v3`
export const PALDAWN_RESET_KEY = `${STORAGE_SCOPE}:reset:v3`
export const MAX_STAGE_NOTE_LENGTH = 1200
export const MAX_LOCAL_DATA_IMPORT_BYTES = 256 * 1024

interface PersistedIdentity {
  product: typeof PRODUCT
  journeyId: string
  packId: string
  packDigest: string
}

export interface JourneySession {
  progress: number
  narrationMode: 'guide' | 'engineering'
}

interface PersistedJourneySession extends JourneySession, Partial<PersistedIdentity> {
  resetToken?: string | null
}

interface PersistedStageBookmarks extends Partial<PersistedIdentity> {
  stageIds?: unknown
  resetToken?: string | null
}

export interface LearnerWorkspace {
  notes: Record<string, string>
  checkpoints: string[]
}

interface PersistedLearnerWorkspace extends Partial<PersistedIdentity> {
  notes?: unknown
  checkpoints?: unknown
  resetToken?: string | null
}

interface ImportedSettings {
  qualityTier: 'auto' | 'high' | 'balanced' | 'low'
  reducedMotion: boolean
  comfortVignette: boolean
  highContrast: boolean
  showTelemetry: boolean
  captionScale: 'standard' | 'large' | 'largest'
  playbackRate: 0.5 | 1 | 1.5
}

export interface LocalDataImport {
  settings: ImportedSettings | null
  journey: JourneySession | null
  bookmarks: string[]
  workspace: LearnerWorkspace
}

export interface LocalDataImportPreview {
  progressPercent: number
  bookmarkCount: number
  noteCount: number
  checkpointCount: number
  hasSettings: boolean
  compatibility: 'current pack' | 'legacy backup migrated'
}

export type LocalDataImportResult =
  | { ok: true; data: LocalDataImport; preview: LocalDataImportPreview }
  | { ok: false; error: string }

let resetInProgress = false
let resetTokenAtLoad: string | null = null
const STAGE_IDS = new Set(JOURNEY.stages.map((stage) => stage.id))
const QUALITY_TIERS = new Set(['auto', 'high', 'balanced', 'low'])
const CAPTION_SCALES = new Set(['standard', 'large', 'largest'])
const PLAYBACK_RATES = new Set([0.5, 1, 1.5])

const identity = (): PersistedIdentity => ({
  product: PRODUCT,
  journeyId: JOURNEY.id,
  packId: JOURNEY.pack_id,
  packDigest: JOURNEY.pack_digest,
})

const hasCurrentIdentity = (value: object): boolean => {
  const candidate = value as Partial<PersistedIdentity>
  return candidate.product === PRODUCT &&
    candidate.journeyId === JOURNEY.id &&
    candidate.packId === JOURNEY.pack_id &&
    candidate.packDigest === JOURNEY.pack_digest
}

const emptyWorkspace = (): LearnerWorkspace => ({ notes: {}, checkpoints: [] })

const normalizeWorkspace = (value: unknown): LearnerWorkspace => {
  if (!value || typeof value !== 'object') return emptyWorkspace()
  const candidate = value as PersistedLearnerWorkspace
  const notes = candidate.notes && typeof candidate.notes === 'object'
    ? Object.fromEntries(Object.entries(candidate.notes as Record<string, unknown>)
      .filter(([id, note]) => STAGE_IDS.has(id) && typeof note === 'string')
      .map(([id, note]) => [id, (note as string).replaceAll('\0', '').slice(0, MAX_STAGE_NOTE_LENGTH)] as const)
      .filter(([, note]) => note.trim().length > 0))
    : {}
  const checkpoints = Array.isArray(candidate.checkpoints)
    ? [...new Set(candidate.checkpoints.filter(
      (id): id is string => typeof id === 'string' && STAGE_IDS.has(id),
    ))]
    : []
  return { notes, checkpoints }
}

const storage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

const readString = (key: string): string | null => {
  try {
    return storage()?.getItem(key) ?? null
  } catch {
    return null
  }
}

const readJson = (key: string): unknown => {
  try {
    const value = storage()?.getItem(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

const writeJson = (key: string, value: unknown): boolean => {
  try {
    const localStorage = storage()
    if (!localStorage) return false
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

resetTokenAtLoad = readString(PALDAWN_RESET_KEY) ?? readString(LEGACY_RESET_KEY)

const currentOrLegacy = (currentKey: string, legacyKey: string): { value: unknown; legacy: boolean } => {
  const current = readJson(currentKey)
  return current === null ? { value: readJson(legacyKey), legacy: true } : { value: current, legacy: false }
}

const recordIsCurrent = (value: unknown, legacy: boolean): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && (legacy || hasCurrentIdentity(value)))

export function loadJourneySession(): JourneySession {
  const source = currentOrLegacy(PALDAWN_JOURNEY_KEY, LEGACY_JOURNEY_KEY)
  if (!recordIsCurrent(source.value, source.legacy)) return { progress: 0, narrationMode: 'guide' }
  const candidate = source.value as Partial<PersistedJourneySession>
  const currentResetToken = readString(PALDAWN_RESET_KEY) ?? readString(LEGACY_RESET_KEY)
  if (currentResetToken !== null && candidate.resetToken !== currentResetToken) return { progress: 0, narrationMode: 'guide' }
  const progress = typeof candidate.progress === 'number' && Number.isFinite(candidate.progress)
    ? Math.min(1, Math.max(0, candidate.progress))
    : 0
  const narrationMode = candidate.narrationMode === 'engineering' ? 'engineering' : 'guide'
  const session = { progress, narrationMode } as JourneySession
  if (source.legacy) writeJson(PALDAWN_JOURNEY_KEY, { ...identity(), ...session, resetToken: resetTokenAtLoad })
  return session
}

export function saveJourneySession(session: JourneySession): void {
  if (resetInProgress || (readString(PALDAWN_RESET_KEY) ?? readString(LEGACY_RESET_KEY)) !== resetTokenAtLoad) return
  writeJson(PALDAWN_JOURNEY_KEY, {
    ...identity(),
    progress: Number(Math.min(1, Math.max(0, session.progress)).toFixed(4)),
    narrationMode: session.narrationMode,
    resetToken: resetTokenAtLoad,
  })
}

export function loadStageBookmarks(): string[] {
  const source = currentOrLegacy(PALDAWN_BOOKMARKS_KEY, LEGACY_BOOKMARKS_KEY)
  if (!recordIsCurrent(source.value, source.legacy)) return []
  const candidate = source.value as PersistedStageBookmarks
  const currentResetToken = readString(PALDAWN_RESET_KEY) ?? readString(LEGACY_RESET_KEY)
  if (currentResetToken !== null && candidate.resetToken !== currentResetToken) return []
  const stageIds = Array.isArray(candidate.stageIds)
    ? [...new Set(candidate.stageIds.filter(
      (id): id is string => typeof id === 'string' && STAGE_IDS.has(id),
    ))]
    : []
  if (source.legacy) writeJson(PALDAWN_BOOKMARKS_KEY, { ...identity(), stageIds, resetToken: resetTokenAtLoad })
  return stageIds
}

export function saveStageBookmarks(stageIds: string[]): void {
  if (resetInProgress || (readString(PALDAWN_RESET_KEY) ?? readString(LEGACY_RESET_KEY)) !== resetTokenAtLoad) return
  writeJson(PALDAWN_BOOKMARKS_KEY, {
    ...identity(),
    stageIds: [...new Set(stageIds.filter((id) => STAGE_IDS.has(id)))],
    resetToken: resetTokenAtLoad,
  })
}

export function loadLearnerWorkspace(): LearnerWorkspace {
  const source = currentOrLegacy(PALDAWN_WORKSPACE_KEY, LEGACY_WORKSPACE_KEY)
  if (!recordIsCurrent(source.value, source.legacy)) return emptyWorkspace()
  const candidate = source.value as PersistedLearnerWorkspace
  const currentResetToken = readString(PALDAWN_RESET_KEY) ?? readString(LEGACY_RESET_KEY)
  if (currentResetToken !== null && candidate.resetToken !== currentResetToken) return emptyWorkspace()
  const workspace = normalizeWorkspace(candidate)
  if (source.legacy) writeJson(PALDAWN_WORKSPACE_KEY, { ...identity(), ...workspace, resetToken: resetTokenAtLoad })
  return workspace
}

export function saveLearnerWorkspace(workspace: LearnerWorkspace): void {
  if (resetInProgress || (readString(PALDAWN_RESET_KEY) ?? readString(LEGACY_RESET_KEY)) !== resetTokenAtLoad) return
  writeJson(PALDAWN_WORKSPACE_KEY, {
    ...identity(),
    ...normalizeWorkspace(workspace),
    resetToken: resetTokenAtLoad,
  })
}

const normalizeImportedSettings = (value: unknown): ImportedSettings | null => {
  if (!value || typeof value !== 'object') return null
  const wrapper = value as { state?: unknown }
  if (!wrapper.state || typeof wrapper.state !== 'object') return null
  const state = wrapper.state as Record<string, unknown>
  return {
    qualityTier: QUALITY_TIERS.has(state.qualityTier as string)
      ? state.qualityTier as ImportedSettings['qualityTier']
      : 'auto',
    reducedMotion: typeof state.reducedMotion === 'boolean' ? state.reducedMotion : false,
    comfortVignette: typeof state.comfortVignette === 'boolean' ? state.comfortVignette : true,
    highContrast: typeof state.highContrast === 'boolean' ? state.highContrast : false,
    showTelemetry: typeof state.showTelemetry === 'boolean' ? state.showTelemetry : false,
    captionScale: CAPTION_SCALES.has(state.captionScale as string)
      ? state.captionScale as ImportedSettings['captionScale']
      : 'standard',
    playbackRate: PLAYBACK_RATES.has(state.playbackRate as number)
      ? state.playbackRate as ImportedSettings['playbackRate']
      : 1,
  }
}

const normalizeImportedJourney = (value: unknown): JourneySession | null => {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<JourneySession>
  const progress = typeof candidate.progress === 'number' && Number.isFinite(candidate.progress)
    ? Math.min(1, Math.max(0, candidate.progress))
    : 0
  return {
    progress,
    narrationMode: candidate.narrationMode === 'engineering' ? 'engineering' : 'guide',
  }
}

const incompatibleV3Backup = (candidate: Record<string, unknown>): string | null => {
  if (candidate.product !== PRODUCT) return 'That file was not created by PalDawn.'
  if (candidate.journey_id !== JOURNEY.id) return 'That backup belongs to a different PalDawn journey.'
  if (candidate.pack_id !== JOURNEY.pack_id || candidate.pack_digest !== JOURNEY.pack_digest) {
    return 'That backup belongs to a different version of this journey pack.'
  }
  return null
}

export function parseLocalDataImport(text: string): LocalDataImportResult {
  if (new Blob([text]).size > MAX_LOCAL_DATA_IMPORT_BYTES) {
    return { ok: false, error: 'That backup is larger than the 256 KiB local-data limit.' }
  }
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }
  if (!value || typeof value !== 'object') {
    return { ok: false, error: 'That file is not a PalDawn local-data backup.' }
  }
  const candidate = value as Record<string, unknown>
  const schemaVersion = candidate.schema_version
  if (candidate.local_only !== true || ![1, 2, 3].includes(schemaVersion as number)) {
    return { ok: false, error: 'That file does not use a supported PalDawn local-data schema.' }
  }
  if (schemaVersion === 3) {
    const incompatibility = incompatibleV3Backup(candidate)
    if (incompatibility) return { ok: false, error: incompatibility }
  }
  if (!['settings', 'journey', 'bookmarks', 'workspace'].some((key) => Object.hasOwn(candidate, key))) {
    return { ok: false, error: 'That backup does not contain any recognized PalDawn local data.' }
  }
  const workspace = normalizeWorkspace(candidate.workspace)
  const data: LocalDataImport = {
    settings: normalizeImportedSettings(candidate.settings),
    journey: normalizeImportedJourney(candidate.journey),
    bookmarks: Array.isArray((candidate.bookmarks as PersistedStageBookmarks | null)?.stageIds)
      ? [...new Set(((candidate.bookmarks as PersistedStageBookmarks).stageIds as unknown[]).filter(
        (id): id is string => typeof id === 'string' && STAGE_IDS.has(id),
      ))]
      : [],
    workspace,
  }
  return {
    ok: true,
    data,
    preview: {
      progressPercent: Math.round((data.journey?.progress ?? 0) * 100),
      bookmarkCount: data.bookmarks.length,
      noteCount: Object.keys(workspace.notes).length,
      checkpointCount: workspace.checkpoints.length,
      hasSettings: data.settings !== null,
      compatibility: schemaVersion === 3 ? 'current pack' : 'legacy backup migrated',
    },
  }
}

export function replaceLocalDataFromImport(data: LocalDataImport): boolean {
  resetInProgress = true
  const localStorage = storage()
  if (!localStorage) {
    resetInProgress = false
    return false
  }
  const keys = [
    PALDAWN_SETTINGS_KEY,
    PALDAWN_JOURNEY_KEY,
    PALDAWN_BOOKMARKS_KEY,
    PALDAWN_WORKSPACE_KEY,
    PALDAWN_RESET_KEY,
    LEGACY_JOURNEY_KEY,
    LEGACY_BOOKMARKS_KEY,
    LEGACY_WORKSPACE_KEY,
    LEGACY_RESET_KEY,
  ]
  const previous = new Map(keys.map((key) => [key, localStorage.getItem(key)]))
  try {
    const resetToken = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    resetTokenAtLoad = resetToken
    for (const key of keys) localStorage.removeItem(key)
    localStorage.setItem(PALDAWN_RESET_KEY, resetToken)
    if (data.settings) {
      localStorage.setItem(PALDAWN_SETTINGS_KEY, JSON.stringify({ state: data.settings, version: 1 }))
    }
    if (data.journey) {
      localStorage.setItem(PALDAWN_JOURNEY_KEY, JSON.stringify({ ...identity(), ...data.journey, resetToken }))
    }
    localStorage.setItem(PALDAWN_BOOKMARKS_KEY, JSON.stringify({
      ...identity(),
      stageIds: data.bookmarks,
      resetToken,
    }))
    localStorage.setItem(PALDAWN_WORKSPACE_KEY, JSON.stringify({
      ...identity(),
      ...normalizeWorkspace(data.workspace),
      resetToken,
    }))
    return true
  } catch {
    try {
      for (const [key, value] of previous) {
        if (value === null) localStorage.removeItem(key)
        else localStorage.setItem(key, value)
      }
    } catch {
      // A blocked store remains unavailable; the caller keeps the current page.
    }
    resetTokenAtLoad = readString(PALDAWN_RESET_KEY) ?? readString(LEGACY_RESET_KEY)
    resetInProgress = false
    return false
  }
}

export function exportLocalData(): string {
  return JSON.stringify({
    schema_version: 3,
    product: PRODUCT,
    journey_id: JOURNEY.id,
    pack_id: JOURNEY.pack_id,
    pack_digest: JOURNEY.pack_digest,
    local_only: true,
    settings: readJson(PALDAWN_SETTINGS_KEY),
    journey: readJson(PALDAWN_JOURNEY_KEY),
    bookmarks: readJson(PALDAWN_BOOKMARKS_KEY),
    workspace: readJson(PALDAWN_WORKSPACE_KEY),
  }, null, 2)
}

export function resetLocalData(): void {
  resetInProgress = true
  try {
    const localStorage = storage()
    const resetToken = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    localStorage?.setItem(PALDAWN_RESET_KEY, resetToken)
    resetTokenAtLoad = resetToken
    for (const key of [
      PALDAWN_SETTINGS_KEY,
      PALDAWN_JOURNEY_KEY,
      PALDAWN_BOOKMARKS_KEY,
      PALDAWN_WORKSPACE_KEY,
      LEGACY_JOURNEY_KEY,
      LEGACY_BOOKMARKS_KEY,
      LEGACY_WORKSPACE_KEY,
      LEGACY_RESET_KEY,
    ]) localStorage?.removeItem(key)
  } catch {
    // A blocked storage API already behaves like a reset state.
  }
}
