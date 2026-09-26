import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url))
const server = await createServer({ root: APP_ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })

try {
  const { atlasHash, parseAtlasHash } = await server.ssrLoadModule('/src/journey/atlasRoute.ts')
  const { atlasStudyRecordId, normalizeAtlasStudy } = await server.ssrLoadModule('/src/platform/localData.ts')
  const { atlasStudyMarkdown } = await server.ssrLoadModule('/src/platform/study.ts')

  const valid = parseAtlasHash('#atlas/diabetes/pancreas-senses?part=pancreas')
  assert.equal(valid.kind, 'valid')
  assert.equal(valid.route.diseaseId, 'diabetes')
  assert.equal(valid.route.stepId, 'pancreas-senses')
  assert.equal(valid.route.bodyPartId, 'pancreas')
  assert.equal(parseAtlasHash('#atlas/diabetes/pancreas-senses?part=brain').route.bodyPartId, null)
  assert.equal(parseAtlasHash('#atlas/not-real/nope').kind, 'invalid')
  assert.equal(parseAtlasHash('#atlas/%E0%A4%A/nope').kind, 'invalid')
  assert.equal(parseAtlasHash('#stage/approach').kind, 'none')
  assert.equal(atlasHash('diabetes', 2), '#atlas/diabetes/pancreas-senses')

  const id = atlasStudyRecordId('diabetes', 'pancreas-senses')
  const study = normalizeAtlasStudy({
    narration: 'clinical',
    lastPosition: { diseaseId: 'diabetes', stepId: 'pancreas-senses' },
    records: {
      [id]: { saved: true, studied: true, note: `# Private\0 note\n- [link](https://example.com)\n${'x'.repeat(1300)}` },
      'unsafe key': { saved: true },
    },
  })
  assert.equal(study.narration, 'clinical')
  assert.equal(study.lastPosition.stepId, 'pancreas-senses')
  assert.equal(Object.keys(study.records).length, 1)
  assert.equal(study.records[id].note.includes('\0'), false)
  assert.equal(study.records[id].note.length, 1200)

  const withoutNotes = atlasStudyMarkdown(study, { includeNotes: false, diseaseId: 'diabetes' })
  assert.match(withoutNotes, /The pancreas releases insulin/)
  assert.match(withoutNotes, /Plain English/)
  assert.match(withoutNotes, /Clinical terms/)
  assert.match(withoutNotes, /niddk\.nih\.gov/)
  assert.doesNotMatch(withoutNotes, /Private note/)
  const withNotes = atlasStudyMarkdown(study, { includeNotes: true, diseaseId: 'diabetes' })
  assert.match(withNotes, /Private note/)
  assert.match(withNotes, /    # Private note/)
  assert.match(withNotes, /    - \[link\]\(https:\/\/example\.com\)/)
  assert.doesNotMatch(withNotes, /^# Private note$/m)

  const unavailableId = 'retired-condition:retired-step'
  const preserved = normalizeAtlasStudy({
    records: { [unavailableId]: { saved: true, studied: false, note: '# Keep this private' } },
  })
  const recovered = atlasStudyMarkdown(preserved, { includeNotes: true })
  assert.match(recovered, /Unavailable Atlas record/)
  assert.match(recovered, /retired-condition:retired-step/)
  assert.match(recovered, /    # Keep this private/)
} finally {
  await server.close()
}

console.log('study continuity checks: stable routes · bounded local records · source-linked export')
