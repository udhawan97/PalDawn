import journeyData from '../data/p0-journey.json'

export type NarrationMode = 'guide' | 'engineering'

export interface JourneyStage {
  id: string
  label: string
  level: string
  start: number
  end: number
  guide: string
  engineering: string
}

export interface JourneyDefinition {
  schema_version: number
  id: string
  title: string
  release: string
  duration_seconds: number
  content_status: 'synthetic_engineering_only'
  published_medical_claims: false
  reduced_motion_route: 'stage_steps'
  disclosure: string
  stages: JourneyStage[]
}

export const JOURNEY = journeyData as JourneyDefinition

export function clampProgress(progress: number): number {
  return Math.min(1, Math.max(0, progress))
}

export function stageIndexAt(progress: number): number {
  const value = clampProgress(progress)
  const index = JOURNEY.stages.findIndex(
    (stage) => value >= stage.start && value < stage.end,
  )
  return index === -1 ? JOURNEY.stages.length - 1 : index
}

export function stageAt(progress: number): JourneyStage {
  return JOURNEY.stages[stageIndexAt(progress)]
}

export function formatJourneyTime(progress: number): string {
  const elapsed = Math.round(clampProgress(progress) * JOURNEY.duration_seconds)
  const minutes = Math.floor(elapsed / 60)
  const seconds = String(elapsed % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}
