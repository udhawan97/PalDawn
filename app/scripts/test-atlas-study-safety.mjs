import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const values = new Map()
let writesBlocked = false
let writeCount = 0
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => {
    writeCount += 1
    if (writesBlocked) throw new Error('Fictional storage failure')
    values.set(key, String(value))
  },
  removeItem: (key) => values.delete(key),
}
globalThis.CustomEvent = class {
  constructor(type, init) { this.type = type; this.detail = init?.detail }
}
globalThis.window = { localStorage: storage, dispatchEvent: () => true }

const server = await createServer({
  root: fileURLToPath(new URL('..', import.meta.url)),
  server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent',
})

try {
  const { useAtlasStudy: study, resetAtlasStudyMemory } = await server.ssrLoadModule('/src/state/atlasStudy.ts')
  const { PALDAWN_ATLAS_STUDY_KEY: key, MAX_ATLAS_STUDY_RECORDS: limit, normalizeAtlasStudy } = await server.ssrLoadModule('/src/platform/localData.ts')
  const { atlasStudyMarkdown } = await server.ssrLoadModule('/src/platform/study.ts')
  const reset = () => { values.clear(); writesBlocked = false; writeCount = 0; resetAtlasStudyMemory() }
  const sibling = JSON.stringify({ narration: 'plain', lastPosition: null, records: {
    'stroke:vessel-event': { saved: true, studied: false, note: 'Fictional sibling note' },
  }, resetToken: null })

  await test('conflict veto covers every writer while keeping the draft editable and exportable', () => {
    const writers = [
      ['record', () => study.getState().updateRecord('diabetes', 'pancreas-senses', { note: 'Edited fictional draft' })],
      ['position', () => study.getState().setPosition({ diseaseId: 'diabetes', stepId: 'pancreas-senses' })],
      ['narration', () => study.getState().setNarration('clinical')],
      ['PWA persistence', () => study.getState().persist()],
    ]
    for (const [name, write] of writers) {
      reset()
      writesBlocked = true
      assert.equal(study.getState().updateRecord('diabetes', 'pancreas-senses', { note: 'Fictional draft' }), false)
      writesBlocked = false
      values.set(key, sibling)
      study.getState().replaceFromStorage()
      const writesBefore = writeCount
      assert.equal(write(), false, `${name} must not declare the conflicted draft durable`)
      assert.equal(values.get(key), sibling, `${name} must preserve the sibling's exact durable bytes`)
      assert.equal(writeCount, writesBefore, `${name} must not attempt a storage write`)
      assert.equal(study.getState().persisted, false)
      assert.match(study.getState().status, /Another tab/)
      const expectedNote = name === 'record' ? 'Edited fictional draft' : 'Fictional draft'
      assert.equal(study.getState().records['diabetes:pancreas-senses'].note, expectedNote)
      assert.ok(atlasStudyMarkdown(study.getState(), { includeNotes: true }).includes(expectedNote))
      study.getState().replaceFromStorage()
      assert.equal(study.getState().records['diabetes:pancreas-senses'].note, expectedNote)
    }
  })

  await test('ordinary storage recovery and clean cross-tab synchronization remain available', () => {
    reset()
    writesBlocked = true
    assert.equal(study.getState().updateRecord('diabetes', 'pancreas-senses', { note: 'Retry me' }), false)
    writesBlocked = false
    assert.equal(study.getState().persist(), true)
    assert.equal(JSON.parse(values.get(key)).records['diabetes:pancreas-senses'].note, 'Retry me')
    values.set(key, sibling)
    study.getState().replaceFromStorage()
    assert.equal(study.getState().records['stroke:vessel-event'].note, 'Fictional sibling note')
    assert.equal(study.getState().setNarration('clinical'), true)
    assert.equal(study.getState().persist(), true)
  })

  await test('full study refuses a new record without evicting notes, and permits edits and removal', () => {
    reset()
    const records = Object.fromEntries(Array.from({ length: limit }, (_, index) => [
      `retired-${index}:step`, { saved: true, studied: false, note: `Fictional recovery note ${index}` },
    ]))
    values.set(key, JSON.stringify({ narration: 'plain', lastPosition: null, records, resetToken: null }))
    study.getState().replaceFromStorage()
    const beforeBytes = values.get(key)
    const beforeExport = atlasStudyMarkdown(study.getState(), { includeNotes: true })
    const writesBefore = writeCount
    assert.equal(study.getState().updateRecord('diabetes', 'pancreas-senses', { note: 'New note' }), false)
    assert.deepEqual(study.getState().records, records)
    assert.equal(values.get(key), beforeBytes)
    assert.equal(writeCount, writesBefore)
    assert.equal(atlasStudyMarkdown(study.getState(), { includeNotes: true }), beforeExport)
    assert.equal(study.getState().persisted, true, 'refusal does not create an unsaved draft')
    assert.match(study.getState().status, /full|limit/i)
    assert.equal(study.getState().updateRecord('retired-0', 'step', { note: 'Edited recovery note' }), true)
    assert.equal(Object.keys(study.getState().records).length, limit)
    assert.equal(study.getState().updateRecord('retired-1', 'step', { saved: false, studied: false, note: '' }), true)
    assert.equal(study.getState().updateRecord('diabetes', 'pancreas-senses', { note: 'New note' }), true)
    assert.equal(Object.keys(study.getState().records).length, limit)
    assert.equal(JSON.parse(values.get(key)).records['retired-0:step'].note, 'Edited recovery note')
    assert.equal(JSON.parse(values.get(key)).records['diabetes:pancreas-senses'].note, 'New note')
    assert.equal(Object.keys(normalizeAtlasStudy({ records: { ...records, 'extra:step': { saved: true } } }).records).length, limit)
  })

  await test('deliberate reload resolves the conflict by loading the durable sibling copy', async () => {
    reset()
    writesBlocked = true
    study.getState().updateRecord('diabetes', 'pancreas-senses', { note: 'Copy before reload' })
    writesBlocked = false
    values.set(key, sibling)
    study.getState().replaceFromStorage()
    assert.equal(study.getState().persist(), false)
    server.moduleGraph.invalidateAll()
    const { useAtlasStudy: reloaded } = await server.ssrLoadModule('/src/state/atlasStudy.ts')
    assert.equal(reloaded.getState().records['stroke:vessel-event'].note, 'Fictional sibling note')
    assert.equal(reloaded.getState().records['diabetes:pancreas-senses'], undefined)
    assert.equal(reloaded.getState().persist(), true)
  })
} finally {
  await server.close()
}
