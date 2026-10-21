import { Vector3 } from 'three'
import { FLOW, cellSeeds } from './flowModel.ts'

export const BRANCH = Object.freeze({ version: 1, angle: 35 * Math.PI / 180, radius: .9, childRadius: .6, wall: .18, grid: .06, extent: 6, lane: .04 })
export type BranchId = 'root' | 'left' | 'right'
export type BranchSpec = { version: number; junction: readonly number[]; transform: readonly number[]; ownershipBoundary: number; radiusSamples: readonly (readonly number[])[]; ports: readonly { id: string; branch: string; kind: string; progress: number }[]; branches: readonly { id: string; parent: string | null; attachment: number; start: readonly number[]; end: readonly number[]; radius: number }[] }
const spread = BRANCH.extent * Math.tan(BRANCH.angle)
export const Y_SPEC: BranchSpec = {
  version: 1, junction: [-2, 2], transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  ownershipBoundary: .5,
  radiusSamples: [[0, .9], [1 / 3, .9], [2 / 3, .6], [1, .6]],
  ports: [{ id: 'entry', branch: 'root', kind: 'entry', progress: 0 }, { id: 'exit-left', branch: 'left', kind: 'exit', progress: 1 }, { id: 'exit-right', branch: 'right', kind: 'exit', progress: 1 }],
  branches: [
    { id: 'root', parent: null, attachment: 0, start: [0, 0, -6], end: [0, 0, 0], radius: .9 },
    { id: 'left', parent: 'root', attachment: 1, start: [0, 0, 0], end: [-spread, 0, 6], radius: .6 },
    { id: 'right', parent: 'root', attachment: 1, start: [0, 0, 0], end: [spread, 0, 6], radius: .6 },
  ],
}
for (const branch of Y_SPEC.branches) { Object.freeze(branch.start); Object.freeze(branch.end); Object.freeze(branch) }
for (const sample of Y_SPEC.radiusSamples) Object.freeze(sample)
for (const port of Y_SPEC.ports) Object.freeze(port)
Object.freeze(Y_SPEC.radiusSamples); Object.freeze(Y_SPEC.ports)
Object.freeze(Y_SPEC.branches); Object.freeze(Y_SPEC.junction); Object.freeze(Y_SPEC.transform); Object.freeze(Y_SPEC)

// Version 1 deliberately accepts one fixture, rather than promising unprobed trees.
export function validateBranchSpec(value: unknown): asserts value is BranchSpec {
  const fail = () => { throw new Error('Unsupported synthetic Y branch contract') }
  const numbers = (actual: unknown, expected: readonly number[]) => Array.isArray(actual) && actual.length === expected.length && expected.every((n, i) => typeof actual[i] === 'number' && Number.isFinite(actual[i]) && Math.abs(actual[i] - n) <= 1e-6)
  if (!value || typeof value !== 'object') return fail()
  const spec = value as BranchSpec
  if (spec.version !== 1 || !numbers(spec.junction, Y_SPEC.junction) || !numbers(spec.transform, Y_SPEC.transform) || !Array.isArray(spec.branches) || spec.branches.length !== 3) return fail()
  if (spec.ownershipBoundary !== .5 || !Array.isArray(spec.radiusSamples) || spec.radiusSamples.length !== 4 || !Y_SPEC.radiusSamples.every((sample, i) => numbers(spec.radiusSamples[i], sample))) return fail()
  if (!Array.isArray(spec.ports) || spec.ports.length !== 3 || !Y_SPEC.ports.every(expected => spec.ports.some(port => port?.id === expected.id && port.branch === expected.branch && port.kind === expected.kind && port.progress === expected.progress))) return fail()
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
  if (!Number.isFinite(progress) || progress < -1 || progress > 2 || !['left', 'right'].includes(branch)) throw new Error('Invalid branch route')
  const z = -BRANCH.extent + 2 * BRANCH.extent * progress
  const bend = z <= -1 ? 0 : z >= 1 ? z : (z + 1) ** 2 / 4
  const slope = z <= -1 ? 0 : z >= 1 ? 1 : (z + 1) / 2
  const sign = branch === 'left' ? -1 : 1
  const tangent = new Vector3(sign * Math.tan(BRANCH.angle) * slope, 0, 1).normalize()
  return { center: new Vector3(sign * Math.tan(BRANCH.angle) * bend, 0, z), tangent, normal: new Vector3(tangent.z, 0, -tangent.x) }
}

// Nominal radius transition; actual mesh clearance is independently probed.
export function branchRadius(progress: number) {
  if (!Number.isFinite(progress) || progress < -1 || progress > 2) throw new Error('Invalid radius progress')
  const t = Math.max(0, Math.min(1, (progress - 1 / 3) * 3))
  return BRANCH.radius + (BRANCH.childRadius - BRANCH.radius) * t * t * (3 - 2 * t)
}

const seeds = cellSeeds(240)
export function branchSeed(id: number) {
  const branch = branchForId(id)
  if (id >= seeds.length) throw new Error('Invalid branch identity')
  const seed = seeds[id]!
  return [seed[0] * .25, seed[1] * BRANCH.lane * Math.cos(seed[2]), seed[1] * BRANCH.lane * Math.sin(seed[2]), branch === 'left' ? -1 : 1]
}

// Shared by the instanced renderer and independent WebGL transform-feedback probes.
export const branchShader = `
attribute vec4 branchSeed;
uniform float studyTime;
float branchProgress() { return -.3 + clamp(studyTime, 0.0, 12.0) / 12.0 * 1.6 + branchSeed.x; }
float branchScale() { float s = branchProgress(); return max(0.0, min(1.0, min((s-.04)/.04, (.96-s)/.04))); }
vec3 branchCenter() {
  float z = -6.0 + 12.0 * branchProgress();
  float bend = z <= -1.0 ? 0.0 : z >= 1.0 ? z : (z+1.0)*(z+1.0)/4.0;
  float slope = z <= -1.0 ? 0.0 : z >= 1.0 ? 1.0 : (z+1.0)/2.0;
  vec3 tangent = normalize(vec3(branchSeed.w * ${Math.tan(BRANCH.angle)}, 0.0, 1.0) * vec3(slope, 1.0, 1.0));
  vec3 normal = vec3(tangent.z, 0.0, -tangent.x);
  return vec3(branchSeed.w * ${Math.tan(BRANCH.angle)} * bend, branchSeed.z, z) + normal * branchSeed.y;
}
`
export function branchCellFrame(id: number, time: number) {
  const branch = branchForId(id)
  if (!Number.isFinite(time) || id >= seeds.length) throw new Error('Invalid branch frame')
  const seed = seeds[id]!
  const progress = -.3 + Math.max(0, Math.min(FLOW.duration, time)) / FLOW.duration * 1.6 + seed[0] * .25
  const frame = branchRoute(progress, branch)
  const center = frame.center.addScaledVector(frame.normal, seed[1] * BRANCH.lane * Math.cos(seed[2]))
  center.y += seed[1] * BRANCH.lane * Math.sin(seed[2])
  const scale = Math.max(0, Math.min(1, (progress - .04) / .04, (.96 - progress) / .04))
  return { id, branch, owner: (progress < Y_SPEC.ownershipBoundary ? 'root' : branch) as BranchId, progress, center, tangent: frame.tangent, scale }
}
