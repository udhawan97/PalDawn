import assert from 'node:assert/strict'
import { PerspectiveCamera, Vector3 } from 'three'
import { FLOW, FLOW_COUNTS, FLOW_VIEW, cellFrame, cellGeometry, cellSeeds, flowBounds, routeFrame, wallGeometry } from './flowModel.ts'
import { fitStudyCamera } from './cameraFit.ts'

const seeds = cellSeeds(FLOW_COUNTS.high)
assert.deepEqual(cellSeeds(FLOW_COUNTS.low), seeds.slice(0, FLOW_COUNTS.low), 'quality must preserve shared identities')
const cell = cellGeometry(), wall = wallGeometry()
cell.computeBoundingSphere()
assert.ok(cell.boundingSphere.radius <= FLOW.cell + 1e-6, 'full geometry must fit its containment sphere')
for (const geometry of [cell, wall]) {
  for (const attribute of Object.values(geometry.attributes)) for (const number of attribute.array) assert.ok(Number.isFinite(number))
  for (const index of geometry.index.array) assert.ok(index < geometry.getAttribute('position').count)
}
const start = routeFrame(0), end = routeFrame(1)
const bounds = flowBounds(wall)
for (const aspect of [.45, .7, 1, 1.8, 2.8]) {
  const fit = fitStudyCamera(bounds, aspect, FLOW_VIEW)
  const camera = new PerspectiveCamera(34, aspect, .05, 100)
  camera.position.copy(fit.position); camera.lookAt(fit.target); camera.updateMatrixWorld(true)
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const projected = new Vector3(x, y, z).project(camera)
    assert.ok(Math.abs(projected.x) <= .801 && Math.abs(projected.y) <= .801, 'cutaway or cells clipped by camera')
    assert.ok(projected.z > -1 && projected.z < 1)
  }
}
let visible = 0
for (let tick = 0; tick <= 120; tick++) for (const seed of seeds) {
  const { center, scale } = cellFrame(seed, tick / 10)
  if (!scale) continue
  // Distance to the circle centerline defines the exact torus interior. Distance
  // is 1-Lipschitz, so adding the entire rotated cell's bounding radius proves
  // containment for every vertex and intermediate orientation, not only centers.
  const distance = Math.hypot(Math.hypot(center.x, center.z + FLOW.radius) - FLOW.radius, center.y)
  assert.ok(distance + FLOW.cell * scale <= FLOW.wall - FLOW.clearance + 1e-6, 'cell crosses wall clearance')
  assert.ok(center.clone().sub(start.center).dot(start.tangent) >= FLOW.cell * scale, 'cell crosses entry plane')
  assert.ok(end.center.clone().sub(center).dot(end.tangent) >= FLOW.cell * scale, 'cell crosses exit plane')
  visible++
}
for (const seed of seeds) {
  const earlier = cellFrame(seed, 3)
  cellFrame(seed, 9)
  assert.deepEqual(cellFrame(seed, 3), earlier, 'backward seeking must reconstruct exact state')
  assert.ok(cellFrame(seed, FLOW.duration).s > cellFrame(seed, 0).s, 'a passage must never wrap')
}
// Interior faces must point into the cutaway; check triangle face normals away
// from joined rim vertices (whose smooth normals intentionally blend).
const p = wall.getAttribute('position')
for (let i = 0; i < 80 * 40 * 12; i += 12) {
  const points = [0, 1, 2].map(offset => new Vector3().fromBufferAttribute(p, wall.index.array[i + offset]))
  const normal = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize()
  const midpoint = points[0].clone().add(points[1]).add(points[2]).divideScalar(3)
  const angle = Math.atan2(midpoint.x, midpoint.z + FLOW.radius)
  const center = new Vector3(FLOW.radius * Math.sin(angle), 0, FLOW.radius * (Math.cos(angle) - 1))
  assert.ok(normal.dot(center.sub(midpoint).normalize()) > .99, 'inside wall face points outwards')
}
cell.dispose(); wall.dispose()
console.log(`Flow checks passed: ${visible} full-extent containment samples, end-plane clearance, inward wall faces, deterministic seeking and quality identities.`)
