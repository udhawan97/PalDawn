import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url))
const server = await createServer({ root: APP_ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })

try {
  const { buildAtlasSystemGroups } = await server.ssrLoadModule('/src/data/atlasDiscovery.ts')
  const { buildAtlasEvidenceLibrary } = await server.ssrLoadModule('/src/data/atlasEvidence.ts')
  const { buildAtlasStudyIndex, countAtlasStudy, filterAtlasStudy, nextOpenSavedAtlasStep } = await server.ssrLoadModule('/src/data/atlasStudyIndex.ts')
  const { DISEASES } = await server.ssrLoadModule('/src/data/diseases.ts')

  const study = {
    narration: 'plain',
    lastPosition: null,
    records: {
      'diabetes:pancreas-senses': { saved: true, studied: false, note: 'Review insulin signal' },
      'stroke:vessel-event': { saved: true, studied: true, note: '' },
      'retired-condition:retired-step': { saved: true, studied: false, note: 'Keep for recovery' },
    },
  }
  const entries = buildAtlasStudyIndex(study)
  assert.equal(entries.length, 3)
  assert.deepEqual(countAtlasStudy(entries), { active: 3, saved: 3, open: 2, studied: 1, notes: 2, unavailable: 1 })
  assert.equal(filterAtlasStudy(entries, 'notes', 'insulin').length, 1)
  assert.equal(filterAtlasStudy(entries, 'unavailable', '').at(0).id, 'retired-condition:retired-step')
  assert.equal(nextOpenSavedAtlasStep(entries).id, 'diabetes:pancreas-senses')

  const systemGroups = buildAtlasSystemGroups(DISEASES)
  assert.ok(systemGroups.length > 0)
  for (const group of systemGroups) {
    for (const pathway of group.pathways) {
      const disease = DISEASES.find(candidate => candidate.id === pathway.diseaseId)
      assert.ok(disease.steps[pathway.stepIndex].bodyParts.includes(group.bodyPartId), 'system discovery must use explicit step metadata')
    }
  }
  assert.ok(systemGroups.find(group => group.bodyPartId === 'pancreas').pathways.some(pathway => pathway.diseaseId === 'diabetes'))

  const evidence = buildAtlasEvidenceLibrary(DISEASES)
  assert.equal(evidence.length, DISEASES.reduce((count, disease) => count + disease.sources.length, 0))
  assert.ok(evidence.some(entry => entry.source.id === 'who-top-ten' && entry.stepIndexes.length === 0), 'ranking context must stay separate')
  assert.ok(evidence.some(entry => entry.source.id === 'niddk-digestion' && entry.stepIndexes.length > 0), 'step evidence must retain exact links')
} finally {
  await server.close()
}

console.log('Atlas Study Desk checks: local filters · explicit systems · exact evidence links')
