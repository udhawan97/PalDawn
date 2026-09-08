import { Box3, Vector3 } from 'three'

export type StudyView = 'front' | 'left' | 'back' | 'right'
const directions: Record<StudyView, [number, number, number]> = {
  front: [0, 0.06, 1], left: [-1, 0.06, 0], back: [0, 0.06, -1], right: [1, 0.06, 0],
}

// Fit all eight world-space bounds corners inside the actual canvas aspect.
// No sidebar offsets: the canvas occupies only the unobscured layout column.
export function fitStudyCamera(bounds: Box3, aspect: number, view: StudyView | Vector3, fov = 34) {
  const target = bounds.getCenter(new Vector3())
  const direction = (typeof view === 'string' ? new Vector3(...directions[view]) : view.clone()).normalize()
  const right = new Vector3(0, 1, 0).cross(direction).normalize()
  const up = direction.clone().cross(right)
  const tangent = Math.tan(fov * Math.PI / 360)
  let distance = 0
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const offset = new Vector3(x, y, z).sub(target)
    distance = Math.max(distance,
      Math.abs(offset.dot(right)) / (tangent * Math.max(0.05, aspect) * 0.80) + offset.dot(direction),
      Math.abs(offset.dot(up)) / (tangent * 0.80) + offset.dot(direction),
    )
  }
  distance = Math.max(0.5, distance)
  return { position: target.clone().addScaledVector(direction, distance), target, distance }
}
