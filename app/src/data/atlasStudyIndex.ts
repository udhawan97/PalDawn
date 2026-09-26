import { DISEASES } from './diseases'
import { atlasStudyRecordId, type AtlasStudyData, type AtlasStudyRecord } from '../platform/localData'

export type AtlasStudyFilter = 'all' | 'saved' | 'open' | 'studied' | 'notes' | 'unavailable'

export interface AtlasStudyIndexEntry {
  id: string
  diseaseId: string | null
  diseaseTitle: string
  diseaseShortTitle: string
  stepId: string | null
  stepIndex: number | null
  stepLabel: string
  phase: string
  record: AtlasStudyRecord
  unavailable: boolean
}

export interface AtlasStudyCounts {
  active: number
  saved: number
  open: number
  studied: number
  notes: number
  unavailable: number
}

const hasActivity = (record: AtlasStudyRecord): boolean =>
  record.saved || record.studied || Boolean(record.note.trim())

export function buildAtlasStudyIndex(study: AtlasStudyData): AtlasStudyIndexEntry[] {
  const knownIds = new Set<string>()
  const entries = DISEASES.flatMap((disease) => disease.steps.flatMap((step, stepIndex) => {
    const id = atlasStudyRecordId(disease.id, step.id)
    knownIds.add(id)
    const record = study.records[id]
    if (!record || !hasActivity(record)) return []
    return [{
      id,
      diseaseId: disease.id,
      diseaseTitle: disease.title,
      diseaseShortTitle: disease.shortTitle,
      stepId: step.id,
      stepIndex,
      stepLabel: step.label,
      phase: step.phase,
      record,
      unavailable: false,
    }]
  }))

  const unavailable = Object.entries(study.records).flatMap(([id, record]) => (
    knownIds.has(id) || !hasActivity(record) ? [] : [{
      id,
      diseaseId: null,
      diseaseTitle: 'Unavailable Atlas record',
      diseaseShortTitle: 'Unavailable',
      stepId: null,
      stepIndex: null,
      stepLabel: id,
      phase: 'Preserved for recovery',
      record,
      unavailable: true,
    }]
  ))

  return [...entries, ...unavailable]
}

export function countAtlasStudy(entries: AtlasStudyIndexEntry[]): AtlasStudyCounts {
  return {
    active: entries.length,
    saved: entries.filter((entry) => entry.record.saved).length,
    open: entries.filter((entry) => entry.record.saved && !entry.record.studied).length,
    studied: entries.filter((entry) => entry.record.studied).length,
    notes: entries.filter((entry) => Boolean(entry.record.note.trim())).length,
    unavailable: entries.filter((entry) => entry.unavailable).length,
  }
}

export function filterAtlasStudy(
  entries: AtlasStudyIndexEntry[],
  filter: AtlasStudyFilter,
  query: string,
): AtlasStudyIndexEntry[] {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean)
  return entries.filter((entry) => {
    const matchesFilter = filter === 'all'
      || (filter === 'saved' && entry.record.saved)
      || (filter === 'open' && entry.record.saved && !entry.record.studied)
      || (filter === 'studied' && entry.record.studied)
      || (filter === 'notes' && Boolean(entry.record.note.trim()))
      || (filter === 'unavailable' && entry.unavailable)
    if (!matchesFilter) return false
    const searchable = `${entry.diseaseTitle} ${entry.diseaseShortTitle} ${entry.stepLabel} ${entry.phase} ${entry.record.note}`.toLocaleLowerCase()
    return terms.every((term) => searchable.includes(term))
  })
}

export const nextOpenSavedAtlasStep = (entries: AtlasStudyIndexEntry[]): AtlasStudyIndexEntry | null =>
  entries.find((entry) => !entry.unavailable && entry.record.saved && !entry.record.studied) ?? null
