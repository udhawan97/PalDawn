import { create } from 'zustand'
import { diseaseById } from '../data/diseases'

export type AtlasNarration = 'plain' | 'clinical'

interface AtlasState {
  open: boolean
  selectedDiseaseId: string
  stepIndex: number
  narration: AtlasNarration
  exploded: boolean
  rotationPaused: boolean
  guideOpen: boolean
  selectedBodyPart: string | null
  openDisease: (id?: string) => void
  close: () => void
  setDisease: (id: string) => void
  setStep: (index: number) => void
  moveStep: (direction: -1 | 1) => void
  setNarration: (narration: AtlasNarration) => void
  toggleExploded: () => void
  toggleRotation: () => void
  setGuideOpen: (open: boolean) => void
  setSelectedBodyPart: (id: string | null) => void
}

interface AtlasHistorySnapshot {
  diseaseId: string
  stepIndex: number
}

const ATLAS_HISTORY_KEY = 'paldawnAtlas'

const historySnapshot = (value: unknown): AtlasHistorySnapshot | null => {
  if (!value || typeof value !== 'object') return null
  const snapshot = (value as Record<string, unknown>)[ATLAS_HISTORY_KEY]
  if (!snapshot || typeof snapshot !== 'object') return null
  const diseaseId = (snapshot as Record<string, unknown>).diseaseId
  const stepIndex = (snapshot as Record<string, unknown>).stepIndex
  if (typeof diseaseId !== 'string' || typeof stepIndex !== 'number' || !Number.isFinite(stepIndex)) return null
  return { diseaseId, stepIndex }
}

const boundedStep = (diseaseId: string, stepIndex: number): number => {
  const disease = diseaseById(diseaseId)
  return Math.min(disease.steps.length - 1, Math.max(0, Math.trunc(stepIndex)))
}

const atlasHistoryState = (diseaseId: string, stepIndex: number): Record<string, unknown> => ({
  ...(window.history.state && typeof window.history.state === 'object' ? window.history.state : {}),
  [ATLAS_HISTORY_KEY]: { diseaseId, stepIndex: boundedStep(diseaseId, stepIndex) },
})

const updateAtlasHistory = (mode: 'push' | 'replace', diseaseId: string, stepIndex: number): void => {
  if (typeof window === 'undefined') return
  const nextState = atlasHistoryState(diseaseId, stepIndex)
  if (mode === 'push') window.history.pushState(nextState, '', window.location.href)
  else window.history.replaceState(nextState, '', window.location.href)
}

export const useAtlas = create<AtlasState>()((set, get) => ({
  open: false,
  selectedDiseaseId: 'diabetes',
  stepIndex: 0,
  narration: 'plain',
  exploded: false,
  rotationPaused: false,
  guideOpen: false,
  selectedBodyPart: null,
  openDisease: (requestedDiseaseId = 'diabetes') => {
    const current = get()
    const selectedDiseaseId = diseaseById(requestedDiseaseId).id
    const stepIndex = current.selectedDiseaseId === selectedDiseaseId
      ? boundedStep(selectedDiseaseId, current.stepIndex)
      : 0
    updateAtlasHistory(current.open ? 'replace' : 'push', selectedDiseaseId, stepIndex)
    set({ open: true, selectedDiseaseId, stepIndex, guideOpen: false, selectedBodyPart: null })
  },
  close: () => {
    const ownsHistoryEntry = typeof window !== 'undefined' && historySnapshot(window.history.state) !== null
    set({ open: false, guideOpen: false, selectedBodyPart: null })
    if (ownsHistoryEntry) window.history.back()
  },
  setDisease: (requestedDiseaseId) => {
    const selectedDiseaseId = diseaseById(requestedDiseaseId).id
    updateAtlasHistory('replace', selectedDiseaseId, 0)
    set({ selectedDiseaseId, stepIndex: 0, selectedBodyPart: null })
  },
  setStep: (stepIndex) => {
    const selectedDiseaseId = get().selectedDiseaseId
    const nextStep = boundedStep(selectedDiseaseId, stepIndex)
    updateAtlasHistory('replace', selectedDiseaseId, nextStep)
    set({ stepIndex: nextStep, selectedBodyPart: null })
  },
  moveStep: (direction) => {
    const current = get()
    const stepIndex = boundedStep(current.selectedDiseaseId, current.stepIndex + direction)
    updateAtlasHistory('replace', current.selectedDiseaseId, stepIndex)
    set({ stepIndex, selectedBodyPart: null })
  },
  setNarration: (narration) => set({ narration }),
  toggleExploded: () => set((state) => ({ exploded: !state.exploded })),
  toggleRotation: () => set((state) => ({ rotationPaused: !state.rotationPaused })),
  setGuideOpen: (guideOpen) => set({ guideOpen }),
  setSelectedBodyPart: (selectedBodyPart) => set({ selectedBodyPart }),
}))

export const syncAtlasFromHistory = (value: unknown): void => {
  const snapshot = historySnapshot(value)
  if (!snapshot) {
    useAtlas.setState({ open: false, guideOpen: false, selectedBodyPart: null })
    return
  }
  const disease = diseaseById(snapshot.diseaseId)
  useAtlas.setState({
    open: true,
    selectedDiseaseId: disease.id,
    stepIndex: boundedStep(disease.id, snapshot.stepIndex),
    guideOpen: false,
    selectedBodyPart: null,
  })
}
