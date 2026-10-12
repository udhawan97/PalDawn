import assert from 'node:assert/strict'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { classifyLicenseExpression } from './license-policy.mjs'

const ROOT = new URL('..', import.meta.url)
const values = new Map()
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init?.detail } }
globalThis.window = {
  localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) },
  dispatchEvent: () => true, innerWidth: 800, innerHeight: 600, devicePixelRatio: 1,
}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'Fictional test browser', onLine: true } })
const server = await createServer({ root: fileURLToPath(ROOT), server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
try {
  const { studyWorkspaceMarkdown, atlasStudyMarkdown } = await server.ssrLoadModule('/src/platform/study.ts')
  const { parseLocalDataImport, saveLearnerWorkspace, loadLearnerWorkspace, saveAtlasStudy, loadAtlasStudy } = await server.ssrLoadModule('/src/platform/localData.ts')
  const { diagnosticReport } = await server.ssrLoadModule('/src/platform/diagnostics.ts')
  const noteLines = ['Fictional ordinary', '# Fictional heading', '[fixture link](https://fixture.invalid)', '![fixture image](https://fixture.invalid/image.png)', '<div>Fictional HTML</div>', '```', 'Fictional fence', '```']
  for (const newline of ['\n', '\r\n', '\r']) {
    const note = noteLines.join(newline)
    const workspace = { notes: { approach: note }, checkpoints: ['approach'] }
    const atlasStudy = { narration: 'plain', lastPosition: null, records: { 'diabetes:pancreas-senses': { saved: true, studied: false, note } } }
    assert.equal(saveLearnerWorkspace(workspace), true)
    assert.equal(saveAtlasStudy(atlasStudy), true)
    const backup = parseLocalDataImport(JSON.stringify({ schema_version: 3, local_only: true, workspace, atlasStudy }))
    assert.equal(backup.ok, true)
    for (const input of [loadLearnerWorkspace(), backup.data.workspace]) {
      const markdown = studyWorkspaceMarkdown(input)
      for (const line of noteLines) {
        assert.ok(markdown.split('\n').includes(`    ${line}`), `Private line must be literal: ${line}`)
        assert.ok(!markdown.split('\n').includes(line), `Private line must not be active: ${line}`)
      }
      assert.ok(!markdown.includes('\r'), 'CR line separators must not escape the literal block')
      assert.match(markdown, /### Guide/)
      assert.match(markdown, /### Engineering/)
      assert.match(markdown, /Personal checkpoint: Complete/)
      assert.match(markdown, /    _No private note\._/)
      assert.equal(input.notes.approach, note, 'Export must not rewrite stored note text')
    }
    for (const input of [loadAtlasStudy(), backup.data.atlasStudy]) {
      const markdown = atlasStudyMarkdown(input, { includeNotes: true })
      for (const line of noteLines) {
        assert.ok(markdown.split('\n').includes(`    ${line}`), `Atlas private line must be literal: ${line}`)
        assert.ok(!markdown.split('\n').includes(line), `Atlas private line must not be active: ${line}`)
      }
      assert.ok(!markdown.includes('\r'), 'Atlas CR line separators must not escape the literal block')
      assert.match(markdown, /### Plain English/)
      assert.match(markdown, /### Clinical terms/)
      assert.equal(input.records['diabetes:pancreas-senses'].note, note, 'Atlas export must not rewrite stored note text')
    }
  }
  const packageJson = JSON.parse(await readFile(new URL('package.json', ROOT), 'utf8'))
  const diagnostics = JSON.parse(diagnosticReport({ noteCount: 1, checkpointCount: 1, bookmarkCount: 0, telemetry: {} }))
  assert.equal(diagnostics.base_release, packageJson.version)
  assert.equal(diagnostics.private_note_count, 1)
  assert.ok(!JSON.stringify(diagnostics).includes('Fictional heading'), 'Diagnostics retain counts rather than note content')
} finally { await server.close() }

const cases = [
  ['MIT', 'allow'], ['Apache-2.0', 'allow'], ['GPL-3.0-only', 'deny'], ['AGPL-3.0-only', 'deny'],
  ['LGPL-3.0-only', 'review'], ['MPL-2.0', 'review'], ['LicenseRef-Fictional', 'review'], ['UNKNOWN', 'deny'], ['CC-BY-NC-4.0', 'deny'],
  ['MIT OR GPL-3.0-only', 'allow'], ['MIT AND Apache-2.0', 'allow'], ['MIT AND GPL-3.0-only', 'deny'],
  ['(MIT OR GPL-3.0-only) AND GPL-3.0-only', 'deny'],
  ['MIT AND (Apache-2.0 OR GPL-3.0-only)', 'allow'],
  ['(MIT AND GPL-3.0-only) OR Apache-2.0', 'allow'],
  ['GPL-3.0-only OR MIT AND Apache-2.0', 'allow'],
  ['((MIT OR GPL-3.0-only) AND MPL-2.0) OR GPL-3.0-only', 'review'],
  ['MPL-2.0 AND GPL-3.0-only', 'deny'], ['MIT or (Apache-2.0 and BSD-3-Clause)', 'allow'],
  ['', 'deny'], ['MIT OR', 'deny'], ['OR MIT', 'deny'], ['MIT AND OR Apache-2.0', 'deny'],
  ['MIT AND ()', 'deny'], ['(MIT OR GPL-3.0-only', 'deny'], ['MIT OR GPL-3.0-only)', 'deny'],
  ['MIT Apache-2.0', 'deny'], ['MIT OR GPL-3.0-only !!!', 'deny'], ['MIT WITH Fictional-exception', 'deny'],
]
assert.equal(classifyLicenseExpression(null), 'deny')
assert.equal(classifyLicenseExpression('('.repeat(65) + 'MIT' + ')'.repeat(65)), 'deny')
assert.equal(classifyLicenseExpression('MIT' + ' '.repeat(4096)), 'deny')
const fixture = await mkdtemp(join(tmpdir(), 'paldawn-license-boundary-'))
try {
  await mkdir(join(fixture, 'scripts'))
  await mkdir(join(fixture, 'node_modules', 'fictional-license-fixture'), { recursive: true })
  for (const filename of ['license-inventory.mjs', 'license-policy.mjs']) {
    await copyFile(new URL(`scripts/${filename}`, ROOT), join(fixture, 'scripts', filename))
  }
  for (const [license, expected] of cases) {
    assert.equal(classifyLicenseExpression(license), expected, license)
    await writeFile(join(fixture, 'node_modules', 'fictional-license-fixture', 'package.json'), JSON.stringify({ name: 'fictional-license-fixture', version: '1.0.0', license }))
    const result = spawnSync(process.execPath, [join(fixture, 'scripts', 'license-inventory.mjs')], { encoding: 'utf8', timeout: 10_000 })
    assert.equal(result.status, expected === 'deny' ? 1 : 0, `${license}: ${result.stderr}`)
    const inventory = JSON.parse(await readFile(join(fixture, 'third-party-license-inventory.json'), 'utf8'))
    const entries = [...inventory.allowed, ...inventory.review, ...inventory.denied]
    assert.equal(entries.length, 1)
    assert.equal(entries[0].verdict, expected, license)
  }
} finally { await rm(fixture, { recursive: true, force: true }) }
console.log(`export/license boundaries: literal typed/imported First Light and Atlas notes (LF/CRLF/CR) · count-only diagnostics · ${cases.length} real inventory-interface fixtures`)
