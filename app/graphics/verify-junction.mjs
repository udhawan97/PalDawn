import assert from 'node:assert/strict'
import { Triangle, Vector3, DoubleSide, Mesh, MeshBasicMaterial, Raycaster } from 'three'
import { branchWallGeometry } from './branchGeometry.ts'
import { branchRoute, branchCellFrame, BRANCH } from './branchModel.ts'
import { FLOW } from './flowModel.ts'

const geometry = branchWallGeometry(), position = geometry.getAttribute('position'), ids = geometry.index.array
const edges = new Map(), parents = Int32Array.from({ length: position.count }, (_, i) => i)
const root = i => { while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i] } return i }
const triangles = [], bins = new Map(), size = .25
let minimumArea = Infinity, signedVolume = 0, normalProbes = 0
for (const value of position.array) assert.ok(Number.isFinite(value))
for (const value of geometry.getAttribute('normal').array) assert.ok(Number.isFinite(value))
for (let i = 0; i < ids.length; i += 3) {
  const vertices = [0, 1, 2].map(j => { assert.ok(ids[i + j] < position.count); return new Vector3().fromBufferAttribute(position, ids[i + j]) })
  const triangle = new Triangle(...vertices), area = triangle.getArea()
  assert.ok(area > 0, 'degenerate emitted triangle'); minimumArea = Math.min(minimumArea, area)
  triangles.push(triangle)
  signedVolume += vertices[0].dot(vertices[1].clone().cross(vertices[2])) / 6
  for (let j = 0; j < 3; j++) {
    const a = ids[i + j], b = ids[i + (j + 1) % 3], key = a < b ? `${a}:${b}` : `${b}:${a}`
    const edge = edges.get(key) ?? { count: 0, winding: 0 }
    edge.count++; edge.winding += a < b ? 1 : -1; edges.set(key, edge)
    parents[root(a)] = root(b)
  }
  const low = Math.floor(Math.min(...vertices.map(v => v.z)) / size), high = Math.floor(Math.max(...vertices.map(v => v.z)) / size)
  for (let bin = low; bin <= high; bin++) { if (!bins.has(bin)) bins.set(bin, []); bins.get(bin).push(triangle) }
  if (i % 183 === 0) {
    const center = triangle.getMidpoint(new Vector3()), normal = triangle.getNormal(new Vector3()), radius = Math.hypot(center.x, center.y)
    if (center.z < -2 && center.z > -5.8 && center.y < -.1) {
      const radial = new Vector3(center.x, center.y, 0).normalize()
      assert.ok(normal.dot(radial) * (radius > 1 ? 1 : -1) > .8, 'straight inner/outer wall has inverted normals')
      normalProbes++
    }
  }
}
for (const edge of edges.values()) { assert.equal(edge.count, 2, 'unintended seam'); assert.equal(edge.winding, 0, 'inconsistent adjacent winding') }
assert.equal(new Set(Array.from(parents, (_, i) => root(i))).size, 1, 'wall disconnected')
assert.equal(position.count - edges.size + ids.length / 3, 2, 'unexpected handles or holes in the cutaway wall volume')
assert.ok(signedVolume > 0 && normalProbes > 0, 'global wall orientation must face out of the solid')

// Distance queries use emitted triangles, not the mesher's field or radius recipe.
const nearest = new Vector3()
function wallDistance(point) {
  let distance = Infinity
  const visited = new Set()
  for (let bin = Math.floor((point.z - 1.2) / size); bin <= Math.floor((point.z + 1.2) / size); bin++) for (const triangle of bins.get(bin) ?? []) {
    if (visited.has(triangle)) continue; visited.add(triangle)
    triangle.closestPointToPoint(point, nearest); distance = Math.min(distance, point.distanceTo(nearest))
  }
  return distance
}
let minimumDistance = Infinity, probes = 0
// Route speed <= 12/cos(35). A 1/300 step moves <= .04884, so any
// unsampled point is at most .02442 from a sample (distance is 1-Lipschitz).
const betweenSampleBound = 12 / Math.cos(BRANCH.angle) / 300 / 2
for (const branch of ['left', 'right']) for (let tick = 24; tick <= 276; tick++) {
  const frame = branchRoute(tick / 300, branch)
  const distance = wallDistance(frame.center)
  minimumDistance = Math.min(minimumDistance, distance); probes++
  assert.ok(distance > FLOW.cell + FLOW.clearance + BRANCH.lane + betweenSampleBound, `${branch}: swept full cell may cross a wall`)
}

const material = new MeshBasicMaterial({ side: DoubleSide }), mesh = new Mesh(geometry, material)
mesh.updateMatrixWorld(true)
for (const branch of ['left', 'right']) {
  const start = branchRoute(.76, branch), end = branchRoute(.99, branch)
  const direction = end.center.clone().sub(start.center).normalize()
  const cast = new Raycaster(start.center, direction, 0, start.center.distanceTo(end.center))
  assert.equal(cast.intersectObject(mesh).length, 0, 'unintended daughter cap')
}
const rootCast = new Raycaster(new Vector3(0, -.05, -5.9), new Vector3(0, 0, 1), 0, 5.9)
assert.equal(rootCast.intersectObject(mesh).length, 0, 'unintended parent cap')
for (let id = 0; id < 240; id++) for (let tick = 0; tick <= 120; tick++) {
  const frame = branchCellFrame(id, tick / 10)
  if (!frame.scale) continue
  if (frame.progress >= 1 / 3 && frame.progress <= 2 / 3) assert.equal(frame.scale, 1, 'handoff must not fade')
  const extent = FLOW.cell * frame.scale + FLOW.clearance
  assert.ok(frame.center.z + 6 >= extent, 'cell crosses parent entry plane')
  for (const sign of [-1, 1]) assert.ok(6 / Math.cos(BRANCH.angle) - sign * frame.center.x * Math.sin(BRANCH.angle) - frame.center.z * Math.cos(BRANCH.angle) >= extent, 'cell crosses a daughter exit plane')
  assert.equal(frame.owner, frame.progress < .5 ? 'root' : frame.branch)
}
// Every emitted triangle occupies one tetrahedron in a conforming subdivision;
// its planar convex polygon cannot cross another cell interior. Edge incidence
// and winding above check that neighboring polygon boundaries are stitched.
geometry.dispose(); material.dispose()
console.log(`Junction mesh: ${ids.length / 3} triangles, one closed cutaway wall, Euler 2, consistent winding; ${probes} independent triangle sweeps, minimum distance ${minimumDistance.toFixed(4)}, step bound ${betweenSampleBound.toFixed(5)}, minimum triangle area ${minimumArea.toExponential(2)}; open ports passed.`)
