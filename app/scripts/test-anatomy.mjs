import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { createExplosionLayout } from '../src/anatomy/explosion-layout.ts'
import { PointerTap } from '../src/anatomy/pointer-tap.ts'
import { atlasTools } from '../src/anatomy/agent-tools.ts'
import { decodeModelResponse } from '../src/anatomy/model-download.ts'
import { SYSTEMS } from '../src/anatomy/anatomy.ts'
// Node's TS loader requires explicit import extensions; bundle pure study logic with installed Vite.
import { build } from 'vite'
const bundled = await build({ configFile: false, logLevel: 'silent', build: { write: false, minify: false, lib: { entry: resolve('src/anatomy/studyLinks.ts'), formats: ['es'], fileName: 'study' } } })
const code = (Array.isArray(bundled) ? bundled[0] : bundled).output.find(o => o.type === 'chunk').code
const { relatedLessons, searchStructures, ORGAN_ANCHORS, SYSTEM_READING } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
const base = resolve('../output/anatomy/models')
for (const [file, meshCount, conceptCount] of [['atlas.json', 2234, 3432], ['atlas-female.json', 888, 1073]]) {
const atlas = JSON.parse(readFileSync(resolve(base, file)))
assert.equal(atlas.parts.length, meshCount); assert.equal(atlas.concepts.length, conceptCount)
const ids = new Set(atlas.parts.map(p => p.id)), parts = new Map(atlas.parts.map(p => [p.id, p]))
assert.equal(ids.size, meshCount)
const files = atlas.chunks.map(c => { const b = readFileSync(resolve(base, c.url.split('/').pop())); assert.equal(b.length, c.bytes); return b })
let triangles = 0
for (const p of atlas.parts) {
  assert.ok(SYSTEMS.some(s => s.id === p.system)); assert.ok(p.name.trim())
  const b = files[p.chunk]; assert.ok(p.indices + p.indexCount * 4 <= b.length)
  const positions = new Float32Array(b.buffer, b.byteOffset + p.positions, p.vertexCount * 3)
  const indices = new Uint32Array(b.buffer, b.byteOffset + p.indices, p.indexCount)
  for (const value of positions) assert.ok(Number.isFinite(value))
  for (const index of indices) assert.ok(index < p.vertexCount)
  triangles += p.indexCount / 3
}
assert.equal(triangles, atlas.triangles)
for (const c of atlas.concepts) { assert.ok(c.elements.length); for (const id of c.elements) assert.ok(ids.has(id)) }
for (const anchor of ORGAN_ANCHORS.filter(a => a.id.startsWith('HRA:') === (atlas.sex === 'female'))) assert.ok(atlas.concepts.some(c => c.id === anchor.id), anchor.id)
for (const sys of SYSTEMS) {
  assert.ok(SYSTEM_READING[sys.id])
  const results = searchStructures(atlas, '', sys.id, parts)
  for (const p of atlas.parts.filter(p => p.system === sys.id)) assert.ok(results.some(c => c.elements.includes(p.id)), `${p.id} missing from browse`)
}
assert.ok(searchStructures(atlas, 'heart', 'all', parts).some(c => c.name.toLowerCase() === 'heart'))
assert.ok(searchStructures(atlas, atlas.parts[0].id, 'all', parts).some(c => c.elements.includes(atlas.parts[0].id)))
assert.equal(searchStructures(atlas, 'nonexistent-word-xyz', 'all', parts).length, 0)
const heart = atlas.concepts.find(c => c.id === (atlas.sex === 'female' ? 'HRA:VH_F_heart' : 'FMA7088'))
assert.ok(relatedLessons(atlas, heart).some(x => x.disease.id === 'diabetes'))
if (atlas.sex === 'female') for (const id of ['HRA:VH_F_lungs', 'HRA:VH_F_eyes', 'HRA:Allen_brain']) assert.ok(relatedLessons(atlas, atlas.concepts.find(c => c.id === id)).length > 0, id)
if (atlas.sex !== 'female') assert.ok(relatedLessons(atlas, atlas.concepts.find(c => c.id === 'FMA7309')).length > 0)
const femur = searchStructures(atlas, 'femur', 'skeletal', parts)[0]
if (femur) assert.equal(relatedLessons(atlas, femur).length, 0, 'No invented disease mapping for unmapped bone')
for (const concept of atlas.concepts) for (const lesson of relatedLessons(atlas, concept)) {
  assert.ok(lesson.sources.length); assert.ok(lesson.disease.steps[lesson.stepIndex].bodyParts.includes(lesson.bodyPart))
}
for (const group of [atlas.parts, ...SYSTEMS.map(s => atlas.parts.filter(p => p.system === s.id))]) for (const aspect of [.46, 1, 1.7]) {
  const layout = createExplosionLayout(group, aspect), cells = [...layout.cells.values()]
  assert.equal(cells.length, group.length)
  for (let i = 0; i < cells.length; i++) {
    const a = cells[i]; assert.ok(Math.abs(a.x) + a.width / 2 <= layout.width / 2 + 1e-8)
    for (let j = i + 1; j < cells.length; j++) { const b = cells[j]; assert.ok(Math.abs(a.x-b.x) >= (a.width+b.width)/2-1e-8 || Math.abs(a.y-b.y) >= (a.height+b.height)/2-1e-8) }
  }
}
const tap = new PointerTap()
tap.down(1, 10, 10, 5); assert.equal(tap.up(1, 12, 11), true)
tap.down(1, 10, 10, 5); tap.move(1, 40, 10); assert.equal(tap.up(1, 10, 10), false)
tap.down(1, 10, 10, 12); tap.down(2, 20, 20, 12); assert.equal(tap.up(2, 20, 20), false); assert.equal(tap.up(1, 10, 10), false)
let selected
const [find, inspect] = atlasTools(atlas, c => selected = c)
assert.ok(find.execute({ query: 'heart' }).length); inspect.execute({ id: heart.id }); assert.equal(selected, heart)
assert.throws(() => inspect.execute({ id: 'missing' })); assert.throws(() => find.execute({ query: '' }))
console.log(`${file}: ${meshCount} meshes, ${conceptCount} concepts and all available-system mappings validated.`)
}
const context = JSON.parse(readFileSync(resolve('../output/anatomy/context.json')))
assert.ok(context.femaleReading.reproductive.source.includes('femalereproductivesystem'))
assert.ok(context.femaleStructures.uterus)
for (const reading of [...Object.values(context.reading), ...Object.values(context.femaleReading)]) { assert.ok(reading.topics.length >= 5); for (const topic of reading.topics) { assert.ok(topic.title.trim()); assert.ok(!['Site Map', 'Accessibility', 'Viewers & Players', 'Health Topics', 'Medical Encyclopedia', 'Drugs & Supplements'].includes(topic.title), 'Exclude site navigation from reading topics'); assert.ok(topic.url.startsWith('https://medlineplus.gov/')) } }
const original = Buffer.from('model bytes'), compressed = gzipSync(original)
for (const [payload, gzip] of [[original, false], [original, true], [compressed, true]]) assert.deepEqual(Buffer.from(await decodeModelResponse(new Response(payload), original.length, gzip)), original)
await assert.rejects(decodeModelResponse(new Response('bad'), 999, false))
await assert.rejects(decodeModelResponse(new Response('', { status: 404 }), 0, false))
assert.ok(!existsSync(resolve('dist/anatomy')), 'Normal build must exclude pending anatomy pack')
assert.ok(!readdirSync('dist/assets').some(f => f.startsWith('AnatomyStudy') || f.startsWith('AnatomyLanding')), 'Normal build must exclude candidate study chunks')
console.log('Anatomy checks passed: all meshes/buffers/concepts, all available-system browse coverage, explicit lesson mappings and source resolution, packing, picking, WebMCP, gzip handling, normal-build exclusion.')

// Research navigation uses source membership, preserves unknowns and exports only selected reading.
const researchBuild = await build({ configFile: false, logLevel: 'silent', build: { write: false, minify: false, lib: { entry: resolve('src/anatomy/research.ts'), formats: ['es'], fileName: 'research' } } })
const researchCode = (Array.isArray(researchBuild) ? researchBuild[0] : researchBuild).output.find(o => o.type === 'chunk').code
const { RESEARCH_TRACKS, ALL_RESEARCH_TOPICS, trackConcepts, suggestedTracks, researchContext, searchReading, exportReadingPlan } = await import('data:text/javascript;base64,' + Buffer.from(researchCode).toString('base64'))
const male = JSON.parse(readFileSync(resolve(base, 'atlas.json'))), female = JSON.parse(readFileSync(resolve(base, 'atlas-female.json')))
const allConceptIds = new Set([...male.concepts, ...female.concepts].map(c => c.id))
for (const track of RESEARCH_TRACKS) {
  assert.ok(track.conditions.length >= 5)
  for (const id of track.anchors) assert.ok(allConceptIds.has(id), `Missing source anchor ${id}`)
  for (const system of track.systems) assert.ok(SYSTEMS.some(s => s.id === system))
  assert.equal(new Set(track.conditions.map(t => t.id)).size, track.conditions.length)
}
assert.equal(RESEARCH_TRACKS.length, 20)
assert.equal(new Set(RESEARCH_TRACKS.flatMap(t => t.conditions.map(c => c.id))).size, 113)
assert.equal(new Set(ALL_RESEARCH_TOPICS.map(t => t.id)).size, ALL_RESEARCH_TOPICS.length)
for (const atlas of [male, female]) {
  const heartTrack = RESEARCH_TRACKS.find(t => t.id === 'heart')
  const heart = trackConcepts(atlas, heartTrack)[0]
  assert.deepEqual(suggestedTracks(atlas, heart).tracks.map(t => t.id), ['heart'])
  const piece = { id: 'selected-piece', name: 'Unknown label', elements: [heart.elements[0]] }
  assert.ok(suggestedTracks(atlas, piece).tracks.some(t => t.id === 'heart'), 'Child meshes retain organ reading context')
  const unknown = { id: 'missing', name: 'heart', elements: ['unknown-piece'] }
  assert.equal(suggestedTracks(atlas, unknown).tracks.length, 0, 'A similar label must not invent a connection')
}
assert.equal(trackConcepts(male, RESEARCH_TRACKS.find(t => t.id === 'pelvis')).length, 0)
assert.equal(trackConcepts(female, RESEARCH_TRACKS.find(t => t.id === 'pelvis')).length, 2)
assert.equal(trackConcepts(female, RESEARCH_TRACKS.find(t => t.id === 'male-pelvis')).length, 0)
assert.equal(searchReading(ALL_RESEARCH_TOPICS, '  kidney   chronic ')[0].title, 'Chronic Kidney Disease')
const plan = exportReadingPlan(['function:kidneys', 'endometriosis', 'missing'])
assert.ok(plan.includes('filtration and reabsorption'))
assert.ok(plan.includes('https://medlineplus.gov/endometriosis.html'))
assert.ok(!plan.includes('Cardiomyopathy'))
assert.ok(!plan.includes('missing'))
console.log('Research checks passed: 20 study tracks, 113 condition topics, exact source anchors, child membership, unmapped references, search and bounded export.')

const noConnection = researchContext(suggestedTracks(male, { id: 'unmapped', name: 'heart', elements: ['unknown-piece'] }), '')
assert.equal(noConnection.scope, 'Browse independently · no study connection mapped')
assert.equal(researchContext(null, 'kidneys').scope, 'Your chosen reading area')
const ligament = male.parts.find(p => p.id === 'FJ1284')
assert.ok(ligament)
const ligamentContext = researchContext(suggestedTracks(male, { id: ligament.conceptId, name: ligament.name, elements: [ligament.id] }), '')
assert.equal(ligamentContext.track.id, 'bones')
assert.equal(ligamentContext.scope, 'Broader system reading · no exact organ mapping')
console.log('Unmapped research context and actual connective-tissue fallback checks passed.')
