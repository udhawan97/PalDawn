import type { RuntimeTelemetry } from '../state/telemetry'
import type { PlaybackRate, QualityTier, ResolvedTier } from '../state/settings'

interface DiagnosticInput {
  qualityTier: QualityTier
  resolvedTier: ResolvedTier
  reducedMotion: boolean
  highContrast: boolean
  textVoyage: boolean
  playbackRate: PlaybackRate
  bookmarkCount: number
  noteCount: number
  checkpointCount: number
  telemetry: RuntimeTelemetry
}

export function diagnosticReport(input: DiagnosticInput): string {
  return JSON.stringify({
    report: 'PalDawn local diagnostics',
    base_release: '0.1.0',
    build: 'foundation+3',
    local_only: true,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    device_pixel_ratio: window.devicePixelRatio,
    browser: navigator.userAgent,
    online: navigator.onLine,
    quality_selection: input.qualityTier,
    quality_resolved: input.resolvedTier,
    reduced_motion: input.reducedMotion,
    high_contrast: input.highContrast,
    text_voyage: input.textVoyage,
    playback_rate: input.playbackRate,
    saved_stage_count: input.bookmarkCount,
    private_note_count: input.noteCount,
    personal_checkpoint_count: input.checkpointCount,
    runtime_estimate: input.telemetry,
  }, null, 2)
}
