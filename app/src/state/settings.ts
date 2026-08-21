import { create } from 'zustand'

export type QualityTier = 'auto' | 'high' | 'balanced' | 'low'
export type ResolvedTier = Exclude<QualityTier, 'auto'>

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
  setQualityTier: (t: QualityTier) => void
  setReducedMotion: (v: boolean) => void
  setComfortVignette: (v: boolean) => void
  setHighContrast: (v: boolean) => void
  setShowTelemetry: (v: boolean) => void
}

export const useSettings = create<SettingsState>()((set) => ({
  qualityTier: 'auto',
  reducedMotion: prefersReducedMotion(),
  comfortVignette: true,
  highContrast: false,
  showTelemetry: false,
  setQualityTier: (qualityTier) => set({ qualityTier }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setComfortVignette: (comfortVignette) => set({ comfortVignette }),
  setHighContrast: (highContrast) => set({ highContrast }),
  setShowTelemetry: (showTelemetry) => set({ showTelemetry }),
}))
