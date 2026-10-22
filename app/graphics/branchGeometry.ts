import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'
import { BRANCH } from './branchModel.ts'

const sin = Math.sin(BRANCH.angle), cos = Math.cos(BRANCH.angle)
const smoothMax = (a: number, b: number) => Math.max(a, b) + Math.max(0, .24 - Math.abs(a - b)) ** 2 / (.24 * 4)
function corridor(x: number, y: number, z: number, extra: number) {
  let field = BRANCH.radius + extra - Math.hypot(x, y, Math.max(0, z))
  for (const sign of [-1, 1]) {
    const along = Math.max(0, sign * x * sin + z * cos)
    field = smoothMax(field, BRANCH.childRadius + extra - Math.hypot(x - sign * along * sin, y, z - along * cos))
  }
  return field
}

export function branchWallField(x: number, y: number, z: number) {
  return Math.min(corridor(x, y, z, BRANCH.wall), -corridor(x, y, z, 0), -y,
    z + BRANCH.extent, BRANCH.extent / cos - x * sin - z * cos, BRANCH.extent / cos + x * sin - z * cos)
}

// A consistent tetrahedral split stitches every cell face without an ambiguous
// marching-cubes case; polygonizing the wall volume also creates cut edges/rims.
export function branchWallGeometry() {
  const step = BRANCH.grid, origin = [-5.413, -1.213, -6.253], counts = [182, 24, 220]
  const points: Vector3[] = [], values: number[] = []
  const index = (x: number, y: number, z: number) => (z * (counts[1]! + 1) + y) * (counts[0]! + 1) + x
  for (let z = 0; z <= counts[2]!; z++) for (let y = 0; y <= counts[1]!; y++) for (let x = 0; x <= counts[0]!; x++) {
    const point = new Vector3(origin[0]! + x * step, origin[1]! + y * step, origin[2]! + z * step)
    const value = branchWallField(point.x, point.y, point.z)
    points.push(point); values.push(Math.abs(value) < 1e-5 ? 0 : value)
  }
  const vertices: number[] = [], triangles: number[] = [], welded = new Map<string, number>()
  const vertex = (point: Vector3) => {
    const key = point.toArray().map(n => Math.round(n * 1e7)).join(',')
    let id = welded.get(key)
    if (id === undefined) { id = vertices.length / 3; vertices.push(...point.toArray()); welded.set(key, id) }
    return id
  }
  const split = [[0, 1, 3, 7], [0, 3, 2, 7], [0, 2, 6, 7], [0, 6, 4, 7], [0, 4, 5, 7], [0, 5, 1, 7]]
  for (let z = 0; z < counts[2]!; z++) for (let y = 0; y < counts[1]!; y++) for (let x = 0; x < counts[0]!; x++) {
    const cube = [index(x, y, z), index(x + 1, y, z), index(x, y + 1, z), index(x + 1, y + 1, z), index(x, y, z + 1), index(x + 1, y, z + 1), index(x, y + 1, z + 1), index(x + 1, y + 1, z + 1)]
    if (cube.every(i => values[i]! <= 0) || cube.every(i => values[i]! > 0)) continue
    for (const tetra of split) {
      const ids = tetra.map(i => cube[i]!), inside = ids.filter(i => values[i]! > 0), outside = ids.filter(i => values[i]! <= 0)
      if (!inside.length || !outside.length) continue
      const intersections = new Map<string, Vector3>()
      for (const a of inside) for (const b of outside) {
        const point = points[a]!.clone().lerp(points[b]!, values[a]! / (values[a]! - values[b]!))
        intersections.set(point.toArray().map(n => Math.round(n * 1e7)).join(','), point)
      }
      const polygon = [...intersections.values()]
      if (polygon.length < 3) continue
      const center = polygon.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(polygon.length)
      const mean = (list: number[]) => list.reduce((sum, i) => sum.add(points[i]!), new Vector3()).divideScalar(list.length)
      const normal = mean(outside).sub(mean(inside)).normalize(), axis = polygon[0]!.clone().sub(center).normalize(), up = normal.clone().cross(axis).normalize()
      polygon.sort((a, b) => Math.atan2(a.clone().sub(center).dot(up), a.clone().sub(center).dot(axis)) - Math.atan2(b.clone().sub(center).dot(up), b.clone().sub(center).dot(axis)))
      for (let i = 1; i < polygon.length - 1; i++) {
        const a = polygon[0]!, b = polygon[i]!, c = polygon[i + 1]!, cross = b.clone().sub(a).cross(c.clone().sub(a))
        if (cross.lengthSq() === 0) continue
        const ids = [vertex(a), vertex(b), vertex(c)]
        if (new Set(ids).size !== 3) continue
        if (cross.dot(normal) < 0) [ids[1], ids[2]] = [ids[2]!, ids[1]!]
        triangles.push(...ids)
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setIndex(triangles)
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere()
  return geometry
}
