import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const ROOT = new URL('..', import.meta.url)
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8')
const packageJson = JSON.parse(read('package.json'))
const journey = JSON.parse(read('src/data/p0-journey.json'))

assert.equal(packageJson.version, '0.2.0', 'package version must match the release')
assert.equal(journey.release, packageJson.version, 'journey and package versions must match')
assert.equal(journey.content_status, 'synthetic_engineering_only')
assert.equal(journey.published_medical_claims, false)
assert.equal(journey.reduced_motion_route, 'stage_steps')
assert.ok(journey.disclosure.toLowerCase().includes('not anatomy'))
assert.equal(journey.stages.length, 5, 'P0 is a bounded five-stage voyage')

const ids = new Set()
let cursor = 0
for (const stage of journey.stages) {
  assert.ok(!ids.has(stage.id), `duplicate stage id: ${stage.id}`)
  ids.add(stage.id)
  assert.equal(stage.start, cursor, `stage ${stage.id} must start where the previous stage ends`)
  assert.ok(stage.end > stage.start && stage.end <= 1, `invalid range for ${stage.id}`)
  assert.ok(stage.guide.length >= 60, `guide narration is too thin for ${stage.id}`)
  assert.ok(stage.engineering.length >= 60, `engineering narration is too thin for ${stage.id}`)
  cursor = stage.end
}
assert.equal(cursor, 1, 'journey must cover the complete normalized route')

const sourceFiles = []
const walk = (directory) => {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) walk(path)
    else sourceFiles.push(path)
  }
}
walk(new URL('src', ROOT).pathname)
const source = sourceFiles.map((path) => readFileSync(path, 'utf8')).join('\n')
assert.doesNotMatch(source, /\.(glb|gltf|fbx|obj|blend)(?:[?"'])/i, 'anatomy/binary assets are not allowed in v0.2')
assert.doesNotMatch(source, /[\u0900-\u097f]/u, 'the v0.2 application surface must remain English-only')
assert.match(source, /suspected heart attack\? contact local\s+emergency services immediately/i)
assert.match(source, /className="skip-link"/)
assert.match(source, /'flight-controls'/)
assert.match(source, /'intro-title'/)
assert.match(source, /'completion-summary'/)
assert.match(source, /aria-live="polite"/)

const distHtml = read('dist/index.html')
assert.match(distHtml, /First Light/)
assert.doesNotMatch(distHtml, /\/src\/main\.tsx/, 'production HTML must not reference source modules')

const assetsDirectory = new URL('dist/assets', ROOT).pathname
const javascriptAssets = readdirSync(assetsDirectory).filter((name) => name.endsWith('.js'))
assert.ok(javascriptAssets.length > 0, 'production JavaScript asset missing')
const gzipBytes = javascriptAssets.reduce((total, name) => {
  const bytes = readFileSync(join(assetsDirectory, name))
  return total + gzipSync(bytes).byteLength
}, 0)
assert.ok(gzipBytes <= 500 * 1024, `core JavaScript exceeds 500 KB gzip budget: ${gzipBytes} bytes`)

console.log(`release checks: ${journey.stages.length} stages · ${gzipBytes} B gzip JS · synthetic boundary intact`)
