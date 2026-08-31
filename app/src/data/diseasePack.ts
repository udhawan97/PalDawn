export const DISEASE_PACK_SCHEMA_VERSION = 1 as const

export const SEMANTIC_SCALES = [
  { id: 'L0', label: 'Body' },
  { id: 'L1', label: 'System' },
  { id: 'L2', label: 'Organ' },
  { id: 'L3', label: 'Structure' },
  { id: 'L4', label: 'Tissue' },
  { id: 'L5', label: 'Cellular' },
] as const

export type SemanticScaleId = typeof SEMANTIC_SCALES[number]['id']
export type PackGateStatus = 'complete' | 'draft' | 'not-started' | 'blocked'
export type PackReviewStatus = 'not-started' | 'pending'

export const DISEASE_PACK_GATE_ORDER = [
  'selection',
  'sources',
  'claims',
  'storyboard',
  'assets',
  'accessibility',
  'qualified-review',
  'publication',
] as const

export type DiseasePackGateId = typeof DISEASE_PACK_GATE_ORDER[number]

export interface DiseasePackSource {
  id: string
  title: string
  organization: string
  url: string
  verifiedOn: string
}

export interface DiseasePackClaim {
  id: string
  statement: string
  sourceIds: string[]
  reviewStatus: PackReviewStatus
  contextNote?: string
}

export interface DiseasePackScaleStoryboard {
  id: SemanticScaleId
  plainFocus: string
  clinicalFocus: string
  comparisonQuestion: string
  structureIds: string[]
  storyboardStatus: 'draft'
  assetStatus: 'not-started'
  reviewStatus: 'not-started'
}

export interface DiseasePackGate {
  id: DiseasePackGateId
  label: string
  status: PackGateStatus
  evidence: string
}

export interface DiseasePackProposal {
  schemaVersion: typeof DISEASE_PACK_SCHEMA_VERSION
  packId: string
  conditionId: string
  title: string
  status: 'planning'
  publicationEligible: false
  contentDigest: null
  updatedOn: string
  selectionRationale: string
  readingDepthContract: string
  sources: DiseasePackSource[]
  claims: DiseasePackClaim[]
  scaleStoryboard: DiseasePackScaleStoryboard[]
  gates: DiseasePackGate[]
  assets: []
  reviewers: {
    medical: null
    anatomy: null
  }
}

const unique = (values: string[]): boolean => new Set(values).size === values.length

export function validateDiseasePackProposal(proposal: DiseasePackProposal): string[] {
  const issues: string[] = []
  const sourceIds = proposal.sources.map((source) => source.id)
  const claimIds = proposal.claims.map((claim) => claim.id)
  const scaleIds = proposal.scaleStoryboard.map((scale) => scale.id)
  const gateIds = proposal.gates.map((gate) => gate.id)

  if (proposal.schemaVersion !== DISEASE_PACK_SCHEMA_VERSION) issues.push('schema version is unsupported')
  if (!/^[a-z0-9-]+@proposal-\d+\.\d+\.\d+$/.test(proposal.packId)) issues.push('pack ID must be an immutable proposal version')
  if (proposal.status !== 'planning' || proposal.publicationEligible !== false) issues.push('proposal must fail closed in planning state')
  if (proposal.contentDigest !== null) issues.push('planning proposal cannot claim a built content digest')
  if (proposal.assets.length !== 0) issues.push('planning proposal cannot ship anatomy assets')
  if (proposal.reviewers.medical !== null || proposal.reviewers.anatomy !== null) issues.push('reviewer identities cannot be inferred')

  if (!unique(sourceIds)) issues.push('source IDs must be unique')
  if (!unique(claimIds)) issues.push('claim IDs must be unique')
  if (proposal.sources.some((source) => !source.url.startsWith('https://'))) issues.push('sources must use HTTPS')
  if (proposal.claims.some((claim) => claim.reviewStatus !== 'pending')) issues.push('every draft claim must remain pending review')
  if (proposal.claims.some((claim) => claim.sourceIds.length === 0 || claim.sourceIds.some((id) => !sourceIds.includes(id)))) {
    issues.push('every claim must resolve to a recorded source')
  }

  const expectedScaleIds = SEMANTIC_SCALES.map((scale) => scale.id)
  if (scaleIds.join('|') !== expectedScaleIds.join('|')) issues.push('storyboard must declare L0 through L5 in order')
  if (proposal.scaleStoryboard.some((scale) => (
    scale.storyboardStatus !== 'draft'
    || scale.assetStatus !== 'not-started'
    || scale.reviewStatus !== 'not-started'
  ))) issues.push('storyboards cannot imply built assets or completed review')

  if (gateIds.join('|') !== DISEASE_PACK_GATE_ORDER.join('|')) issues.push('publication gates must be complete and ordered')
  if (proposal.gates.find((gate) => gate.id === 'qualified-review')?.status !== 'blocked') {
    issues.push('qualified review must block an unsigned proposal')
  }
  if (proposal.gates.find((gate) => gate.id === 'publication')?.status !== 'blocked') {
    issues.push('publication must remain blocked')
  }

  return issues
}

export const proposalPlanningProgress = (proposal: DiseasePackProposal): number =>
  proposal.gates.filter((gate) => gate.status === 'complete').length
