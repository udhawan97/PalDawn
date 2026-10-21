import assert from 'node:assert/strict'
import { Box3, Matrix4, PerspectiveCamera, Vector3, Triangle } from 'three'
import { SYNTHETIC_SCENE, validateSceneSpec, resolveSceneFrame, shotAt } from './sceneFrame.ts'
import { INITIAL_PLAYBACK, playback } from './playback.ts'
import { fitStudyCamera } from './cameraFit.ts'
import { branchWallGeometry } from './branchGeometry.ts'

const geometry = branchWallGeometry(), bounds = { whole: geometry.boundingBox.clone(), junction: new Box3(new Vector3(-2.4, -1.2, -2), new Vector3(2.4, .4, 2)) }
bounds.whole.max.y = .4
validateSceneSpec(SYNTHETIC_SCENE)
for (const mutate of [s => { s.version = 2 }, s => { s.shots[1].id = 'unknown' }, s => { s.shots[1].start = 5 }, s => { s.shots[1].start = 3 }, s => { s.shots[1].end = 4 }, s => { s.shots[2].end = Infinity }, s => { delete s.shots[1] }, s => { s.shots[1].source = 'clinical' }]) {
  const spec = structuredClone(SYNTHETIC_SCENE); mutate(spec); assert.throws(() => validateSceneSpec(spec))
}
const frame = (time, viewport = { width: 320, height: 568 }) => resolveSceneFrame(SYNTHETIC_SCENE, time, viewport, bounds)
for (const bad of [NaN, Infinity, -Infinity]) assert.throws(() => frame(bad))
for (const viewport of [{ width: 0, height: 1 }, { width: 1, height: 0 }, { width: NaN, height: 1 }]) assert.throws(() => frame(0, viewport))
assert.equal(shotAt(4 - 1e-6).id, 'overview'); assert.equal(shotAt(4).id, 'junction')
assert.equal(shotAt(8 - 1e-6).id, 'junction'); assert.equal(shotAt(8).id, 'inside'); assert.equal(shotAt(12).id, 'inside')
const times = [0, 1e-6, 4 - 1e-6, 4, 4 + 1e-6, 8 - 1e-6, 8, 8 + 1e-6, 12 - 1e-6, 12]
for (const time of times) {
  const direct = frame(time)
  let state = playback(INITIAL_PLAYBACK, { type: 'play' })
  while (state.time + .25 < time) state = playback(state, { type: 'tick', delta: .25 })
  state = playback(state, { type: 'tick', delta: time - state.time })
  assert.deepEqual(frame(state.time), direct)
  state = playback(state, { type: 'seek', time: 12 }); state = playback(state, { type: 'seek', time })
  assert.deepEqual(frame(state.time), direct)
  state = playback(state, { type: 'restart' }); state = playback(state, { type: 'seek', time })
  assert.deepEqual(frame(state.time), direct)
}
let state = playback(INITIAL_PLAYBACK, { type: 'seek', time: 7.9 })
state = playback(state, { type: 'request', time: 8.1 }); const old = state.requestId
assert.equal(state.time, 7.9); assert.equal(playback(state, { type: 'play' }).playing, false)
assert.equal(playback(state, { type: 'tick', delta: .2 }).time, 7.9)
state = playback(state, { type: 'request', time: 4 }); const token = state.requestId
assert.deepEqual(playback(state, { type: 'settled', requestId: old, ok: true }), state)
state = playback(state, { type: 'settled', requestId: token, ok: false }); assert.equal(state.time, 7.9); assert.equal(state.status, 'failed')
state = playback(state, { type: 'request', time: 4 }); state = playback(state, { type: 'settled', requestId: state.requestId, ok: true })
assert.equal(state.time, 4); assert.equal(state.playing, false)
for (const event of [{ type: 'hidden' }, { type: 'inspect' }, { type: 'text', value: true }, { type: 'reduced', value: true }]) {
  let sample = playback(INITIAL_PLAYBACK, { type: 'play' }); sample = playback(sample, event)
  assert.equal(playback(sample, { type: 'tick', delta: .2 }).time, 0)
}
state = playback(INITIAL_PLAYBACK, { type: 'inspect' }); state = playback(state, { type: 'return' }); assert.equal(state.playing, false)
assert.throws(() => playback(INITIAL_PLAYBACK, { type: 'tick', delta: NaN }))
for (const invalid of [new Box3(), new Box3(new Vector3(NaN, 0, 0), new Vector3(1, 1, 1))]) assert.throws(() => fitStudyCamera(invalid, 1, 'front'))
for (const invalid of [new Vector3(), new Vector3(NaN, 0, 0)]) assert.throws(() => fitStudyCamera(bounds.whole, 1, invalid))
for (const aspect of [0, NaN, Infinity]) assert.throws(() => fitStudyCamera(bounds.whole, aspect, 'front'))
fitStudyCamera(bounds.whole, 1, new Vector3(0, 1, 0))
let fits = 0
for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) for (const time of [0, 4, 8, 10, 12]) {
  const resolved = frame(time, viewport), camera = new PerspectiveCamera(34, viewport.width / viewport.height, resolved.camera.near, resolved.camera.far)
  camera.position.fromArray(resolved.camera.position); camera.lookAt(new Vector3().fromArray(resolved.camera.target)); camera.updateMatrixWorld(true)
  const [low, high] = resolved.framingBounds
  for (const x of [low[0], high[0]]) for (const y of [low[1], high[1]]) for (const z of [low[2], high[2]]) {
    const projected = new Vector3(x, y, z).project(camera)
    assert.ok(Math.abs(projected.x) <= 1 - 16 / viewport.width && Math.abs(projected.y) <= 1 - 16 / viewport.height)
    assert.ok(projected.z > -1 && projected.z < 1)
  }
  fits++
  if (time >= 8) {
    let minimum = Infinity
    const triangle = new Triangle(), closest = new Vector3(), p = geometry.getAttribute('position'), ids = geometry.index.array
    for (let i = 0; i < ids.length; i += 3) {
      triangle.a.fromBufferAttribute(p, ids[i]); triangle.b.fromBufferAttribute(p, ids[i + 1]); triangle.c.fromBufferAttribute(p, ids[i + 2])
      triangle.closestPointToPoint(camera.position, closest); minimum = Math.min(minimum, closest.distanceTo(camera.position))
    }
    assert.ok(minimum > .13, 'interior camera/near plane crosses actual wall geometry')
  }
}
const transformed = bounds.whole.clone().applyMatrix4(new Matrix4().makeRotationY(.4)).translate(new Vector3(3, 4, 5))
assert.deepEqual(fitStudyCamera(transformed, 1, 'front').target, transformed.getCenter(new Vector3()))
assert.deepEqual(frame(8, { width: 320, height: 568, reduced: true }).camera, frame(12, { width: 320, height: 568, reduced: true }).camera)
geometry.dispose()
console.log(`Scene checks passed: exact shot boundaries, direct/forward/backward/restart full-state equality, stale-load/failure lifecycle, ${fits} padded fits, transformed bounds and actual-mesh interior camera clearance.`)
