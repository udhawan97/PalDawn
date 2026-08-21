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

export function progressForStageId(id: string): number | null {
  const stage = JOURNEY.stages.find((candidate) => candidate.id === id)
  return stage ? Math.min(1, stage.start + 0.002) : null
}

export function stageIdFromHash(hash: string): string | null {
  try {
    const id = decodeURIComponent(hash.replace(/^#(?:stage\/)?/, '')).trim()
    return JOURNEY.stages.some((stage) => stage.id === id) ? id : null
  } catch {
    return null
  }
}

export function stageUrl(id: string): string {
  const url = new URL(window.location.href)
  url.hash = `stage/${encodeURIComponent(id)}`
  return url.toString()
}

export function transcriptText(mode: NarrationMode): string {
  const track = mode === 'guide' ? 'Guide' : 'Engineering'
  const stages = JOURNEY.stages.map((stage, index) =>
    `${index + 1}. ${stage.label} — ${stage.level}\n${stage[mode]}`,
  )
  return [
    `PalDawn — ${JOURNEY.title} — ${track} transcript`,
    JOURNEY.disclosure,
    ...stages,
    'Education only; never diagnosis. Suspected heart attack? Contact local emergency services immediately.',
  ].join('\n\n')
}

export function formatJourneyTime(progress: number): string {
  const elapsed = Math.round(clampProgress(progress) * JOURNEY.duration_seconds)
  const minutes = Math.floor(elapsed / 60)
  const seconds = String(elapsed % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

export function formatDuration(secondsTotal: number): string {
  const minutes = Math.floor(secondsTotal / 60)
  return `${minutes}:${String(secondsTotal % 60).padStart(2, '0')}`
}
