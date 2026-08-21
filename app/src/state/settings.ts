import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { PALDAWN_SETTINGS_KEY } from '../platform/localData'

export type QualityTier = 'auto' | 'high' | 'balanced' | 'low'
export type ResolvedTier = Exclude<QualityTier, 'auto'>
export type CaptionScale = 'standard' | 'large' | 'largest'
export type PlaybackRate = 0.5 | 1 | 1.5

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Quality-tier SHELL only. This placeholder heuristic is deliberately naive;
 * a measured GPU probe + benchmark-backed tiering is deferred backlog work
 * (see docs/PLAN.md, performance-proof protocol). Do not treat these tiers as
 * validated performance claims.
 */
export function resolveTier(t: QualityTier): ResolvedTier {
  if (t !== 'auto') return t
  if (typeof window === 'undefined') return 'balanced'
  const cores = navigator.hardwareConcurrency ?? 4
  const dpr = window.devicePixelRatio ?? 1
  if (cores >= 8 && dpr >= 2) return 'high'
  if (cores <= 4 && dpr <= 1) return 'low'
  return 'balanced'
}

export const TIER_DPR: Record<ResolvedTier, number> = {
  high: 1.75,
  balanced: 1.25,
  low: 1,
}

interface SettingsState {
  qualityTier: QualityTier
  reducedMotion: boolean
  comfortVignette: boolean
  highContrast: boolean
  showTelemetry: boolean
  captionScale: CaptionScale
  playbackRate: PlaybackRate
  setQualityTier: (t: QualityTier) => void
  setReducedMotion: (v: boolean) => void
  setComfortVignette: (v: boolean) => void
  setHighContrast: (v: boolean) => void
  setShowTelemetry: (v: boolean) => void
  setCaptionScale: (v: CaptionScale) => void
  setPlaybackRate: (v: PlaybackRate) => void
}

type PersistedSettings = Pick<SettingsState,
  | 'qualityTier'
  | 'reducedMotion'
  | 'comfortVignette'
  | 'highContrast'
  | 'showTelemetry'
  | 'captionScale'
  | 'playbackRate'
>

const qualityTiers: readonly QualityTier[] = ['auto', 'high', 'balanced', 'low']
const captionScales: readonly CaptionScale[] = ['standard', 'large', 'largest']
const playbackRates: readonly PlaybackRate[] = [0.5, 1, 1.5]

const mergePersistedSettings = (persisted: unknown, current: SettingsState): SettingsState => {
  const value = persisted && typeof persisted === 'object'
    ? persisted as Partial<PersistedSettings>
    : {}
  return {
    ...current,
    qualityTier: qualityTiers.includes(value.qualityTier as QualityTier)
      ? value.qualityTier as QualityTier
      : current.qualityTier,
    reducedMotion: typeof value.reducedMotion === 'boolean' ? value.reducedMotion : current.reducedMotion,
    comfortVignette: typeof value.comfortVignette === 'boolean' ? value.comfortVignette : current.comfortVignette,
    highContrast: typeof value.highContrast === 'boolean' ? value.highContrast : current.highContrast,
    showTelemetry: typeof value.showTelemetry === 'boolean' ? value.showTelemetry : current.showTelemetry,
    captionScale: captionScales.includes(value.captionScale as CaptionScale)
      ? value.captionScale as CaptionScale
      : current.captionScale,
    playbackRate: playbackRates.includes(value.playbackRate as PlaybackRate)
      ? value.playbackRate as PlaybackRate
      : current.playbackRate,
  }
}

const safeStorage: StateStorage = {
  getItem: (name) => {
    try { return localStorage.getItem(name) } catch { return null }
  },
  setItem: (name, value) => {
    try { localStorage.setItem(name, value) } catch { /* Settings remain in memory. */ }
  },
  removeItem: (name) => {
    try { localStorage.removeItem(name) } catch { /* A blocked store is already empty. */ }
  },
}

export const useSettings = create<SettingsState>()(persist<SettingsState, [], [], PersistedSettings>((set) => ({
  qualityTier: 'auto',
  reducedMotion: prefersReducedMotion(),
  comfortVignette: true,
  highContrast: false,
  showTelemetry: false,
  captionScale: 'standard',
  playbackRate: 1,
  setQualityTier: (qualityTier) => set({ qualityTier }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setComfortVignette: (comfortVignette) => set({ comfortVignette }),
  setHighContrast: (highContrast) => set({ highContrast }),
  setShowTelemetry: (showTelemetry) => set({ showTelemetry }),
  setCaptionScale: (captionScale) => set({ captionScale }),
  setPlaybackRate: (playbackRate) => set({ playbackRate }),
}), {
  name: PALDAWN_SETTINGS_KEY,
  version: 1,
  storage: createJSONStorage(() => safeStorage),
  merge: mergePersistedSettings,
  partialize: (state) => ({
    qualityTier: state.qualityTier,
    reducedMotion: state.reducedMotion,
    comfortVignette: state.comfortVignette,
    highContrast: state.highContrast,
    showTelemetry: state.showTelemetry,
    captionScale: state.captionScale,
    playbackRate: state.playbackRate,
  }),
}))
