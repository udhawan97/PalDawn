import { JOURNEY } from '../journey/journey'

export const PALDAWN_SETTINGS_KEY = 'paldawn:settings:v1'
export const PALDAWN_JOURNEY_KEY = 'paldawn:journey:v1'
export const PALDAWN_BOOKMARKS_KEY = 'paldawn:bookmarks:v1'
export const PALDAWN_WORKSPACE_KEY = 'paldawn:workspace:v1'
export const PALDAWN_RESET_KEY = 'paldawn:reset:v1'
export const PALDAWN_RESET_PENDING_KEY = 'paldawn:reset-pending:v1'
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

export type ResetLocalDataResult =
  | { ok: true; resetToken: string }
  | { ok: false; error: 'storage-unavailable' | 'reset-not-verified'; recoveryPending: PendingLocalDataRecovery | null }

export type ReplaceLocalDataResult =
  | { ok: true; resetToken: string }
  | { ok: false; error: 'storage-unavailable' | 'replace-not-verified'; recoveryPending: PendingLocalDataRecovery | null }

export type PendingLocalDataRecovery = {
  kind: 'reset' | 'import'
  token: string
}

const LOCAL_DATA_KEY_LIST = [
  PALDAWN_SETTINGS_KEY,
  PALDAWN_JOURNEY_KEY,
  PALDAWN_BOOKMARKS_KEY,
  PALDAWN_WORKSPACE_KEY,
] as const
type LocalDataKey = typeof LOCAL_DATA_KEY_LIST[number]
type LocalDataValues = Record<LocalDataKey, string | null>

interface PendingLocalDataTransaction {
  schemaVersion: 1
  token: string
  kind: 'reset' | 'import'
  desired: LocalDataValues
}

let resetInProgress = false
let resetTokenAtLoad: string | null = null
const LOCAL_DATA_KEYS = new Set<string>(LOCAL_DATA_KEY_LIST)
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

const readString = (key: string): string | null => {
  try {
    return storage()?.getItem(key) ?? null
  } catch {
    return null
  }
}

const newResetToken = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

const releaseTransactionGuard = (token: string): void => {
  // FlightDeck reloads synchronously after commit. Keep stale state from flushing
  // while WebKit schedules that navigation, but recover writes if reload is blocked.
  globalThis.setTimeout(() => {
    if (resetTokenAtLoad === token) resetInProgress = false
  }, 250)
}

const resetDesiredValues = (): LocalDataValues => ({
  [PALDAWN_SETTINGS_KEY]: null,
  [PALDAWN_JOURNEY_KEY]: null,
  [PALDAWN_BOOKMARKS_KEY]: null,
  [PALDAWN_WORKSPACE_KEY]: null,
})

const serializePendingTransaction = (transaction: PendingLocalDataTransaction): string =>
  JSON.stringify(transaction)

const LEGACY_RESET_TOKEN_PATTERN = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[0-9]{10,}-(?:0(?:\.\d+)?|[0-9]+(?:\.\d+)?e-\d+))$/i

const parsePendingTransaction = (raw: string | null): PendingLocalDataTransaction | null => {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<PendingLocalDataTransaction>
    if (value.schemaVersion !== 1 || typeof value.token !== 'string' || !value.token ||
      !['reset', 'import'].includes(value.kind ?? '') || !value.desired || typeof value.desired !== 'object') return null
    const desired = Object.fromEntries(LOCAL_DATA_KEY_LIST.map((key) => [key, value.desired?.[key]])) as LocalDataValues
    if (LOCAL_DATA_KEY_LIST.some((key) => desired[key] !== null && typeof desired[key] !== 'string')) return null
    if (LOCAL_DATA_KEY_LIST.some((key) => desired[key] !== null && valueGeneration(desired[key]) !== value.token)) return null
    return { schemaVersion: 1, token: value.token, kind: value.kind as 'reset' | 'import', desired }
  } catch {
    // The previous fence format stored only the reset token. Recover it as a reset.
    if (!LEGACY_RESET_TOKEN_PATTERN.test(raw)) return null
    return { schemaVersion: 1, token: raw, kind: 'reset', desired: resetDesiredValues() }
  }
}

const bindValueToGeneration = (value: string, resetToken: string | null): string | null => {
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return JSON.stringify({ ...parsed, resetToken })
  } catch {
    return null
  }
}

const valueGeneration = (value: string): string | null | undefined => {
  try {
    const parsed = JSON.parse(value) as { resetToken?: unknown }
    return parsed.resetToken === null || typeof parsed.resetToken === 'string'
      ? parsed.resetToken
      : undefined
  } catch {
    return undefined
  }
}

const applyDesiredValues = (localStorage: Storage, desired: LocalDataValues): void => {
  for (const key of LOCAL_DATA_KEY_LIST) {
    const value = desired[key]
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  }
  for (const key of LOCAL_DATA_KEY_LIST) {
    if (localStorage.getItem(key) !== desired[key]) throw new Error(`transaction did not verify ${key}`)
  }
}

const restoreTransactionDesiredValue = (
  localStorage: Storage,
  key: LocalDataKey,
): string | null => {
  const receipt = parsePendingTransaction(localStorage.getItem(PALDAWN_RESET_PENDING_KEY))
  const desired = receipt?.desired[key] ?? null
  if (desired === null) localStorage.removeItem(key)
  else localStorage.setItem(key, desired)
  if (localStorage.getItem(key) !== desired) throw new Error(`stale value could not be neutralized for ${key}`)
  return desired
}

const pendingFenceIsActive = (
  rawPending: string | null,
  committedReset: string | null,
): boolean => rawPending !== null && parsePendingTransaction(rawPending)?.token !== committedReset

export function getPendingLocalDataRecovery(): PendingLocalDataRecovery | null {
  const localStorage = storage()
  if (!localStorage) return null
  try {
    const pending = parsePendingTransaction(localStorage.getItem(PALDAWN_RESET_PENDING_KEY))
    const committedReset = localStorage.getItem(PALDAWN_RESET_KEY)
    return pending && pending.token !== committedReset
      ? { kind: pending.kind, token: pending.token }
      : null
  } catch {
    return null
  }
}

export function readLocalStorageValue(key: string): string | null {
  const localStorage = storage()
  if (!localStorage) {
    reportStorageFailure(key)
    return null
  }
  try {
    const value = localStorage.getItem(key)
    if (!LOCAL_DATA_KEYS.has(key)) return value
    const committedReset = localStorage.getItem(PALDAWN_RESET_KEY)
    const rawPending = localStorage.getItem(PALDAWN_RESET_PENDING_KEY)
    if (pendingFenceIsActive(rawPending, committedReset)) {
      reportStorageFailure(key)
      return null
    }
    if (!value) return value
    if (committedReset === null || valueGeneration(value) === committedReset) return value
    if (key === PALDAWN_SETTINGS_KEY && valueGeneration(value) === undefined &&
      (rawPending === null || !rawPending.trimStart().startsWith('{'))) {
      const migrated = bindValueToGeneration(value, committedReset)
      if (migrated === null) return null
      localStorage.setItem(key, migrated)
      if (localStorage.getItem(key) !== migrated) throw new Error('legacy settings generation could not be verified')
      return migrated
    }
    const restored = restoreTransactionDesiredValue(localStorage, key as LocalDataKey)
    reportStorageFailure(key)
    return restored
  } catch {
    reportStorageFailure(key)
    return null
  }
}

export function writeLocalStorageValue(key: string, value: string): boolean {
  const localStorage = storage()
  if (!localStorage) {
    reportStorageFailure(key)
    return false
  }
  try {
    const localDataKey = LOCAL_DATA_KEYS.has(key) ? key as LocalDataKey : null
    const savedValue = localDataKey ? bindValueToGeneration(value, resetTokenAtLoad) : value
    if (savedValue === null) {
      reportStorageFailure(key)
      return false
    }
    if (localDataKey) {
      const committedReset = localStorage.getItem(PALDAWN_RESET_KEY)
      const rawPending = localStorage.getItem(PALDAWN_RESET_PENDING_KEY)
      if (resetInProgress || committedReset !== resetTokenAtLoad || pendingFenceIsActive(rawPending, committedReset)) {
        reportStorageFailure(key)
        return false
      }
    }

    localStorage.setItem(key, savedValue)

    if (localDataKey) {
      const committedReset = localStorage.getItem(PALDAWN_RESET_KEY)
      const rawPending = localStorage.getItem(PALDAWN_RESET_PENDING_KEY)
      if (committedReset !== resetTokenAtLoad || pendingFenceIsActive(rawPending, committedReset)) {
        restoreTransactionDesiredValue(localStorage, localDataKey)
        reportStorageFailure(key)
        return false
      }
    }
    const saved = localStorage.getItem(key) === savedValue
    if (saved) reportStorageSuccess(key)
    else reportStorageFailure(key)
    return saved
  } catch {
    reportStorageFailure(key)
    return false
  }
}

const recoverInterruptedLocalDataTransaction = (): void => {
  const localStorage = storage()
  if (!localStorage) return
  let rawPending: string | null
  let committedReset: string | null
  try {
    rawPending = localStorage.getItem(PALDAWN_RESET_PENDING_KEY)
    committedReset = localStorage.getItem(PALDAWN_RESET_KEY)
  } catch {
    reportStorageFailure(PALDAWN_RESET_KEY)
    return
  }
  if (rawPending === null) return
  const parsed = parsePendingTransaction(rawPending)
  if (!parsed) {
    reportStorageFailure(PALDAWN_RESET_KEY)
    return
  }
  if (parsed.token === committedReset) return
  const transaction = parsed
  resetInProgress = true
  try {
    const serialized = serializePendingTransaction(transaction)
    localStorage.setItem(PALDAWN_RESET_PENDING_KEY, serialized)
    if (localStorage.getItem(PALDAWN_RESET_PENDING_KEY) !== serialized) throw new Error('recovery fence was not durable')
    applyDesiredValues(localStorage, transaction.desired)
    localStorage.setItem(PALDAWN_RESET_KEY, transaction.token)
    if (localStorage.getItem(PALDAWN_RESET_KEY) !== transaction.token) throw new Error('recovery commit was not durable')
    reportStorageSuccess(PALDAWN_RESET_KEY)
  } catch {
    reportStorageFailure(PALDAWN_RESET_KEY)
  } finally {
    resetInProgress = false
  }
}

recoverInterruptedLocalDataTransaction()
resetTokenAtLoad = readString(PALDAWN_RESET_KEY)

const readJson = (key: string): unknown => {
  try {
    const value = readLocalStorageValue(key)
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

const restoreStoredValue = (localStorage: Storage, key: string, value: string | null): void => {
  if (value === null) localStorage.removeItem(key)
  else localStorage.setItem(key, value)
}

const executeLocalDataTransaction = (
  kind: PendingLocalDataTransaction['kind'],
  desiredForToken: (token: string) => LocalDataValues,
): { resetToken: string | null; recoveryPending: PendingLocalDataRecovery | null } => {
  const localStorage = storage()
  if (!localStorage) {
    reportStorageFailure(PALDAWN_RESET_KEY)
    return { resetToken: null, recoveryPending: null }
  }

  resetInProgress = true
  const snapshotKeys = [...LOCAL_DATA_KEY_LIST, PALDAWN_RESET_KEY, PALDAWN_RESET_PENDING_KEY]
  const previous = new Map<string, string | null>()
  let transaction: PendingLocalDataTransaction | null = null
  try {
    for (const key of snapshotKeys) previous.set(key, localStorage.getItem(key))
    const committedReset = previous.get(PALDAWN_RESET_KEY) ?? null
    const rawPending = previous.get(PALDAWN_RESET_PENDING_KEY) ?? null
    const parsedPending = parsePendingTransaction(rawPending)
    if (rawPending !== null && parsedPending !== null && parsedPending.token !== committedReset) {
      throw new Error('another local-data transaction is pending')
    }

    const token = newResetToken()
    transaction = { schemaVersion: 1, token, kind, desired: desiredForToken(token) }
    const serialized = serializePendingTransaction(transaction)
    localStorage.setItem(PALDAWN_RESET_PENDING_KEY, serialized)
    if (localStorage.getItem(PALDAWN_RESET_PENDING_KEY) !== serialized) throw new Error('transaction fence was not durable')
    applyDesiredValues(localStorage, transaction.desired)
    localStorage.setItem(PALDAWN_RESET_KEY, token)
    if (localStorage.getItem(PALDAWN_RESET_KEY) !== token) throw new Error('transaction commit was not durable')
    resetTokenAtLoad = token
    releaseTransactionGuard(token)
    reportStorageSuccess(PALDAWN_RESET_KEY)
    return { resetToken: token, recoveryPending: null }
  } catch {
    let rollbackVerified = false
    try {
      if (previous.size === snapshotKeys.length) {
        for (const key of [...LOCAL_DATA_KEY_LIST, PALDAWN_RESET_KEY]) {
          restoreStoredValue(localStorage, key, previous.get(key) ?? null)
        }
        for (const key of [...LOCAL_DATA_KEY_LIST, PALDAWN_RESET_KEY]) {
          if (localStorage.getItem(key) !== (previous.get(key) ?? null)) throw new Error(`rollback did not verify ${key}`)
        }
        restoreStoredValue(localStorage, PALDAWN_RESET_PENDING_KEY, previous.get(PALDAWN_RESET_PENDING_KEY) ?? null)
        if (localStorage.getItem(PALDAWN_RESET_PENDING_KEY) !== (previous.get(PALDAWN_RESET_PENDING_KEY) ?? null)) {
          throw new Error('rollback fence did not verify')
        }
        rollbackVerified = true
      }
    } catch {
      // The active transaction below becomes the deterministic reload recovery plan.
    }
    if (!rollbackVerified && transaction) {
      try {
        const serialized = serializePendingTransaction(transaction)
        localStorage.setItem(PALDAWN_RESET_PENDING_KEY, serialized)
        if (localStorage.getItem(PALDAWN_RESET_PENDING_KEY) !== serialized) throw new Error('recovery receipt was not durable')
      } catch {
        // Storage remains unavailable; all generation-bound writes continue to fail closed.
      }
    }
    resetTokenAtLoad = readString(PALDAWN_RESET_KEY)
    resetInProgress = false
    reportStorageFailure(PALDAWN_RESET_KEY)
    let recoveryPending: PendingLocalDataRecovery | null = null
    try {
      recoveryPending = getPendingLocalDataRecovery()
    } catch {
      // Without a readable durable receipt the UI must not promise reload recovery.
    }
    return { resetToken: null, recoveryPending }
  }
}

export function replaceLocalDataFromImport(data: LocalDataImport): ReplaceLocalDataResult {
  if (!storage()) {
    reportStorageFailure(PALDAWN_RESET_KEY)
    return { ok: false, error: 'storage-unavailable', recoveryPending: null }
  }
  const outcome = executeLocalDataTransaction('import', (resetToken) => ({
    [PALDAWN_SETTINGS_KEY]: data.settings
      ? JSON.stringify({ state: data.settings, version: 1, resetToken })
      : null,
    [PALDAWN_JOURNEY_KEY]: data.journey
      ? JSON.stringify({ ...data.journey, resetToken })
      : null,
    [PALDAWN_BOOKMARKS_KEY]: JSON.stringify({ stageIds: data.bookmarks, resetToken }),
    [PALDAWN_WORKSPACE_KEY]: JSON.stringify({ ...normalizeWorkspace(data.workspace), resetToken }),
  }))
  return outcome.resetToken
    ? { ok: true, resetToken: outcome.resetToken }
    : { ok: false, error: 'replace-not-verified', recoveryPending: outcome.recoveryPending }
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

export function resetLocalData(): ResetLocalDataResult {
  if (!storage()) {
    reportStorageFailure(PALDAWN_RESET_KEY)
    return { ok: false, error: 'storage-unavailable', recoveryPending: null }
  }
  const outcome = executeLocalDataTransaction('reset', () => resetDesiredValues())
  return outcome.resetToken
    ? { ok: true, resetToken: outcome.resetToken }
    : { ok: false, error: 'reset-not-verified', recoveryPending: outcome.recoveryPending }
}
