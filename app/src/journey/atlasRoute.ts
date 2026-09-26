import { DISEASES, type BodyPartId } from '../data/diseases'

export interface AtlasRoute {
  diseaseId: string
  stepIndex: number
  stepId: string
  bodyPartId: BodyPartId | null
}

export type AtlasRouteParseResult =
  | { kind: 'none' }
  | { kind: 'invalid' }
  | { kind: 'valid'; route: AtlasRoute }

export function parseAtlasHash(hash: string): AtlasRouteParseResult {
  if (!hash.startsWith('#atlas/')) return { kind: 'none' }
  try {
    const [path, query = ''] = hash.slice(1).split('?', 2)
    const parts = path.split('/')
    if (parts.length !== 3) return { kind: 'invalid' }
    const diseaseId = decodeURIComponent(parts[1]).trim()
    const stepId = decodeURIComponent(parts[2]).trim()
    const disease = DISEASES.find((candidate) => candidate.id === diseaseId)
    const stepIndex = disease?.steps.findIndex((candidate) => candidate.id === stepId) ?? -1
    if (!disease || stepIndex < 0) return { kind: 'invalid' }
    const requestedBodyPart = new URLSearchParams(query).get('part')
    const bodyPartId = requestedBodyPart && disease.steps[stepIndex].bodyParts.includes(requestedBodyPart as BodyPartId)
      ? requestedBodyPart as BodyPartId
      : null
    return { kind: 'valid', route: { diseaseId, stepIndex, stepId, bodyPartId } }
  } catch {
    return { kind: 'invalid' }
  }
}

export function atlasHash(diseaseId: string, stepIndex: number, bodyPartId: BodyPartId | null = null): string {
  const disease = DISEASES.find((candidate) => candidate.id === diseaseId) ?? DISEASES[0]
  const boundedStepIndex = Math.min(disease.steps.length - 1, Math.max(0, Math.trunc(stepIndex)))
  const step = disease.steps[boundedStepIndex]
  const query = bodyPartId && step.bodyParts.includes(bodyPartId) ? `?part=${encodeURIComponent(bodyPartId)}` : ''
  return `#atlas/${encodeURIComponent(disease.id)}/${encodeURIComponent(step.id)}${query}`
}

export function atlasStepUrl(diseaseId: string, stepIndex: number, bodyPartId: BodyPartId | null = null): string {
  const url = new URL(window.location.href)
  url.hash = atlasHash(diseaseId, stepIndex, bodyPartId).slice(1)
  return url.toString()
}
