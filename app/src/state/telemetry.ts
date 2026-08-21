import { create } from 'zustand'

export interface RuntimeTelemetry {
  fps: number
  p95Ms: number
  drawCalls: number
  triangles: number
  samples: number
}

interface TelemetryState extends RuntimeTelemetry {
  update: (telemetry: RuntimeTelemetry) => void
}

export const useTelemetry = create<TelemetryState>()((set) => ({
  fps: 0,
  p95Ms: 0,
  drawCalls: 0,
  triangles: 0,
  samples: 0,
  update: (telemetry) => set(telemetry),
}))
