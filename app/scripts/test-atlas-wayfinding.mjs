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
  const { ATLAS_SEARCH_RESULT_LIMIT, searchAtlas } = await server.ssrLoadModule('/src/data/atlasSearch.ts')
  const { diseaseById } = await server.ssrLoadModule('/src/data/diseases.ts')

  assert.deepEqual(searchAtlas('   '), [], 'blank queries must not create a result surface')
  assert.deepEqual(searchAtlas('not a paldawn route'), [], 'unknown terms must fail with an empty result set')

  const stroke = searchAtlas('stroke')
  assert.equal(stroke[0].kind, 'condition')
  assert.equal(stroke[0].diseaseId, 'stroke', 'an exact condition name must rank its condition first')

  const pancreas = searchAtlas('pancreas')
  assert.ok(pancreas.length > 0)
  assert.ok(pancreas.some((result) => result.diseaseId === 'diabetes' && result.bodyPartId === 'pancreas'))

  const insulin = searchAtlas('insulin')
  assert.ok(insulin.some((result) => result.diseaseId === 'diabetes' && result.kind === 'pathway'))

  const kidneys = searchAtlas('kidneys')
  assert.ok(kidneys.some((result) => result.bodyPartId === 'kidneys'))
  assert.ok(kidneys.length <= ATLAS_SEARCH_RESULT_LIMIT, 'results must remain bounded')

  for (const result of [...pancreas, ...insulin, ...kidneys]) {
    const disease = diseaseById(result.diseaseId)
    assert.equal(disease.id, result.diseaseId, 'results may only target known conditions')
    assert.ok(result.stepIndex >= 0 && result.stepIndex < disease.steps.length, 'results may only target known steps')
    if (result.bodyPartId) {
      assert.ok(
        disease.steps[result.stepIndex].bodyParts.includes(result.bodyPartId),
        'focused structures must belong to the targeted phase',
      )
    }
  }
} finally {
  await server.close()
}

console.log('atlas wayfinding checks: bounded local index · exact condition rank · valid phase and structure targets')
