export const PALDAWN_ANATOMY_STUDY_KEY = 'paldawn:anatomy-study:v1'
export const MAX_ANATOMY_READING_ITEMS = 150
export const MAX_ANATOMY_SAVED_STRUCTURES = 750
export const MAX_ANATOMY_BACKUP_BYTES = 512 * 1024

export interface AnatomyReadingItem {
  id: string
  read: boolean
}

export interface AnatomyStudyData {
  queue: AnatomyReadingItem[]
  saved: Record<'male' | 'female', string[]>
  lastSelection: Record<'male' | 'female', string | null>
}

export type AnatomyStudyImportResult =
  | { ok: true; data: AnatomyStudyData }
  | { ok: false; error: string }

export const emptyAnatomyStudy = (): AnatomyStudyData => ({
  queue: [],
  saved: { male: [], female: [] },
  lastSelection: { male: null, female: null },
})

const safeId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9:._-]{0,179}$/.test(value)

const uniqueIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter(safeId))].slice(0, MAX_ANATOMY_SAVED_STRUCTURES)
}

export function normalizeAnatomyStudy(value: unknown): AnatomyStudyData {
  if (!value || typeof value !== 'object') return emptyAnatomyStudy()
  const candidate = value as { queue?: unknown; saved?: unknown; lastSelection?: unknown }
  const seenQueue = new Set<string>()
  const queue = Array.isArray(candidate.queue)
    ? candidate.queue.flatMap((entry) => {
      const item = typeof entry === 'string' ? { id: entry, read: false } : entry
      if (!item || typeof item !== 'object') return []
      const id = (item as { id?: unknown }).id
      if (!safeId(id) || seenQueue.has(id)) return []
      seenQueue.add(id)
      return [{ id, read: (item as { read?: unknown }).read === true }]
    }).slice(0, MAX_ANATOMY_READING_ITEMS)
    : []
  const saved = candidate.saved && typeof candidate.saved === 'object'
    ? candidate.saved as { male?: unknown; female?: unknown }
    : {}
  const lastSelection = candidate.lastSelection && typeof candidate.lastSelection === 'object'
    ? candidate.lastSelection as { male?: unknown; female?: unknown }
    : {}
  return {
    queue,
    saved: {
      male: uniqueIds(saved.male),
      female: uniqueIds(saved.female),
    },
    lastSelection: {
      male: safeId(lastSelection.male) ? lastSelection.male : null,
      female: safeId(lastSelection.female) ? lastSelection.female : null,
    },
  }
}

export function loadAnatomyStudy(): { data: AnatomyStudyData; storageAvailable: boolean } {
  try {
    const raw = window.localStorage.getItem(PALDAWN_ANATOMY_STUDY_KEY)
    return { data: raw ? normalizeAnatomyStudy(JSON.parse(raw)) : emptyAnatomyStudy(), storageAvailable: true }
  } catch {
    return { data: emptyAnatomyStudy(), storageAvailable: false }
  }
}

export function saveAnatomyStudy(data: AnatomyStudyData): boolean {
  try {
    const normalized = normalizeAnatomyStudy(data)
    const value = JSON.stringify(normalized)
    window.localStorage.setItem(PALDAWN_ANATOMY_STUDY_KEY, value)
    return window.localStorage.getItem(PALDAWN_ANATOMY_STUDY_KEY) === value
  } catch {
    return false
  }
}

export function clearAnatomyStudy(): boolean {
  try {
    window.localStorage.removeItem(PALDAWN_ANATOMY_STUDY_KEY)
    return window.localStorage.getItem(PALDAWN_ANATOMY_STUDY_KEY) === null
  } catch {
    return false
  }
}

export function exportAnatomyStudy(data: AnatomyStudyData): string {
  return JSON.stringify({
    schema_version: 2,
    local_only: true,
    anatomy_preview: true,
    study: normalizeAnatomyStudy(data),
  }, null, 2)
}

export function parseAnatomyStudyImport(text: string): AnatomyStudyImportResult {
  if (new TextEncoder().encode(text).byteLength > MAX_ANATOMY_BACKUP_BYTES) {
    return { ok: false, error: 'That Anatomy study backup is too large.' }
  }
  try {
    const value = JSON.parse(text) as Record<string, unknown>
    if (![1, 2].includes(value.schema_version as number) || value.local_only !== true || value.anatomy_preview !== true || !Object.hasOwn(value, 'study')) {
      return { ok: false, error: 'That file is not a supported PalDawn Anatomy study backup.' }
    }
    return { ok: true, data: normalizeAnatomyStudy(value.study) }
  } catch {
    return { ok: false, error: 'That Anatomy study backup is not valid JSON.' }
  }
}
