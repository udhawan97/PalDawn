import { create } from 'zustand'
import {
  MAX_ATLAS_STUDY_RECORDS,
  MAX_STAGE_NOTE_LENGTH,
  atlasStudyRecordId,
  emptyAtlasStudy,
  loadAtlasStudy,
  saveAtlasStudy,
  type AtlasStudyData,
  type AtlasStudyPosition,
  type AtlasStudyRecord,
} from '../platform/localData'

interface AtlasStudyState extends AtlasStudyData {
  persisted: boolean
  status: string
  setPosition: (position: AtlasStudyPosition) => boolean
  setNarration: (narration: AtlasStudyData['narration']) => boolean
  updateRecord: (diseaseId: string, stepId: string, update: Partial<AtlasStudyRecord>) => boolean
  replaceFromStorage: () => void
  persist: () => boolean
}

const currentData = (state: AtlasStudyState): AtlasStudyData => ({
  narration: state.narration,
  lastPosition: state.lastPosition,
  records: state.records,
})

const persistData = (data: AtlasStudyData): boolean => saveAtlasStudy(data)

export const useAtlasStudy = create<AtlasStudyState>()((set, get) => ({
  ...loadAtlasStudy(),
  persisted: true,
  status: '',
  setPosition: (lastPosition) => {
    const data = { ...currentData(get()), lastPosition }
    const persisted = persistData(data)
    set({ ...data, persisted, status: persisted ? '' : 'Atlas study changes are kept in this tab, but browser storage is unavailable.' })
    return persisted
  },
  setNarration: (narration) => {
    const data = { ...currentData(get()), narration }
    const persisted = persistData(data)
    set({ ...data, persisted, status: persisted ? '' : 'Explanation depth changed for this tab, but browser storage is unavailable.' })
    return persisted
  },
  updateRecord: (diseaseId, stepId, update) => {
    const state = get()
    const id = atlasStudyRecordId(diseaseId, stepId)
    const previous = state.records[id] ?? { saved: false, studied: false, note: '' }
    const nextRecord: AtlasStudyRecord = {
      saved: update.saved ?? previous.saved,
      studied: update.studied ?? previous.studied,
      note: (update.note ?? previous.note).replaceAll('\0', '').slice(0, MAX_STAGE_NOTE_LENGTH),
    }
    const records = { ...state.records }
    if (!nextRecord.saved && !nextRecord.studied && !nextRecord.note.trim()) delete records[id]
    else records[id] = nextRecord
    const trimmedRecords = Object.keys(records).length > MAX_ATLAS_STUDY_RECORDS
      ? Object.fromEntries(Object.entries(records).slice(-MAX_ATLAS_STUDY_RECORDS))
      : records
    const data = { ...currentData(state), records: trimmedRecords }
    const persisted = persistData(data)
    set({ ...data, persisted, status: persisted ? 'Study saved on this device.' : 'Study changes are kept in this tab, but browser storage is unavailable.' })
    return persisted
  },
  replaceFromStorage: () => {
    if (!get().persisted) {
      set({ status: 'Another tab changed Atlas study data. Your unsaved draft remains in this tab; copy it before reloading.' })
      return
    }
    set({ ...loadAtlasStudy(), persisted: true, status: 'Atlas study updated from another tab.' })
  },
  persist: () => {
    const persisted = persistData(currentData(get()))
    set({ persisted, status: persisted ? '' : 'Atlas study changes are kept in this tab, but browser storage is unavailable.' })
    return persisted
  },
}))

export function resetAtlasStudyMemory(): void {
  useAtlasStudy.setState({ ...emptyAtlasStudy(), persisted: true, status: '' })
}
