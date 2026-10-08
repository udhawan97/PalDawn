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
  storageConflict: boolean
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

const conflictStatus = 'Another tab changed Atlas study data. Your unsaved draft remains in this tab; copy or export it before reloading.'
const storageUnavailableStatus = 'Atlas study changes are kept in this tab, but browser storage is unavailable.'

export const useAtlasStudy = create<AtlasStudyState>()((set, get) => {
  // Every writer, including update preparation, must respect an unresolved conflict.
  const persistData = (data: AtlasStudyData, successStatus = '', failureStatus = storageUnavailableStatus): boolean => {
    const storageConflict = get().storageConflict
    const persisted = !storageConflict && saveAtlasStudy(data)
    set({ ...data, persisted, status: storageConflict ? conflictStatus : persisted ? successStatus : failureStatus })
    return persisted
  }

  return {
    ...loadAtlasStudy(),
    persisted: true,
    storageConflict: false,
    status: '',
    setPosition: (lastPosition) => {
      const data = { ...currentData(get()), lastPosition }
      return persistData(data)
    },
    setNarration: (narration) => {
      const data = { ...currentData(get()), narration }
      return persistData(data, '', 'Explanation depth changed for this tab, but browser storage is unavailable.')
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
      else {
        if (!Object.hasOwn(records, id) && Object.keys(records).length >= MAX_ATLAS_STUDY_RECORDS) {
          set({ status: `Atlas study is full (${MAX_ATLAS_STUDY_RECORDS} records). Export your study, then clear an existing record's note, saved mark, and studied mark before adding another.` })
          return false
        }
        records[id] = nextRecord
      }
      const data = { ...currentData(state), records }
      return persistData(data, 'Study saved on this device.', 'Study changes are kept in this tab, but browser storage is unavailable.')
    },
    replaceFromStorage: () => {
      if (!get().persisted) {
        set({ storageConflict: true, status: conflictStatus })
        return
      }
      set({ ...loadAtlasStudy(), persisted: true, storageConflict: false, status: 'Atlas study updated from another tab.' })
    },
    persist: () => {
      return persistData(currentData(get()))
    },
  }
})

export function resetAtlasStudyMemory(): void {
  useAtlasStudy.setState({ ...emptyAtlasStudy(), persisted: true, storageConflict: false, status: '' })
}
