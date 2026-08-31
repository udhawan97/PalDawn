import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url))
const server = await createServer({
  root: APP_ROOT,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
})

try {
  const {
    DISEASE_PACK_GATE_ORDER,
    SEMANTIC_SCALES,
    proposalPlanningProgress,
    validateDiseasePackProposal,
  } = await server.ssrLoadModule('/src/data/diseasePack.ts')
  const { HYPERTENSION_PACK_PROPOSAL } = await server.ssrLoadModule('/src/data/hypertensionPack.ts')
  const {
    DISEASE_PACK_PROPOSALS,
    diseasePackProposalByConditionId,
  } = await server.ssrLoadModule('/src/data/diseasePackRegistry.ts')

  assert.equal(DISEASE_PACK_PROPOSALS.length, 1)
  assert.equal(diseasePackProposalByConditionId('hypertension'), HYPERTENSION_PACK_PROPOSAL)
  assert.equal(diseasePackProposalByConditionId('diabetes'), null)
  assert.deepEqual(validateDiseasePackProposal(HYPERTENSION_PACK_PROPOSAL), [])

  assert.equal(HYPERTENSION_PACK_PROPOSAL.status, 'planning')
  assert.equal(HYPERTENSION_PACK_PROPOSAL.publicationEligible, false)
  assert.equal(HYPERTENSION_PACK_PROPOSAL.contentDigest, null)
  assert.deepEqual(HYPERTENSION_PACK_PROPOSAL.assets, [])
  assert.deepEqual(HYPERTENSION_PACK_PROPOSAL.reviewers, { medical: null, anatomy: null })

  assert.equal(HYPERTENSION_PACK_PROPOSAL.sources.length, 3)
  assert.equal(HYPERTENSION_PACK_PROPOSAL.claims.length, 5)
  assert.equal(HYPERTENSION_PACK_PROPOSAL.scaleStoryboard.length, 6)
  assert.equal(HYPERTENSION_PACK_PROPOSAL.gates.length, 8)
  assert.deepEqual(HYPERTENSION_PACK_PROPOSAL.scaleStoryboard.map(({ id }) => id), SEMANTIC_SCALES.map(({ id }) => id))
  assert.deepEqual(HYPERTENSION_PACK_PROPOSAL.gates.map(({ id }) => id), DISEASE_PACK_GATE_ORDER)
  assert.equal(proposalPlanningProgress(HYPERTENSION_PACK_PROPOSAL), 2)

  assert.ok(HYPERTENSION_PACK_PROPOSAL.sources.every(({ url }) => url.startsWith('https://')))
  assert.ok(HYPERTENSION_PACK_PROPOSAL.claims.every(({ reviewStatus }) => reviewStatus === 'pending'))
  assert.ok(HYPERTENSION_PACK_PROPOSAL.scaleStoryboard.every((scale) => (
    scale.storyboardStatus === 'draft'
    && scale.assetStatus === 'not-started'
    && scale.reviewStatus === 'not-started'
    && scale.plainFocus !== scale.clinicalFocus
  )))

  const thresholdClaim = HYPERTENSION_PACK_PROPOSAL.claims.find(({ id }) => id === 'htn-threshold-context')
  assert.ok(thresholdClaim)
  assert.equal(thresholdClaim.sourceIds.length, 2)
  assert.match(thresholdClaim.contextNote, /WHO describes 140\/90/)
  assert.match(thresholdClaim.contextNote, /130\/80/)

  const unsafeProposal = {
    ...HYPERTENSION_PACK_PROPOSAL,
    status: 'published',
    publicationEligible: true,
    contentDigest: 'invented',
    assets: ['invented'],
  }
  assert.ok(validateDiseasePackProposal(unsafeProposal).length >= 3, 'unsafe proposal mutations must fail validation')
} finally {
  await server.close()
}

console.log('disease-pack checks: 1 gated proposal · 3 official sources · 5 pending claims · L0–L5 draft · publication blocked')
