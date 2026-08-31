import { DISEASE_CURRICULUM } from './diseaseCatalog'
import { validateDiseasePackProposal, type DiseasePackProposal } from './diseasePack'
import { HYPERTENSION_PACK_PROPOSAL } from './hypertensionPack'

export const DISEASE_PACK_PROPOSALS: readonly DiseasePackProposal[] = [HYPERTENSION_PACK_PROPOSAL]

const proposalIds = new Set<string>()
for (const proposal of DISEASE_PACK_PROPOSALS) {
  if (proposalIds.has(proposal.conditionId)) throw new Error(`Duplicate disease-pack proposal: ${proposal.conditionId}`)
  proposalIds.add(proposal.conditionId)

  const condition = DISEASE_CURRICULUM.find((entry) => entry.id === proposal.conditionId)
  if (!condition) throw new Error(`Disease-pack proposal is outside Curriculum 50: ${proposal.conditionId}`)
  if (condition.status !== 'planned' || condition.journeyId) {
    throw new Error(`Disease-pack proposal must not replace a published journey: ${proposal.conditionId}`)
  }

  const issues = validateDiseasePackProposal(proposal)
  if (issues.length > 0) throw new Error(`${proposal.packId} is invalid: ${issues.join('; ')}`)
}

export const diseasePackProposalByConditionId = (conditionId: string): DiseasePackProposal | null =>
  DISEASE_PACK_PROPOSALS.find((proposal) => proposal.conditionId === conditionId) ?? null
