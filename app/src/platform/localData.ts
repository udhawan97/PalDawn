import { JOURNEY } from '../journey/journey'

export const PALDAWN_SETTINGS_KEY = 'paldawn:settings:v1'
export const PALDAWN_JOURNEY_KEY = 'paldawn:journey:v1'
export const PALDAWN_BOOKMARKS_KEY = 'paldawn:bookmarks:v1'
export const PALDAWN_WORKSPACE_KEY = 'paldawn:workspace:v1'
export const PALDAWN_RESET_KEY = 'paldawn:reset:v1'
export const PALDAWN_STORAGE_FAILURE_EVENT = 'paldawn:storage-failure'
export const PALDAWN_STORAGE_SUCCESS_EVENT = 'paldawn:storage-success'
export const MAX_STAGE_NOTE_LENGTH = 1200

export interface StorageFailureDetail {
  key: string
}

const failedStorageKeys = new Set<string>()

export interface JourneySession {
  progress: number
  narrationMode: 'guide' | 'engineering'
}

interface PersistedJourneySession extends JourneySession {
  resetToken?: string | null
}

interface PersistedStageBookmarks {
  stageIds?: unknown
  resetToken?: string | null
}

export interface LearnerWorkspace {
  notes: Record<string, string>
  checkpoints: string[]
}

interface PersistedLearnerWorkspace {
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
  textVoyagePreferred: boolean
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

const reportStorageFailure = (key: string): void => {
  if (typeof window === 'undefined') return
  failedStorageKeys.add(key)
  window.dispatchEvent(new CustomEvent<StorageFailureDetail>(PALDAWN_STORAGE_FAILURE_EVENT, {
    detail: { key },
  }))
}

const reportStorageSuccess = (key: string): void => {
  if (typeof window === 'undefined' || !failedStorageKeys.delete(key)) return
  window.dispatchEvent(new CustomEvent<StorageFailureDetail>(PALDAWN_STORAGE_SUCCESS_EVENT, {
    detail: { key },
  }))
}

export function writeLocalStorageValue(key: string, value: string): boolean {
  const localStorage = storage()
  if (!localStorage) {
    reportStorageFailure(key)
    return false
  }
  try {
    localStorage.setItem(key, value)
    const saved = localStorage.getItem(key) === value
    if (saved) reportStorageSuccess(key)
    else reportStorageFailure(key)
    return saved
  } catch {
    reportStorageFailure(key)
    return false
  }
}

const readString = (key: string): string | null => {
  try {
    return storage()?.getItem(key) ?? null
  } catch {
    return null
  }
}

resetTokenAtLoad = readString(PALDAWN_RESET_KEY)

const readJson = (key: string): unknown => {
  try {
    const value = storage()?.getItem(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

export function loadJourneySession(): JourneySession {
  const value = readJson(PALDAWN_JOURNEY_KEY)
  if (!value || typeof value !== 'object') return { progress: 0, narrationMode: 'guide' }

  const candidate = value as Partial<PersistedJourneySession>
  const currentResetToken = readString(PALDAWN_RESET_KEY)
  if (currentResetToken !== null && candidate.resetToken !== currentResetToken) {
    try {
      storage()?.removeItem(PALDAWN_JOURNEY_KEY)
    } catch {
      // The stale record is still ignored when storage cannot be changed.
    }
    return { progress: 0, narrationMode: 'guide' }
  }
  const progress = typeof candidate.progress === 'number' && Number.isFinite(candidate.progress)
    ? Math.min(1, Math.max(0, candidate.progress))
    : 0
  const narrationMode = candidate.narrationMode === 'engineering' ? 'engineering' : 'guide'
  return { progress, narrationMode }
}

export function saveJourneySession(session: JourneySession): boolean {
  if (resetInProgress || readString(PALDAWN_RESET_KEY) !== resetTokenAtLoad) return false
  return writeLocalStorageValue(PALDAWN_JOURNEY_KEY, JSON.stringify({
    progress: Number(Math.min(1, Math.max(0, session.progress)).toFixed(4)),
    narrationMode: session.narrationMode,
    resetToken: resetTokenAtLoad,
  }))
}

export function loadStageBookmarks(): string[] {
  const value = readJson(PALDAWN_BOOKMARKS_KEY)
  if (!value || typeof value !== 'object') return []

  const candidate = value as PersistedStageBookmarks
  const currentResetToken = readString(PALDAWN_RESET_KEY)
  if (currentResetToken !== null && candidate.resetToken !== currentResetToken) {
    try {
      storage()?.removeItem(PALDAWN_BOOKMARKS_KEY)
    } catch {
      // The stale record is still ignored when storage cannot be changed.
    }
    return []
  }
  if (!Array.isArray(candidate.stageIds)) return []
  return [...new Set(candidate.stageIds.filter(
    (id): id is string => typeof id === 'string' && STAGE_IDS.has(id),
  ))]
}

export function saveStageBookmarks(stageIds: string[]): boolean {
  if (resetInProgress || readString(PALDAWN_RESET_KEY) !== resetTokenAtLoad) return false
  return writeLocalStorageValue(PALDAWN_BOOKMARKS_KEY, JSON.stringify({
    stageIds: [...new Set(stageIds.filter((id) => STAGE_IDS.has(id)))],
    resetToken: resetTokenAtLoad,
  }))
}

export function loadLearnerWorkspace(): LearnerWorkspace {
  const value = readJson(PALDAWN_WORKSPACE_KEY)
  if (!value || typeof value !== 'object') return emptyWorkspace()
  const candidate = value as PersistedLearnerWorkspace
  const currentResetToken = readString(PALDAWN_RESET_KEY)
  if (currentResetToken !== null && candidate.resetToken !== currentResetToken) {
    try {
      storage()?.removeItem(PALDAWN_WORKSPACE_KEY)
    } catch {
      // The stale record is still ignored when storage cannot be changed.
    }
    return emptyWorkspace()
  }
  return normalizeWorkspace(candidate)
}

export function saveLearnerWorkspace(workspace: LearnerWorkspace): boolean {
  if (resetInProgress || readString(PALDAWN_RESET_KEY) !== resetTokenAtLoad) return false
  const normalized = normalizeWorkspace(workspace)
  return writeLocalStorageValue(PALDAWN_WORKSPACE_KEY, JSON.stringify({
    ...normalized,
    resetToken: resetTokenAtLoad,
  }))
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
    textVoyagePreferred: typeof state.textVoyagePreferred === 'boolean' ? state.textVoyagePreferred : false,
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

export function parseLocalDataImport(text: string): LocalDataImportResult {
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
  if (candidate.local_only !== true || ![1, 2].includes(candidate.schema_version as number)) {
    return { ok: false, error: 'That file does not use a supported PalDawn local-data schema.' }
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
  ]
  const previous = new Map(keys.map((key) => [key, localStorage.getItem(key)]))
  try {
    const resetToken = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    resetTokenAtLoad = resetToken
    localStorage.setItem(PALDAWN_RESET_KEY, resetToken)
    localStorage.removeItem(PALDAWN_SETTINGS_KEY)
    localStorage.removeItem(PALDAWN_JOURNEY_KEY)
    localStorage.removeItem(PALDAWN_BOOKMARKS_KEY)
    localStorage.removeItem(PALDAWN_WORKSPACE_KEY)
    if (data.settings) {
      localStorage.setItem(PALDAWN_SETTINGS_KEY, JSON.stringify({ state: data.settings, version: 1 }))
    }
    if (data.journey) {
      localStorage.setItem(PALDAWN_JOURNEY_KEY, JSON.stringify({ ...data.journey, resetToken }))
    }
    localStorage.setItem(PALDAWN_BOOKMARKS_KEY, JSON.stringify({
      stageIds: data.bookmarks,
      resetToken,
    }))
    localStorage.setItem(PALDAWN_WORKSPACE_KEY, JSON.stringify({
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
    resetTokenAtLoad = readString(PALDAWN_RESET_KEY)
    resetInProgress = false
    return false
  }
}

export function exportLocalData(): string {
  return JSON.stringify({
    schema_version: 2,
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
    localStorage?.removeItem(PALDAWN_SETTINGS_KEY)
    localStorage?.removeItem(PALDAWN_JOURNEY_KEY)
    localStorage?.removeItem(PALDAWN_BOOKMARKS_KEY)
    localStorage?.removeItem(PALDAWN_WORKSPACE_KEY)
  } catch {
    // A blocked storage API already behaves like a reset state.
  }
}
