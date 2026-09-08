import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { Box3, PerspectiveCamera, Vector3 } from 'three'
import { buildMeshes, encodeGLB, tubeGeometry } from './mesh-builder.mjs'
import { fitStudyCamera } from './cameraFit.ts'

const root = new URL('../../content/graphics/heart-study/', import.meta.url)
const read = name => readFileSync(new URL(name, root))
const sha = data => createHash('sha256').update(data).digest('hex')
const source = read('source.json'), spec = JSON.parse(source), manifest = JSON.parse(read('manifest.json'))
const output = read('heart-study.glb'), meshes = buildMeshes(spec)
assert.equal(manifest.publicationEligible, false)
assert.equal(manifest.review.status, 'pending')
assert.equal(manifest.review.reviewer, null)
assert.equal(manifest.sourceSha256, sha(source), 'source manifest is stale')
assert.equal(manifest.generatorSha256, sha(readFileSync(new URL('mesh-builder.mjs', import.meta.url))), 'generator manifest is stale')
assert.equal(manifest.assetSha256, sha(output), 'asset does not match its manifest')
assert.equal(output.byteLength, manifest.bytes)
assert.equal(output.readUInt32LE(0), 0x46546c67)
assert.equal(output.readUInt32LE(4), 2)
assert.equal(output.readUInt32LE(8), output.length)
assert.deepEqual(output, encodeGLB(meshes, { id: spec.id, review: spec.review, units: spec.units, license: spec.license }), 'regenerated GLB differs')
assert.equal(new Set(meshes.map(m => m.name)).size, meshes.length)
assert.equal(meshes.length, manifest.parts.length)
const allBounds = new Box3(), heartBounds = new Box3()
for (const { name, geometry, group } of meshes) {
  const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal'), c = geometry.getAttribute('color')
  assert.equal(p.count, n.count, name)
  assert.equal(p.count, c.count, name)
  for (const attribute of [p, n, c]) for (const value of attribute.array) assert.ok(Number.isFinite(value), `${name}: nonfinite vertex data`)
  for (const index of geometry.index.array) assert.ok(index >= 0 && index < p.count, `${name}: invalid index`)
  for (let i=0; i<n.count; i++) assert.ok(new Vector3().fromBufferAttribute(n, i).lengthSq() > .98, `${name}: invalid normal`)
  geometry.computeBoundingBox()
  allBounds.union(geometry.boundingBox)
  if (group !== 'context') heartBounds.union(geometry.boundingBox)
  const part = manifest.parts.find(p => p.name === name)
  assert.equal(part.triangles, geometry.index.count / 3, name)
}
// Tube normals must face away from the centerline; a flipped tube can look
// deceptively valid when rendered with double-sided materials.
const tube = tubeGeometry([[0,0,0],[0,1,0],[0,2,0]], .2, '#fff', { open: true })
for (let i=0; i<tube.getAttribute('position').count; i++) {
  const p = new Vector3().fromBufferAttribute(tube.getAttribute('position'), i)
  const n = new Vector3().fromBufferAttribute(tube.getAttribute('normal'), i)
  assert.ok(new Vector3(p.x,0,p.z).normalize().dot(n) > .95, 'tube normal points inward')
}
tube.dispose()
let framingCases = 0
for (const bounds of [heartBounds, allBounds]) for (const aspect of [.45, .7, 1, 1.8, 2.8]) for (const view of ['front','left','back','right']) {
  const fit = fitStudyCamera(bounds, aspect, view)
  const camera = new PerspectiveCamera(34, aspect, .05, 100)
  camera.position.copy(fit.position); camera.lookAt(fit.target); camera.updateMatrixWorld(true)
  for (const x of [bounds.min.x,bounds.max.x]) for (const y of [bounds.min.y,bounds.max.y]) for (const z of [bounds.min.z,bounds.max.z]) {
    const projected = new Vector3(x,y,z).project(camera)
    assert.ok(Math.abs(projected.x) <= .801 && Math.abs(projected.y) <= .801, `${view}/${aspect}: clipped bounds`)
    assert.ok(projected.z > -1 && projected.z < 1, 'near/far clipping')
  }
  framingCases++
}
// The public app must not acquire the workbench, asset, or authored-source data.
const publicFiles = readdirSync(new URL('../dist/', import.meta.url), { recursive: true })
for (const filename of publicFiles) {
  assert.doesNotMatch(filename, /heart-study|flow-study|\.glb$/i, 'workbench file leaked into public build')
  if (/\.(js|html|json)$/.test(filename)) {
    const contents = readFileSync(new URL(`../dist/${filename}`, import.meta.url), 'utf8')
    assert.ok(!contents.includes(manifest.id) && !contents.includes(manifest.assetSha256) && !contents.includes('graphics/HeartWorkbench'), 'workbench data leaked into public build')
    assert.ok(!contents.includes('flowSeed') && !contents.includes('Synthetic flow fixture'), 'flow workbench leaked into public build')
  }
}
for (const { geometry } of meshes) geometry.dispose()
console.log(`Heart study checks passed: deterministic GLB, ${meshes.length} mesh parts, outward tube normals, ${framingCases} camera fits, public-build exclusion.`)
