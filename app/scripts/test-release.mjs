import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'

const ROOT = new URL('..', import.meta.url)
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8')
const packageJson = JSON.parse(read('package.json'))
const journey = JSON.parse(read('../content/journeys/first-light.v1.json'))
const journeySchema = JSON.parse(read('../content/schema/journey-v1.schema.json'))

const canonicalize = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

const { pack_digest: declaredDigest, ...digestInput } = journey
const computedDigest = `sha256:${createHash('sha256').update(canonicalize(digestInput)).digest('hex')}`

assert.equal(packageJson.version, '0.1.0', 'package version must match the release')
assert.equal(journey.release, packageJson.version, 'journey and package versions must match')
assert.equal(journeySchema.$id, 'https://udhawan97.github.io/PalDawn/schema/journey-v1.schema.json')
assert.equal(journeySchema.additionalProperties, false, 'journey schema must fail closed on unknown root fields')
assert.equal(journey.schema_version, 1)
assert.equal(journey.pack_version, 1)
assert.match(journey.pack_id, /^pack:[a-z0-9.-]+@1$/)
assert.equal(declaredDigest, computedDigest, 'journey pack digest must match its canonical content')
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
assert.doesNotMatch(source, /\.(glb|gltf|fbx|obj|blend)(?:[?"'])/i, 'anatomy/binary assets are not allowed in v0.1')
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
