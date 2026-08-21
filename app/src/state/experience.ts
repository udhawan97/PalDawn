import { create } from 'zustand'
import { JOURNEY, clampProgress, stageIndexAt, type NarrationMode } from '../journey/journey'

export type OpenPanel = 'mission' | 'transcript' | 'settings' | null

interface ExperienceState {
  entered: boolean
  playing: boolean
  progress: number
  narrationMode: NarrationMode
  openPanel: OpenPanel
  start: (reducedMotion: boolean) => void
  pause: () => void
  togglePlayback: (reducedMotion: boolean) => void
  replay: (reducedMotion: boolean) => void
  advance: (deltaSeconds: number) => void
  setProgress: (progress: number) => void
  setNarrationMode: (mode: NarrationMode) => void
  moveStage: (direction: -1 | 1) => void
  setOpenPanel: (panel: OpenPanel) => void
}

const stageEntryProgress = (index: number): number => {
  const stage = JOURNEY.stages[Math.min(JOURNEY.stages.length - 1, Math.max(0, index))]
  return Math.min(1, stage.start + 0.002)
}

export const useExperience = create<ExperienceState>()((set, get) => ({
  entered: false,
  playing: false,
  progress: 0,
  narrationMode: 'guide',
  openPanel: null,
  start: (reducedMotion) =>
    set({ entered: true, playing: !reducedMotion, progress: 0.002 }),
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
  replay: (reducedMotion) =>
    set({ entered: true, playing: !reducedMotion, progress: 0.002, openPanel: null }),
  advance: (deltaSeconds) => {
    const { playing, progress } = get()
    if (!playing) return
    const next = clampProgress(progress + deltaSeconds / JOURNEY.duration_seconds)
    set({ progress: next, playing: next < 1 })
  },
  setProgress: (progress) => set({ progress: clampProgress(progress), playing: false }),
  setNarrationMode: (narrationMode) => set({ narrationMode }),
  moveStage: (direction) => {
    const current = stageIndexAt(get().progress)
    const target = Math.min(JOURNEY.stages.length - 1, Math.max(0, current + direction))
    set({ entered: true, playing: false, progress: stageEntryProgress(target) })
  },
  setOpenPanel: (openPanel) => set({ openPanel }),
}))
