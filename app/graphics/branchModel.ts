import { Vector3 } from 'three'
import { FLOW, cellSeeds } from './flowModel.ts'

export const BRANCH = Object.freeze({ version: 1, angle: 35 * Math.PI / 180, radius: .9, childRadius: .6, wall: .18, grid: .12, extent: 6, lane: .04 })
export type BranchId = 'root' | 'left' | 'right'
export type BranchSpec = { version: number; junction: readonly number[]; transform: readonly number[]; branches: readonly { id: string; parent: string | null; attachment: number; start: readonly number[]; end: readonly number[]; radius: number }[] }
const spread = BRANCH.extent * Math.tan(BRANCH.angle)
export const Y_SPEC: BranchSpec = {
  version: 1, junction: [-2, 2], transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  branches: [
    { id: 'root', parent: null, attachment: 0, start: [0, 0, -6], end: [0, 0, 0], radius: .9 },
    { id: 'left', parent: 'root', attachment: 1, start: [0, 0, 0], end: [-spread, 0, 6], radius: .6 },
    { id: 'right', parent: 'root', attachment: 1, start: [0, 0, 0], end: [spread, 0, 6], radius: .6 },
  ],
}
for (const branch of Y_SPEC.branches) { Object.freeze(branch.start); Object.freeze(branch.end); Object.freeze(branch) }
Object.freeze(Y_SPEC.branches); Object.freeze(Y_SPEC.junction); Object.freeze(Y_SPEC.transform); Object.freeze(Y_SPEC)

// Version 1 deliberately accepts one fixture, rather than promising unprobed trees.
export function validateBranchSpec(value: unknown): asserts value is BranchSpec {
  const fail = () => { throw new Error('Unsupported synthetic Y branch contract') }
  const numbers = (actual: unknown, expected: readonly number[]) => Array.isArray(actual) && actual.length === expected.length && actual.every((n, i) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n - expected[i]!) <= 1e-6)
  if (!value || typeof value !== 'object') return fail()
  const spec = value as BranchSpec
  if (spec.version !== 1 || !numbers(spec.junction, Y_SPEC.junction) || !numbers(spec.transform, Y_SPEC.transform) || !Array.isArray(spec.branches) || spec.branches.length !== 3) return fail()
  if (new Set(spec.branches.map(b => b?.id)).size !== 3) return fail()
  for (const expected of Y_SPEC.branches) {
    const branch = spec.branches.find(b => b?.id === expected.id)
    if (!branch || branch.parent !== expected.parent || branch.attachment !== expected.attachment || !Number.isFinite(branch.radius) || Math.abs(branch.radius - expected.radius) > 1e-6 || !numbers(branch.start, expected.start) || !numbers(branch.end, expected.end)) return fail()
  }
}

export function branchForId(id: number): 'left' | 'right' {
  if (!Number.isSafeInteger(id) || id < 0 || id > 0xffffffff) throw new Error('Invalid particle identity')
  let hash = Math.imul(id ^ 173, 0x45d9f3b)
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b)
  return ((hash ^ (hash >>> 16)) >>> 0) < 0x80000000 ? 'left' : 'right'
}

export function branchRoute(progress: number, branch: 'left' | 'right') {
  if (!Number.isFinite(progress) || !['left', 'right'].includes(branch)) throw new Error('Invalid branch route')
  const z = -BRANCH.extent + 2 * BRANCH.extent * progress
  const bend = z <= -1 ? 0 : z >= 1 ? z : (z + 1) ** 2 / 4
  const slope = z <= -1 ? 0 : z >= 1 ? 1 : (z + 1) / 2
  const sign = branch === 'left' ? -1 : 1
  const tangent = new Vector3(sign * Math.tan(BRANCH.angle) * slope, 0, 1).normalize()
  return { center: new Vector3(sign * Math.tan(BRANCH.angle) * bend, 0, z), tangent, normal: new Vector3(tangent.z, 0, -tangent.x) }
}

const seeds = cellSeeds(240)
export function branchCellFrame(id: number, time: number) {
  const branch = branchForId(id)
  if (!Number.isFinite(time) || id >= seeds.length) throw new Error('Invalid branch frame')
  const seed = seeds[id]!
  const progress = -.3 + Math.max(0, Math.min(FLOW.duration, time)) / FLOW.duration * 1.6 + seed[0] * .25
  const frame = branchRoute(progress, branch)
  const center = frame.center.addScaledVector(frame.normal, seed[1] * BRANCH.lane * Math.cos(seed[2]))
  center.y += seed[1] * BRANCH.lane * Math.sin(seed[2])
  const scale = Math.max(0, Math.min(1, (progress - .04) / .04, (.96 - progress) / .04))
  return { id, branch, owner: (progress < .5 ? 'root' : branch) as BranchId, progress, center, tangent: frame.tangent, scale }
}
