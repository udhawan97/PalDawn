import { CatmullRomCurve3, Curve, Vector3 } from 'three'

export const PORTAL_START = 0.4
export const PORTAL_CENTER = 0.49
export const PORTAL_END = 0.58
export const ROUTE_LOOKUP_COUNT = 32

const AUTHOR_POINTS = [
  [-5.8, 2.7, 8.2],
  [-4.5, 1.7, 5.6],
  [-3.1, 1.2, 3.7],
  [-1.9, 1.05, 2.35],
  [-1.15, 0.62, 1.55],
  [-0.55, 0.18, 0.72],
  [-0.08, -0.08, -0.2],
  [0.35, 0.18, -2.15],
  [-0.35, 0.55, -4.35],
  [0.42, -0.36, -6.75],
  [-0.2, 0.22, -9.25],
  [0.08, 0, -12.2],
] as const

const authoredCurve = new CatmullRomCurve3(
  AUTHOR_POINTS.map(([x, y, z]) => new Vector3(x, y, z)),
  false,
  'centripetal',
  0.5,
)

/**
 * Immutable, normalized route samples. Camera, tube, guide line and GPU flow
 * all consume this lookup rather than maintaining subtly different curves.
 */
export const ROUTE_LOOKUP = Array.from(
  { length: ROUTE_LOOKUP_COUNT },
  (_, index) => authoredCurve.getPointAt(index / (ROUTE_LOOKUP_COUNT - 1)),
)

class NormalizedLookupCurve extends Curve<Vector3> {
  constructor() {
    super()
  }

  getPoint(progress: number, target = new Vector3()): Vector3 {
    const scaled = Math.min(0.999999, Math.max(0, progress)) *
      (ROUTE_LOOKUP.length - 1)
    const index = Math.floor(scaled)
    const amount = scaled - index
    return target
      .copy(ROUTE_LOOKUP[index])
      .lerp(ROUTE_LOOKUP[Math.min(index + 1, ROUTE_LOOKUP.length - 1)], amount)
  }
}

export const voyageRoute = new NormalizedLookupCurve()

const FRAME_SEGMENTS = 256
const frames = voyageRoute.computeFrenetFrames(FRAME_SEGMENTS, false)

export interface RouteFrame {
  position: Vector3
  tangent: Vector3
  normal: Vector3
  binormal: Vector3
}

export function routeFrameAt(progress: number): RouteFrame {
  const value = Math.min(1, Math.max(0, progress))
  const scaled = value * FRAME_SEGMENTS
  const lower = Math.min(FRAME_SEGMENTS - 1, Math.floor(scaled))
  const upper = Math.min(FRAME_SEGMENTS, lower + 1)
  const amount = scaled - lower

  return {
    position: voyageRoute.getPoint(value),
    tangent: voyageRoute.getTangent(value).normalize(),
    normal: frames.normals[lower].clone().lerp(frames.normals[upper], amount).normalize(),
    binormal: frames.binormals[lower]
      .clone()
      .lerp(frames.binormals[upper], amount)
      .normalize(),
  }
}

export class RouteSlice extends Curve<Vector3> {
  constructor(
    private readonly start: number,
    private readonly end: number,
  ) {
    super()
  }

  getPoint(progress: number, target = new Vector3()): Vector3 {
    return voyageRoute.getPoint(
      this.start + (this.end - this.start) * progress,
      target,
    )
  }
}

export function smoothRange(value: number, start: number, end: number): number {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)))
  return t * t * (3 - 2 * t)
}
