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
    CURRICULUM_SYSTEMS,
    DISEASE_CURRICULUM,
    EXPLORABLE_CURRICULUM,
    filterDiseaseCurriculum,
  } = await server.ssrLoadModule('/src/data/diseaseCatalog.ts')
  const { DISEASES } = await server.ssrLoadModule('/src/data/diseases.ts')

  assert.equal(DISEASE_CURRICULUM.length, 50, 'the curriculum must stay at exactly 50 conditions')
  assert.equal(new Set(DISEASE_CURRICULUM.map(({ id }) => id)).size, 50, 'condition IDs must be unique')
  assert.equal(new Set(DISEASE_CURRICULUM.map(({ code }) => code)).size, 50, 'condition codes must be unique')

  assert.equal(EXPLORABLE_CURRICULUM.length, DISEASES.length, 'only authored disease journeys are explorable')
  assert.deepEqual(
    new Set(EXPLORABLE_CURRICULUM.map(({ journeyId }) => journeyId)),
    new Set(DISEASES.map(({ id }) => id)),
    'every authored journey must map to the curriculum exactly once',
  )
  assert.equal(DISEASE_CURRICULUM.filter(({ status }) => status === 'planned').length, 40)
  assert.ok(
    DISEASE_CURRICULUM.filter(({ status }) => status === 'planned').every(({ reviewStatus, journeyId }) => (
      reviewStatus === 'not-started' && journeyId === undefined
    )),
    'planned entries must fail closed without a journey or implied review',
  )

  for (const system of CURRICULUM_SYSTEMS) {
    assert.ok(
      DISEASE_CURRICULUM.some(({ systemId }) => systemId === system.id),
      `${system.id} must own at least one curriculum entry`,
    )
  }

  assert.deepEqual(filterDiseaseCurriculum('CV-03').map(({ id }) => id), ['hypertension'])
  assert.deepEqual(filterDiseaseCurriculum('hypertension').map(({ id }) => id), ['hypertension'])
  assert.ok(filterDiseaseCurriculum('', 'neurologic').every(({ systemId }) => systemId === 'neurologic'))
  assert.ok(filterDiseaseCurriculum('', 'all', 'explorable').every(({ journeyId }) => Boolean(journeyId)))
  assert.deepEqual(filterDiseaseCurriculum('not a curriculum condition'), [])
} finally {
  await server.close()
}

console.log('curriculum catalog checks: 50 unique conditions · 10 gated previews · 40 fail-closed plans · bounded filters')
