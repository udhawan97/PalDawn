import { Box3, Vector3 } from 'three'
import { branchRoute } from './branchModel.ts'
import { fitStudyCamera } from './cameraFit.ts'

export const SHOTS = ['overview', 'junction', 'inside'] as const
export type ShotId = typeof SHOTS[number]
type CameraPolicy = { kind: 'fit'; region: 'whole' | 'junction'; direction: readonly number[] } | { kind: 'inside'; branch: 'right'; progress: readonly number[]; lookAhead: number; height: number; crossSection: { halfWidth: number; halfHeight: number }; clipping: 'surrounding-wall' }
type Shot = { id: ShotId; start: number; end: number; caption: string; source: string; flow: { from: number; to: number }; camera: CameraPolicy }
export type SceneSpec = { version: number; shots: readonly Shot[] }
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}
export const SYNTHETIC_SCENE: SceneSpec = freeze({ version: 1, shots: [
  { id: 'overview', start: 0, end: 4, caption: 'overview-opening', source: 'synthetic:y-v1', flow: { from: 0, to: 4 }, camera: { kind: 'fit', region: 'whole', direction: [0, 1, .3] } },
  { id: 'junction', start: 4, end: 8, caption: 'junction-choice', source: 'synthetic:y-v1', flow: { from: 4, to: 8 }, camera: { kind: 'fit', region: 'junction', direction: [0, 1, .3] } },
  { id: 'inside', start: 8, end: 12, caption: 'inside-passage', source: 'synthetic:y-v1', flow: { from: 8, to: 12 }, camera: { kind: 'inside', branch: 'right', progress: [.70, .725], lookAhead: 1, height: -.12, crossSection: { halfWidth: .06, halfHeight: .06 }, clipping: 'surrounding-wall' } },
] })
export const CAPTIONS = {
  'overview-opening': 'Locate one parent opening and two exits. The upper wall is removed for inspection.',
  'junction-choice': 'Each seeded form keeps one branch choice. The opening has no cap or handoff fade.',
  'inside-passage': 'Inspect the central lane from inside one exit. Teaching time and scale are arbitrary.',
} as const

export function validateSceneSpec(value: unknown): asserts value is SceneSpec {
  const fail = () => { throw new Error('Invalid synthetic scene specification') }
  const numbers = (actual: unknown, expected: readonly number[]) => Array.isArray(actual) && actual.length === expected.length && expected.every((n, i) => typeof actual[i] === 'number' && Number.isFinite(actual[i]) && actual[i] === n)
  if (!value || typeof value !== 'object') return fail()
  const spec = value as SceneSpec
  if (spec.version !== 1 || !Array.isArray(spec.shots) || spec.shots.length !== 3) return fail()
  for (let i = 0; i < 3; i++) {
    const shot = spec.shots[i], expected = SYNTHETIC_SCENE.shots[i]!
    if (!shot || shot.id !== expected.id || shot.caption !== expected.caption || shot.source !== expected.source || !Number.isFinite(shot.start) || !Number.isFinite(shot.end) || shot.start !== expected.start || shot.end !== expected.end || !shot.flow || shot.flow.from !== expected.flow.from || shot.flow.to !== expected.flow.to || !shot.camera) return fail()
    const camera = shot.camera, policy = expected.camera
    if (camera.kind === 'fit' && policy.kind === 'fit') {
      if (camera.region !== policy.region || !numbers(camera.direction, policy.direction)) return fail()
    } else if (camera.kind === 'inside' && policy.kind === 'inside') {
      if (camera.branch !== policy.branch || !numbers(camera.progress, policy.progress) || camera.lookAhead !== policy.lookAhead || camera.height !== policy.height || !camera.crossSection || camera.crossSection.halfWidth !== policy.crossSection.halfWidth || camera.crossSection.halfHeight !== policy.crossSection.halfHeight || camera.clipping !== policy.clipping) return fail()
    } else return fail()
  }
}
export function teachingTime(time: number) {
  if (!Number.isFinite(time)) throw new Error('Invalid teaching time')
  return Math.max(0, Math.min(12, time))
}
export function shotAt(time: number): Shot {
  const t = teachingTime(time)
  return SYNTHETIC_SCENE.shots.find(shot => t < shot.end) ?? SYNTHETIC_SCENE.shots[2]!
}
export type SceneBounds = { whole: Box3; junction: Box3 }
export function resolveSceneFrame(spec: SceneSpec, time: number, viewport: { width: number; height: number; reduced?: boolean }, bounds: SceneBounds) {
  validateSceneSpec(spec)
  if (![viewport.width, viewport.height].every(Number.isFinite) || viewport.width <= 0 || viewport.height <= 0) throw new Error('Invalid scene viewport')
  const t = teachingTime(time), shot = spec.shots.find(shot => t < shot.end) ?? spec.shots[2]!, aspect = viewport.width / viewport.height
  const local = (t - shot.start) / (shot.end - shot.start), policy = shot.camera
  let targetBounds: Box3, position: Vector3, target: Vector3
  let crossSection: number[][] | null = null
  if (policy.kind === 'inside') {
    const progress = policy.progress[0]! + (policy.progress[1]! - policy.progress[0]!) * (viewport.reduced ? 0 : local)
    const route = branchRoute(progress, policy.branch)
    target = route.center.clone().addScaledVector(route.tangent, policy.lookAhead); target.y = policy.height
    // A declared forward central-lane plane, not the surrounding vessel bounds.
    crossSection = []
    for (const x of [-1, 1]) for (const y of [-1, 1]) crossSection.push(target.clone().addScaledVector(route.normal, x * policy.crossSection.halfWidth).add(new Vector3(0, y * policy.crossSection.halfHeight, 0)).toArray())
    targetBounds = new Box3().setFromPoints(crossSection.map(p => new Vector3().fromArray(p)))
    const fit = fitStudyCamera(targetBounds, aspect, route.tangent.clone().negate())
    const distance = Math.max(policy.lookAhead, fit.distance)
    if (distance > 1.5) throw new Error('Viewport too narrow for the interior target')
    position = target.clone().addScaledVector(route.tangent, -distance)
  } else {
    targetBounds = bounds[policy.region].clone()
    const fit = fitStudyCamera(targetBounds, aspect, new Vector3().fromArray(policy.direction))
    position = fit.position; target = fit.target
  }
  return { version: 1, shot: shot.id, time: t, viewport: { width: viewport.width, height: viewport.height }, flowTime: shot.flow.from + (shot.flow.to - shot.flow.from) * local, deformationPhase: 0, layers: ['wall', 'cells'], caption: shot.caption, sources: [shot.source], camera: { position: position.toArray(), target: target.toArray(), near: .05, far: 150 }, framingBounds: [targetBounds.min.toArray(), targetBounds.max.toArray()], crossSection, clipping: policy.kind === 'inside' ? policy.clipping : 'none' }
}
