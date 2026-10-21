import { Box3, Vector3 } from 'three'
import { branchRoute } from './branchModel.ts'
import { fitStudyCamera } from './cameraFit.ts'

export const SHOTS = ['overview', 'junction', 'inside'] as const
export type ShotId = typeof SHOTS[number]
type Shot = { id: ShotId; start: number; end: number; caption: string; source: string }
export type SceneSpec = { version: number; shots: readonly Shot[] }
export const SYNTHETIC_SCENE: SceneSpec = Object.freeze({ version: 1, shots: Object.freeze([
  Object.freeze({ id: 'overview' as const, start: 0, end: 4, caption: 'overview-opening', source: 'synthetic:y-v1' }),
  Object.freeze({ id: 'junction' as const, start: 4, end: 8, caption: 'junction-choice', source: 'synthetic:y-v1' }),
  Object.freeze({ id: 'inside' as const, start: 8, end: 12, caption: 'inside-passage', source: 'synthetic:y-v1' }),
]) })
export const CAPTIONS = {
  'overview-opening': 'Locate one parent opening and two exits. The upper wall is removed for inspection.',
  'junction-choice': 'Each seeded form keeps one branch choice. The opening has no cap or handoff fade.',
  'inside-passage': 'Inspect the central lane from inside one exit. Teaching time and scale are arbitrary.',
} as const

export function validateSceneSpec(value: unknown): asserts value is SceneSpec {
  const fail = () => { throw new Error('Invalid synthetic scene specification') }
  if (!value || typeof value !== 'object') return fail()
  const spec = value as SceneSpec
  if (spec.version !== 1 || !Array.isArray(spec.shots) || spec.shots.length !== 3) return fail()
  for (let i = 0; i < 3; i++) {
    const shot = spec.shots[i], expected = SYNTHETIC_SCENE.shots[i]!
    if (!shot || shot.id !== expected.id || shot.caption !== expected.caption || shot.source !== expected.source || !Number.isFinite(shot.start) || !Number.isFinite(shot.end) || shot.start !== expected.start || shot.end !== expected.end) return fail()
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
  const t = teachingTime(time), shot = shotAt(t), aspect = viewport.width / viewport.height
  let targetBounds = (shot.id === 'overview' ? bounds.whole : bounds.junction).clone()
  let position: Vector3, target: Vector3
  if (shot.id === 'inside') {
    const local = viewport.reduced ? 0 : (t - 8) / 4
    const route = branchRoute(.70 + .025 * local, 'right')
    target = route.center.clone().addScaledVector(route.tangent, 1); target.y = -.12
    targetBounds = new Box3(target.clone().addScalar(-.06), target.clone().addScalar(.06))
    const fit = fitStudyCamera(targetBounds, aspect, route.tangent.clone().negate())
    const distance = Math.max(1, fit.distance)
    if (distance > 1.5) throw new Error('Viewport too narrow for the interior target')
    position = target.clone().addScaledVector(route.tangent, -distance)
  } else {
    const fit = fitStudyCamera(targetBounds, aspect, new Vector3(0, 1, .3))
    position = fit.position; target = fit.target
  }
  return { version: 1, shot: shot.id, time: t, flowTime: t, deformationPhase: 0, layers: ['wall', 'cells'], caption: shot.caption, sources: [shot.source], camera: { position: position.toArray(), target: target.toArray(), near: .05, far: 150 }, framingBounds: [targetBounds.min.toArray(), targetBounds.max.toArray()] }
}
