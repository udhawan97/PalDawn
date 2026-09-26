import { create } from 'zustand'
import { diseaseById, type BodyPartId } from '../data/diseases'
import { atlasHash, parseAtlasHash } from '../journey/atlasRoute'

export type AtlasNarration = 'plain' | 'clinical'

interface AtlasFocusReturn {
  element: HTMLElement | null
  selector: string | null
}

interface AtlasCloseOptions {
  navigateHistory?: boolean
  restoreFocus?: boolean
}

interface AtlasState {
  open: boolean
  selectedDiseaseId: string
  stepIndex: number
  narration: AtlasNarration
  exploded: boolean
  rotationPaused: boolean
  guideOpen: boolean
  researchOpen: boolean
  selectedBodyPart: string | null
  focusReturn: AtlasFocusReturn | null
  openDisease: (id?: string, focusSelector?: string) => void
  close: (options?: AtlasCloseOptions) => void
  setDisease: (id: string) => void
  setTarget: (diseaseId: string, stepIndex: number, bodyPartId?: BodyPartId | null) => void
  setStep: (index: number) => void
  moveStep: (direction: -1 | 1) => void
  setNarration: (narration: AtlasNarration) => void
  toggleExploded: () => void
  toggleRotation: () => void
  setGuideOpen: (open: boolean) => void
  setResearchOpen: (open: boolean) => void
  setSelectedBodyPart: (id: string | null) => void
}

interface AtlasHistorySnapshot {
  diseaseId: string
  stepIndex: number
  bodyPartId: string | null
  owned: boolean
}

const ATLAS_HISTORY_KEY = 'paldawnAtlas'
let atlasHistoryClosePending = false

const historySnapshot = (value: unknown): AtlasHistorySnapshot | null => {
  if (!value || typeof value !== 'object') return null
  const snapshot = (value as Record<string, unknown>)[ATLAS_HISTORY_KEY]
  if (!snapshot || typeof snapshot !== 'object') return null
  const diseaseId = (snapshot as Record<string, unknown>).diseaseId
  const stepIndex = (snapshot as Record<string, unknown>).stepIndex
  const bodyPartId = (snapshot as Record<string, unknown>).bodyPartId
  if (typeof diseaseId !== 'string' || typeof stepIndex !== 'number' || !Number.isFinite(stepIndex)) return null
  if (bodyPartId !== undefined && bodyPartId !== null && typeof bodyPartId !== 'string') return null
  return { diseaseId, stepIndex, bodyPartId: typeof bodyPartId === 'string' ? bodyPartId : null, owned: (snapshot as Record<string, unknown>).owned === true }
}

const boundedStep = (diseaseId: string, stepIndex: number): number => {
  const disease = diseaseById(diseaseId)
  return Math.min(disease.steps.length - 1, Math.max(0, Math.trunc(stepIndex)))
}

const atlasHistoryState = (diseaseId: string, stepIndex: number, bodyPartId: string | null, owned: boolean): Record<string, unknown> => ({
  ...(window.history.state && typeof window.history.state === 'object' ? window.history.state : {}),
  [ATLAS_HISTORY_KEY]: { diseaseId, stepIndex: boundedStep(diseaseId, stepIndex), bodyPartId, owned },
})

const updateAtlasHistory = (mode: 'push' | 'replace', diseaseId: string, stepIndex: number, bodyPartId: string | null = null): void => {
  if (typeof window === 'undefined') return
  const current = historySnapshot(window.history.state)
  const owned = mode === 'push' ? true : current?.owned === true
  const nextState = atlasHistoryState(diseaseId, stepIndex, bodyPartId, owned)
  const url = new URL(window.location.href)
  url.hash = atlasHash(diseaseId, stepIndex, boundedBodyPart(diseaseId, stepIndex, bodyPartId)).slice(1)
  if (mode === 'push') window.history.pushState(nextState, '', url)
  else window.history.replaceState(nextState, '', url)
}

const captureFocusReturn = (selector?: string): AtlasFocusReturn | null => {
  if (typeof document === 'undefined') return null
  const element = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
    ? document.activeElement
    : null
  const fallbackSelector = selector ?? (element?.closest('.curriculum-catalog') ? '.curriculum-launch' : null)
  return element || fallbackSelector ? { element, selector: fallbackSelector } : null
}

const restoreFocus = (target: AtlasFocusReturn | null): void => {
  if (!target || typeof window === 'undefined') return
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    const connectedElement = target.element?.isConnected && target.element.getClientRects().length
      ? target.element
      : null
    const element = connectedElement ?? (target.selector ? document.querySelector<HTMLElement>(target.selector) : null)
    if (element?.getClientRects().length) element.focus({ preventScroll: true })
  }))
}

const boundedBodyPart = (diseaseId: string, stepIndex: number, bodyPartId: string | null): BodyPartId | null => {
  if (!bodyPartId) return null
  const disease = diseaseById(diseaseId)
  return disease.steps[boundedStep(disease.id, stepIndex)].bodyParts.includes(bodyPartId as BodyPartId)
    ? bodyPartId as BodyPartId
    : null
}

export const useAtlas = create<AtlasState>()((set, get) => ({
  open: false,
  selectedDiseaseId: 'diabetes',
  stepIndex: 0,
  narration: 'plain',
  exploded: false,
  rotationPaused: false,
  guideOpen: false,
  researchOpen: false,
  selectedBodyPart: null,
  focusReturn: null,
  openDisease: (requestedDiseaseId = 'diabetes', focusSelector) => {
    const current = get()
    const selectedDiseaseId = diseaseById(requestedDiseaseId).id
    const stepIndex = current.selectedDiseaseId === selectedDiseaseId
      ? boundedStep(selectedDiseaseId, current.stepIndex)
      : 0
    updateAtlasHistory(current.open ? 'replace' : 'push', selectedDiseaseId, stepIndex)
    set({
      open: true,
      selectedDiseaseId,
      stepIndex,
      guideOpen: false,
      researchOpen: false,
      selectedBodyPart: null,
      focusReturn: current.open ? current.focusReturn : captureFocusReturn(focusSelector),
    })
  },
  close: (options = {}) => {
    const current = get()
    const snapshot = typeof window !== 'undefined' ? historySnapshot(window.history.state) : null
    const ownsHistoryEntry = snapshot?.owned === true
    if (options.navigateHistory !== false && ownsHistoryEntry) {
      if (atlasHistoryClosePending) return
      atlasHistoryClosePending = true
      window.history.back()
      return
    }
    if (typeof window !== 'undefined' && parseAtlasHash(window.location.hash).kind !== 'none') {
      const url = new URL(window.location.href)
      url.hash = ''
      const state = window.history.state && typeof window.history.state === 'object'
        ? { ...window.history.state } as Record<string, unknown>
        : {}
      delete state[ATLAS_HISTORY_KEY]
      window.history.replaceState(state, '', url)
    }
    set({ open: false, guideOpen: false, researchOpen: false, selectedBodyPart: null })
    if (current.open && options.restoreFocus !== false) restoreFocus(current.focusReturn)
  },
  setDisease: (requestedDiseaseId) => {
    const selectedDiseaseId = diseaseById(requestedDiseaseId).id
    updateAtlasHistory('replace', selectedDiseaseId, 0)
    set({ selectedDiseaseId, stepIndex: 0, selectedBodyPart: null })
  },
  setTarget: (requestedDiseaseId, requestedStepIndex, requestedBodyPartId = null) => {
    const selectedDiseaseId = diseaseById(requestedDiseaseId).id
    const stepIndex = boundedStep(selectedDiseaseId, requestedStepIndex)
    const selectedBodyPart = boundedBodyPart(selectedDiseaseId, stepIndex, requestedBodyPartId)
    updateAtlasHistory('replace', selectedDiseaseId, stepIndex, selectedBodyPart)
    set({ selectedDiseaseId, stepIndex, selectedBodyPart })
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
  setResearchOpen: (researchOpen) => set({ researchOpen }),
  setSelectedBodyPart: (requestedBodyPart) => {
    const current = get()
    const selectedBodyPart = boundedBodyPart(current.selectedDiseaseId, current.stepIndex, requestedBodyPart)
    updateAtlasHistory('replace', current.selectedDiseaseId, current.stepIndex, selectedBodyPart)
    set({ selectedBodyPart })
  },
}))

export const syncAtlasFromHistory = (value: unknown): 'opened' | 'closed' | 'invalid' => {
  atlasHistoryClosePending = false
  let snapshot = historySnapshot(value)
  const route = typeof window === 'undefined' ? { kind: 'none' as const } : parseAtlasHash(window.location.hash)
  if (!snapshot && route.kind === 'invalid') {
    useAtlas.setState({ open: false, guideOpen: false, researchOpen: false, selectedBodyPart: null })
    return 'invalid'
  }
  if (!snapshot && route.kind === 'valid') {
    snapshot = {
      diseaseId: route.route.diseaseId,
      stepIndex: route.route.stepIndex,
      bodyPartId: route.route.bodyPartId,
      owned: false,
    }
    window.history.replaceState(
      atlasHistoryState(snapshot.diseaseId, snapshot.stepIndex, snapshot.bodyPartId, false),
      '',
      window.location.href,
    )
  }
  if (!snapshot) {
    if (useAtlas.getState().open) useAtlas.getState().close({ navigateHistory: false })
    else useAtlas.setState({ guideOpen: false, researchOpen: false, selectedBodyPart: null })
    return 'closed'
  }
  const disease = diseaseById(snapshot.diseaseId)
  const stepIndex = boundedStep(disease.id, snapshot.stepIndex)
  useAtlas.setState({
    open: true,
    selectedDiseaseId: disease.id,
    stepIndex,
    guideOpen: false,
    researchOpen: false,
    selectedBodyPart: boundedBodyPart(disease.id, stepIndex, snapshot.bodyPartId),
  })
  return 'opened'
}
