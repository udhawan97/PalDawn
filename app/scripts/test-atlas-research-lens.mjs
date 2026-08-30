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
  const { ATLAS_EVIDENCE_STATUS, buildAtlasEvidenceLedger } = await server.ssrLoadModule('/src/data/atlasEvidence.ts')
  const { DISEASES, diseaseById } = await server.ssrLoadModule('/src/data/diseases.ts')

  assert.equal(ATLAS_EVIDENCE_STATUS.reviewStatus, 'pending')
  assert.equal(ATLAS_EVIDENCE_STATUS.sourcesCheckedOn, '2026-08-22')

  for (const disease of DISEASES) {
    const ledger = buildAtlasEvidenceLedger(disease)
    assert.deepEqual(ledger.danglingSourceIds, [], `${disease.id} must not contain dangling source references`)
    assert.equal(ledger.sourceCoverage.length, disease.sources.length)
    assert.equal(ledger.sourcedStepCount, disease.steps.length, `${disease.id} must link every authored step to a known source`)
    for (const coverage of ledger.sourceCoverage) {
      assert.ok(coverage.stepIndexes.every((index) => index >= 0 && index < disease.steps.length))
    }
  }

  const diabetes = buildAtlasEvidenceLedger(diseaseById('diabetes'))
  const digestion = diabetes.sourceCoverage.find(({ source }) => source.id === 'niddk-digestion')
  assert.deepEqual(digestion?.stepIndexes, [0, 1], 'digestive-system evidence must route to the authored meal and absorption steps')

  const heart = buildAtlasEvidenceLedger(diseaseById('ischaemic-heart-disease'))
  const indexContext = heart.sourceCoverage.find(({ source }) => source.id === 'who-top-ten')
  assert.deepEqual(indexContext?.stepIndexes, [], 'ranking context must not be presented as step evidence')
} finally {
  await server.close()
}

console.log('Atlas Research Lens checks: complete source resolution · bounded step coverage · index context separated')
