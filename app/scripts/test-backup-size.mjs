import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'

const records = new Map()
globalThis.window = { localStorage: { getItem: (key) => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), removeItem: (key) => records.delete(key) }, dispatchEvent: () => true }
globalThis.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options?.detail } }
const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
try {
  const data = await server.ssrLoadModule('/src/platform/localData.ts')
  const { JOURNEY } = await server.ssrLoadModule('/src/journey/journey.ts')
  for (const character of ['界', '\u0001']) {
    const note = character.repeat(data.MAX_STAGE_NOTE_LENGTH)
    const study = data.normalizeAtlasStudy({ records: Object.fromEntries(Array.from({ length: data.MAX_ATLAS_STUDY_RECORDS }, (_, i) => [`retired-${i}:${'x'.repeat(140)}`, { saved: true, studied: true, note }])) })
    assert.equal(data.saveAtlasStudy(study), true)
    const workspace = { notes: Object.fromEntries(JOURNEY.stages.map(({ id }) => [id, note])), checkpoints: JOURNEY.stages.map(({ id }) => id) }
    assert.equal(data.saveLearnerWorkspace(workspace), true)
    const exported = data.exportLocalData()
    assert.equal(exported.ok, true)
    const bytes = Buffer.byteLength(exported.text)
    assert.ok(bytes > 256 * 1024)
    assert.ok(bytes <= data.MAX_LOCAL_DATA_BACKUP_BYTES)
    const parsed = data.parseLocalDataImport(exported.text)
    assert.equal(parsed.ok, true)
    assert.deepEqual(parsed.data.atlasStudy, study)
    assert.deepEqual(parsed.data.workspace, workspace)
    console.log(`Full backup round trip: ${bytes} bytes; ${Object.keys(study.records).length} Atlas records; ${JOURNEY.stages.length} workspace notes`)
  }
  for (const schema_version of [1, 2, 3]) {
    const imported = data.parseLocalDataImport(JSON.stringify({ schema_version, local_only: true, workspace: { notes: { approach: 'Legacy note' }, checkpoints: [] } }))
    assert.equal(imported.ok, true)
    assert.equal(imported.data.workspace.notes.approach, 'Legacy note')
  }
  assert.equal(data.parseLocalDataImport(' '.repeat(data.MAX_LOCAL_DATA_BACKUP_BYTES + 1)).ok, false)
  assert.equal(data.parseLocalDataImport('界'.repeat(Math.ceil(data.MAX_LOCAL_DATA_BACKUP_BYTES / 3))).ok, false)
} finally {
  await server.close()
}
console.log('backup size checks: complete multibyte/escaped schema, versions 1–3, finite byte guard')
