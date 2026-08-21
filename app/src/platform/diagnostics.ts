import type { RuntimeTelemetry } from '../state/telemetry'
import type { QualityTier, ResolvedTier } from '../state/settings'

interface DiagnosticInput {
  qualityTier: QualityTier
  resolvedTier: ResolvedTier
  reducedMotion: boolean
  highContrast: boolean
  textVoyage: boolean
  telemetry: RuntimeTelemetry
}

export function diagnosticReport(input: DiagnosticInput): string {
  return JSON.stringify({
    report: 'PalDawn local diagnostics',
    base_release: '0.1.0',
    build: 'foundation+',
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
    runtime_estimate: input.telemetry,
  }, null, 2)
}
