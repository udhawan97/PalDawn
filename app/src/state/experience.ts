import { create } from 'zustand'
import { JOURNEY, clampProgress, stageIndexAt, type NarrationMode } from '../journey/journey'
import { loadJourneySession, saveJourneySession } from '../platform/localData'

export type OpenPanel = 'mission' | 'transcript' | 'settings' | 'help' | null

interface ExperienceState {
  entered: boolean
  playing: boolean
  progress: number
  narrationMode: NarrationMode
  openPanel: OpenPanel
  start: (reducedMotion: boolean) => void
  resume: () => void
  pause: () => void
  togglePlayback: (reducedMotion: boolean) => void
  replay: (reducedMotion: boolean) => void
  advance: (deltaSeconds: number) => void
  setProgress: (progress: number) => void
  setNarrationMode: (mode: NarrationMode) => void
  moveStage: (direction: -1 | 1) => void
  setOpenPanel: (panel: OpenPanel) => void
}

const initialSession = loadJourneySession()

const stageEntryProgress = (index: number): number => {
  const stage = JOURNEY.stages[Math.min(JOURNEY.stages.length - 1, Math.max(0, index))]
  return Math.min(1, stage.start + 0.002)
}

export const useExperience = create<ExperienceState>()((set, get) => ({
  entered: false,
  playing: false,
  progress: initialSession.progress,
  narrationMode: initialSession.narrationMode,
  openPanel: null,
  start: (reducedMotion) => {
    const progress = 0.002
    saveJourneySession({ progress, narrationMode: get().narrationMode })
    set({ entered: true, playing: !reducedMotion, progress })
  },
  resume: () => set({ entered: true, playing: false, openPanel: null }),
  pause: () => set({ playing: false }),
  togglePlayback: (reducedMotion) => {
    if (reducedMotion) {
      get().moveStage(1)
      return
    }
    const { entered, playing, progress } = get()
    if (!entered || progress >= 1) {
      set({ entered: true, playing: true, progress: 0.002 })
      return
    }
    set({ playing: !playing })
  },
  replay: (reducedMotion) => {
    const progress = 0.002
    saveJourneySession({ progress, narrationMode: get().narrationMode })
    set({ entered: true, playing: !reducedMotion, progress, openPanel: null })
  },
  advance: (deltaSeconds) => {
    const { playing, progress } = get()
    if (!playing) return
    const next = clampProgress(progress + deltaSeconds / JOURNEY.duration_seconds)
    set({ progress: next, playing: next < 1 })
  },
  setProgress: (progress) => {
    const next = clampProgress(progress)
    saveJourneySession({ progress: next, narrationMode: get().narrationMode })
    set({ entered: true, progress: next, playing: false })
  },
  setNarrationMode: (narrationMode) => {
    saveJourneySession({ progress: get().progress, narrationMode })
    set({ narrationMode })
  },
  moveStage: (direction) => {
    const current = stageIndexAt(get().progress)
    if (direction === 1 && current === JOURNEY.stages.length - 1) {
      const progress = 1
      saveJourneySession({ progress, narrationMode: get().narrationMode })
      set({ entered: true, playing: false, progress })
      return
    }
    const target = Math.min(JOURNEY.stages.length - 1, Math.max(0, current + direction))
    const progress = stageEntryProgress(target)
    saveJourneySession({ progress, narrationMode: get().narrationMode })
    set({ entered: true, playing: false, progress })
  },
  setOpenPanel: (openPanel) => set({ openPanel }),
}))
