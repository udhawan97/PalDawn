import { BufferGeometry, Float32BufferAttribute, SphereGeometry, Vector3 } from 'three'

// Original synthetic engineering fixture. Arbitrary units, no anatomical mapping.
export const FLOW = Object.freeze({ radius: 6, arc: 1.4, wall: .9, cell: .18, clearance: .08, duration: 12, speed: .12 })
export const FLOW_COUNTS = { low: 80, high: 240 } as const
export type FlowQuality = keyof typeof FLOW_COUNTS

export function routeFrame(s: number) {
  const angle = (s - .5) * FLOW.arc
  return {
    center: new Vector3(FLOW.radius * Math.sin(angle), 0, FLOW.radius * (Math.cos(angle) - 1)),
    tangent: new Vector3(Math.cos(angle), 0, -Math.sin(angle)),
    normal: new Vector3(Math.sin(angle), 0, Math.cos(angle)),
  }
}

export function cellSeeds(count: number) {
  let seed = 173
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
  return Array.from({ length: count }, () => [
    random() * 2 - 1,
    Math.sqrt(random()) * (FLOW.wall - FLOW.cell - FLOW.clearance),
    random() * Math.PI * 2,
    random() * Math.PI * 2,
  ] as const)
}

export function cellFrame(seed: readonly number[], time: number) {
  const s = seed[0]! + Math.max(0, Math.min(FLOW.duration, time)) * FLOW.speed
  const frame = routeFrame(s)
  const center = frame.center.clone().addScaledVector(frame.normal, seed[1]! * Math.cos(seed[2]!))
  center.y += seed[1]! * Math.sin(seed[2]!)
  const scale = Math.max(0, Math.min(1, (s - .04) / .04, (.96 - s) / .04))
  return { s, center, scale }
}

export function cellGeometry() {
  const geometry = new SphereGeometry(FLOW.cell, 20, 14)
  const positions = geometry.getAttribute('position')
  for (let i = 0; i < positions.count; i++) {
    const radial = (positions.getX(i) ** 2 + positions.getZ(i) ** 2) / FLOW.cell ** 2
    positions.setY(i, positions.getY(i) * .35 * (.25 + .75 * radial))
  }
  geometry.computeVertexNormals()
  return geometry
}

// Lower half of a curved wall, including inner/outer surfaces, cut edges and end rims.
export function wallGeometry() {
  const positions: number[] = [], indices: number[] = []
  const rows = 80, columns = 40
  for (const radius of [FLOW.wall, FLOW.wall + .12]) {
    for (let i = 0; i <= rows; i++) {
      const { center, normal } = routeFrame(i / rows)
      for (let j = 0; j <= columns; j++) {
        const phi = Math.PI + j / columns * Math.PI
        const point = center.clone().addScaledVector(normal, radius * Math.cos(phi))
        positions.push(point.x, radius * Math.sin(phi), point.z)
      }
    }
  }
  const stride = columns + 1, layer = (rows + 1) * stride
  const quad = (a: number, b: number, c: number, d: number) => indices.push(a, c, b, a, d, c)
  for (let i = 0; i < rows; i++) for (let j = 0; j < columns; j++) {
    const a = i * stride + j, b = a + stride
    quad(a, b, b + 1, a + 1)
    quad(a + layer, a + layer + 1, b + layer + 1, b + layer)
  }
  for (let i = 0; i < rows; i++) {
    const a = i * stride, b = a + stride
    quad(a, a + layer, b + layer, b)
    quad(a + columns, b + columns, b + columns + layer, a + columns + layer)
  }
  for (let j = 0; j < columns; j++) {
    quad(j, j + 1, j + 1 + layer, j + layer)
    const a = rows * stride + j
    quad(a, a + layer, a + layer + 1, a + 1)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

// The same route constants drive the wall and the GPU's analytic cell positions.
export const flowShader = `
attribute vec4 flowSeed;
uniform float studyTime;
float flowS() { return flowSeed.x + studyTime * ${FLOW.speed}; }
float flowScale() { float s = flowS(); return max(0.0, min(1.0, min((s - 0.04) / 0.04, (0.96 - s) / 0.04))); }
mat3 flowBasis() {
  float a = (flowS() - 0.5) * ${FLOW.arc};
  float roll = flowSeed.w + studyTime * 0.4;
  mat3 frame = mat3(vec3(cos(a), 0.0, -sin(a)), vec3(0.0, 1.0, 0.0), vec3(sin(a), 0.0, cos(a)));
  return frame * mat3(vec3(cos(roll), sin(roll), 0.0), vec3(-sin(roll), cos(roll), 0.0), vec3(0.0, 0.0, 1.0));
}
vec3 flowCenter() {
  float a = (flowS() - 0.5) * ${FLOW.arc};
  vec3 center = vec3(${FLOW.radius.toFixed(1)} * sin(a), 0.0, ${FLOW.radius.toFixed(1)} * (cos(a) - 1.0));
  return center + vec3(sin(a), 0.0, cos(a)) * flowSeed.y * cos(flowSeed.z) + vec3(0.0, flowSeed.y * sin(flowSeed.z), 0.0);
}
`
