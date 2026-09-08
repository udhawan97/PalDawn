import assert from 'node:assert/strict'
import { PerspectiveCamera, Vector3 } from 'three'
import { FLOW, FLOW_COUNTS, FLOW_PROFILES, FLOW_ROWS, FLOW_VIEW, cellFrame, cellGeometry, cellSeeds, createRadiusTable, flowBounds, radiusSample, radiusTable, routeFrame, wallGeometry } from './flowModel.ts'
import { fitStudyCamera } from './cameraFit.ts'

const seeds = cellSeeds(FLOW_COUNTS.high)
assert.deepEqual(cellSeeds(FLOW_COUNTS.low), seeds.slice(0, FLOW_COUNTS.low), 'quality must preserve shared identities')
for (const radii of [[], Array(81).fill(NaN), Array(81).fill(Infinity), Array(81).fill(-1), Array(81).fill(0), Array(81).fill(3), Array(81).fill(.2), Array.from({ length: 81 }, (_, i) => i === 40 ? .4 : 1)]) {
  assert.throws(() => createRadiusTable(radii), /Radius profile/, 'invalid or abrupt geometry must fail before rendering')
}
const cell = cellGeometry()
cell.computeBoundingSphere()
assert.ok(cell.boundingSphere.radius <= FLOW.cell + 1e-6, 'full geometry must fit its containment sphere')
const start = routeFrame(0), end = routeFrame(1)
const directions = []
for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) {
  if (x || y || z) directions.push(new Vector3(x, y, z).normalize())
}
let visible = 0, spherePoints = 0, cameraFits = 0
for (const profile of Object.keys(FLOW_PROFILES)) {
  const radii = radiusTable(profile), wall = wallGeometry(radii)
  assert.deepEqual(radiusTable(profile), radii, 'profile generation must be reproducible')
  for (const geometry of [cell, wall]) {
    for (const attribute of Object.values(geometry.attributes)) for (const number of attribute.array) assert.ok(Number.isFinite(number))
    for (const index of geometry.index.array) assert.ok(index < geometry.getAttribute('position').count)
  }
  // Validate the GPU lookup against actual mesh row positions, not just the
  // authored recipe. Every wall row uses the same Float32 values as the GPU.
  const positions = wall.getAttribute('position')
  for (let row = 0; row <= FLOW_ROWS; row++) {
    const center = routeFrame(row / FLOW_ROWS).center
    const vertex = new Vector3().fromBufferAttribute(positions, row * 41 + 20)
    assert.ok(Math.abs(vertex.distanceTo(center) - radii[row * 4]) < 1e-6)
  }
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
    cameraFits++
  }
  for (let tick = 0; tick <= 120; tick++) for (const seed of seeds) {
    const { center, scale, s } = cellFrame(seed, tick / 10, radii)
    if (!scale) continue
    const distance = Math.hypot(Math.hypot(center.x, center.z + FLOW.radius) - FLOW.radius, center.y)
    assert.ok(distance + FLOW.cell * scale <= radiusSample(radii, s).radius - FLOW.clearance + 1e-6, 'cell crosses local wall clearance')
    assert.ok(center.clone().sub(start.center).dot(start.tangent) >= FLOW.cell * scale, 'cell crosses entry plane')
    assert.ok(end.center.clone().sub(center).dot(end.tangent) >= FLOW.cell * scale, 'cell crosses exit plane')
    // Independently evaluate an expanded bounding sphere at its own nearest
    // route coordinates. This catches cells whose centers fit while their
    // leading/trailing vertices penetrate a narrower neighboring cross-section.
    for (const direction of directions) {
      const point = center.clone().addScaledVector(direction, FLOW.cell * scale + FLOW.clearance / 2)
      const angle = Math.atan2(point.x, point.z + FLOW.radius)
      const pointS = angle / FLOW.arc + .5
      const radial = Math.hypot(Math.hypot(point.x, point.z + FLOW.radius) - FLOW.radius, point.y)
      assert.ok(radial < radiusSample(radii, pointS).radius - .02, `${profile}: full sphere intersects varying wall`)
      spherePoints++
    }
    visible++
  }
  for (const seed of seeds) {
    const earlier = cellFrame(seed, 3, radii)
    cellFrame(seed, 9, radii)
    assert.deepEqual(cellFrame(seed, 3, radii), earlier, 'backward seeking must reconstruct exact state')
    assert.ok(cellFrame(seed, FLOW.duration, radii).s > cellFrame(seed, 0, radii).s, 'a passage must never wrap')
  }
  for (let i = 0; i < FLOW_ROWS * 40 * 12; i += 12) {
    const points = [0, 1, 2].map(offset => new Vector3().fromBufferAttribute(positions, wall.index.array[i + offset]))
    const normal = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize()
    const midpoint = points[0].clone().add(points[1]).add(points[2]).divideScalar(3)
    const angle = Math.atan2(midpoint.x, midpoint.z + FLOW.radius)
    const center = new Vector3(FLOW.radius * Math.sin(angle), 0, FLOW.radius * (Math.cos(angle) - 1))
    assert.ok(normal.dot(center.sub(midpoint).normalize()) > .95, 'inside wall face points outwards')
  }
  wall.dispose()
}
cell.dispose()
console.log(`Flow checks passed: 3 radius profiles, ${visible} containment samples, ${spherePoints} expanded-sphere probes, ${cameraFits} camera fits, invalid-profile rejection, deterministic seeking and quality identities.`)
