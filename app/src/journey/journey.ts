import journeyData from '../../../content/journeys/first-light.v1.json'

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
  schema_version: 1
  pack_id: string
  pack_version: 1
  pack_digest: `sha256:${string}`
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const fail = (reason: string): never => {
  throw new Error(`Invalid PalDawn journey pack: ${reason}`)
}

const requiredString = (record: Record<string, unknown>, key: string): string => {
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value : fail(`${key} must be a non-empty string`)
}

export function validateJourneyDefinition(value: unknown): JourneyDefinition {
  if (!isRecord(value)) throw new Error('Invalid PalDawn journey pack: root must be an object')
  const record = value
  if (record.schema_version !== 1) fail('schema_version must be 1')
  if (record.pack_version !== 1) fail('pack_version must be 1')
  const packId = requiredString(record, 'pack_id')
  if (!/^pack:[a-z0-9.-]+@1$/.test(packId)) fail('pack_id must be an immutable v1 identifier')
  const packDigest = requiredString(record, 'pack_digest')
  if (!/^sha256:[a-f0-9]{64}$/.test(packDigest)) fail('pack_digest must be a SHA-256 digest')
  if (record.content_status !== 'synthetic_engineering_only') fail('content_status must preserve the synthetic boundary')
  if (record.published_medical_claims !== false) fail('published_medical_claims must be false')
  if (record.reduced_motion_route !== 'stage_steps') fail('reduced_motion_route must be stage_steps')
  const durationSeconds = record.duration_seconds
  if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('Invalid PalDawn journey pack: duration_seconds must be a positive number')
  }
  const stageValues = record.stages
  if (!Array.isArray(stageValues) || stageValues.length === 0) {
    throw new Error('Invalid PalDawn journey pack: stages must be a non-empty array')
  }

  const ids = new Set<string>()
  let cursor = 0
  const stages = stageValues.map((stageValue, index): JourneyStage => {
    if (!isRecord(stageValue)) fail(`stage ${index + 1} must be an object`)
    const id = requiredString(stageValue, 'id')
    if (!/^[a-z0-9-]+$/.test(id) || ids.has(id)) fail(`stage ${id} has an invalid or duplicate id`)
    ids.add(id)
    const start = stageValue.start
    const end = stageValue.end
    if (typeof start !== 'number' || start !== cursor) fail(`stage ${id} must start at ${cursor}`)
    if (typeof end !== 'number' || end <= start || end > 1) fail(`stage ${id} has an invalid end`)
    cursor = end
    return {
      id,
      label: requiredString(stageValue, 'label'),
      level: requiredString(stageValue, 'level'),
      start,
      end,
      guide: requiredString(stageValue, 'guide'),
      engineering: requiredString(stageValue, 'engineering'),
    }
  })
  if (cursor !== 1) fail('stages must cover the complete normalized route')

  return {
    schema_version: 1,
    pack_id: packId,
    pack_version: 1,
    pack_digest: packDigest as `sha256:${string}`,
    id: requiredString(record, 'id'),
    title: requiredString(record, 'title'),
    release: requiredString(record, 'release'),
    duration_seconds: durationSeconds,
    content_status: 'synthetic_engineering_only',
    published_medical_claims: false,
    reduced_motion_route: 'stage_steps',
    disclosure: requiredString(record, 'disclosure'),
    stages,
  }
}

export const JOURNEY = validateJourneyDefinition(journeyData)

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
