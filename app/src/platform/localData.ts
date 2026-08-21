import { JOURNEY } from '../journey/journey'

export const PALDAWN_SETTINGS_KEY = 'paldawn:settings:v1'
export const PALDAWN_JOURNEY_KEY = 'paldawn:journey:v1'
export const PALDAWN_BOOKMARKS_KEY = 'paldawn:bookmarks:v1'
export const PALDAWN_RESET_KEY = 'paldawn:reset:v1'

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

let resetInProgress = false
let resetTokenAtLoad: string | null = null
const STAGE_IDS = new Set(JOURNEY.stages.map((stage) => stage.id))

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

export function saveJourneySession(session: JourneySession): void {
  if (resetInProgress || readString(PALDAWN_RESET_KEY) !== resetTokenAtLoad) return
  try {
    storage()?.setItem(PALDAWN_JOURNEY_KEY, JSON.stringify({
      progress: Number(Math.min(1, Math.max(0, session.progress)).toFixed(4)),
      narrationMode: session.narrationMode,
      resetToken: resetTokenAtLoad,
    }))
  } catch {
    // Persistence is an enhancement. The voyage remains fully usable without it.
  }
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

export function saveStageBookmarks(stageIds: string[]): void {
  if (resetInProgress || readString(PALDAWN_RESET_KEY) !== resetTokenAtLoad) return
  try {
    storage()?.setItem(PALDAWN_BOOKMARKS_KEY, JSON.stringify({
      stageIds: [...new Set(stageIds.filter((id) => STAGE_IDS.has(id)))],
      resetToken: resetTokenAtLoad,
    }))
  } catch {
    // Bookmarks remain usable in memory when persistence is blocked.
  }
}

export function exportLocalData(): string {
  return JSON.stringify({
    schema_version: 1,
    local_only: true,
    settings: readJson(PALDAWN_SETTINGS_KEY),
    journey: readJson(PALDAWN_JOURNEY_KEY),
    bookmarks: readJson(PALDAWN_BOOKMARKS_KEY),
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
  } catch {
    // A blocked storage API already behaves like a reset state.
  }
}
