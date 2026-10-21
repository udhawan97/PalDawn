import assert from 'node:assert/strict'
import { Y_SPEC, validateBranchSpec, branchForId, branchRoute, branchCellFrame, branchRadius } from './branchModel.ts'

validateBranchSpec(Y_SPEC)
assert.throws(() => { Y_SPEC.branches[0].radius = 1 })
validateBranchSpec({ ...Y_SPEC, branches: [...Y_SPEC.branches].reverse() })
for (const mutate of [
  s => { s.version = 2 }, s => { s.junction[0] = -3 }, s => { s.transform[0] = 0 },
  s => { s.branches[0].parent = 'left' }, s => { s.branches[1].parent = 'missing' },
  s => { s.branches[1].id = 'root' }, s => { s.branches.pop() },
  s => { s.branches[1].attachment = 2 }, s => { s.branches[0].radius = NaN },
  s => { s.branches[0].radius = 0 }, s => { s.branches[1].radius = .7 },
  s => { s.branches[1].end = s.branches[1].start }, s => { s.branches[2].end[0] = Infinity },
  s => { s.branches[2].start[0] = 1 }, s => { s.branches[2].end[0] += .1 },
  s => { s.junction = Array(2) }, s => { s.transform = Array(16) },
  s => { s.branches[1].start = Array(3) }, s => { delete s.branches[1].end[1] },
  s => { s.radiusSamples[1] = Array(2) }, s => { s.ports[1].branch = 'right' },
  s => { s.ownershipBoundary = .6 },
]) { const spec = structuredClone(Y_SPEC); mutate(spec); assert.throws(() => validateBranchSpec(spec), /branch contract/) }
for (const bad of [null, {}, { ...Y_SPEC, branches: [null, null, null] }]) assert.throws(() => validateBranchSpec(bad))
assert.equal(new Set(Array.from({ length: 240 }, (_, i) => branchForId(i))).size, 2)
for (const bad of [-1, NaN, Infinity, .1, 0x100000000]) assert.throws(() => branchForId(bad))
for (let id = 0; id < 240; id++) {
  const earlier = branchCellFrame(id, 3)
  branchCellFrame(id, 9)
  assert.deepEqual(branchCellFrame(id, 3), earlier)
  assert.equal(branchCellFrame(id, 0).scale, 0)
  assert.equal(branchCellFrame(id, 12).scale, 0)
}
for (const branch of ['left', 'right']) for (const progress of [1 / 3, 5 / 12, .5, 7 / 12, 2 / 3]) {
  const before = branchRoute(progress - 1e-7, branch), after = branchRoute(progress + 1e-7, branch)
  assert.ok(before.center.distanceTo(after.center) < 1e-5)
  assert.ok(before.tangent.distanceTo(after.tangent) < 1e-5)
}
assert.throws(() => branchCellFrame(0, NaN))
assert.throws(() => branchRoute(Number.MAX_VALUE, 'left'))
for (const [progress, radius] of Y_SPEC.radiusSamples) assert.ok(Math.abs(branchRadius(progress) - radius) < 1e-6)
for (let i = 1; i <= 1000; i++) {
  assert.ok(branchRadius(i / 1000) >= .18 + .08)
  assert.ok(Math.abs(branchRadius(i / 1000) - branchRadius((i - 1) / 1000)) < .002)
}
console.log('Branch contract: invalid trees/transforms/geometry rejected; 240 stable identities, continuous tangents, finite passage and repeatable seeking passed.')
