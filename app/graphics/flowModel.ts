import { BufferGeometry, Float32BufferAttribute, SphereGeometry, Vector3 } from 'three'

// Original synthetic engineering fixture. Arbitrary units, no anatomical mapping.
export const FLOW = Object.freeze({ radius: 6, arc: 1.4, wall: .9, cell: .18, clearance: .08, duration: 12, speed: .12 })
export const FLOW_COUNTS = { low: 80, high: 240 } as const
export type FlowQuality = keyof typeof FLOW_COUNTS
export const FLOW_VIEW = new Vector3(0, .68, .74)
export const FLOW_ROWS = 80
export const FLOW_PROFILES = {
  uniform: { label: 'Uniform', description: 'A constant opening along the full curve.', radius: (_s: number) => FLOW.wall },
  tapered: { label: 'Tapered', description: 'A gradual change from a wide entrance to a smaller exit.', radius: (s: number) => 1.1 - .5 * s },
  narrowed: { label: 'Narrowed', description: 'A smaller middle section that opens out again. This is a geometry test, not a disease model.', radius: (s: number) => 1 - .5 * Math.sin(Math.PI * s) ** 2 },
} as const
export type FlowProfile = keyof typeof FLOW_PROFILES

// RGBA samples are shared verbatim by wall generation and the vertex shader:
// R = inner radius, G = conservative center-lane radius. No anatomy units.
export function createRadiusTable(radii: readonly number[]) {
  if (radii.length !== FLOW_ROWS + 1 || radii.some(r => !Number.isFinite(r) || r <= 0 || r >= FLOW.radius / 2)) {
    throw new Error('Radius profile requires 81 finite, positive radii below half the bend radius')
  }
  const maxRadius = Math.max(...radii)
  const maxSlope = Math.max(...radii.slice(1).map((r, i) => Math.abs(r - radii[i]!) * FLOW_ROWS))
  // Every point in the cell + clearance sphere lies within this angular span.
  // Subtracting the worst possible radius drop over that span handles taper:
  // checking only the radius at the cell center would allow wall intersections.
  const span = Math.asin((FLOW.cell + FLOW.clearance) / (FLOW.radius - maxRadius)) / FLOW.arc
  const inset = FLOW.cell + FLOW.clearance + maxSlope * span
  const table = new Float32Array(radii.length * 4)
  radii.forEach((radius, i) => {
    if (radius <= inset) throw new Error('Radius profile leaves no safe lane for full cell geometry')
    table.set([radius, radius - inset, 0, 1], i * 4)
  })
  return table
}

export function radiusTable(profile: FlowProfile) {
  return createRadiusTable(Array.from({ length: FLOW_ROWS + 1 }, (_, i) => FLOW_PROFILES[profile].radius(i / FLOW_ROWS)))
}

export function radiusSample(table: Float32Array, s: number) {
  const index = Math.max(0, Math.min(1, s)) * FLOW_ROWS
  const left = Math.min(FLOW_ROWS - 1, Math.floor(index)), mix = index - left
  return {
    radius: table[left * 4]! * (1 - mix) + table[(left + 1) * 4]! * mix,
    lane: table[left * 4 + 1]! * (1 - mix) + table[(left + 1) * 4 + 1]! * mix,
  }
}

export const UNIFORM_RADII = radiusTable('uniform')

export function flowBounds(wall: BufferGeometry) {
  wall.computeBoundingBox()
  const bounds = wall.boundingBox!.clone()
  // Include cells in the removed upper half, not just the visible wall.
  bounds.max.y = -bounds.min.y
  return bounds
}

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
    Math.sqrt(random()),
    random() * Math.PI * 2,
    random() * Math.PI * 2,
  ] as const)
}

export function cellFrame(seed: readonly number[], time: number, radii = UNIFORM_RADII) {
  const s = seed[0]! + Math.max(0, Math.min(FLOW.duration, time)) * FLOW.speed
  const frame = routeFrame(s)
  const lane = radiusSample(radii, s).lane * seed[1]!
  const center = frame.center.clone().addScaledVector(frame.normal, lane * Math.cos(seed[2]!))
  center.y += lane * Math.sin(seed[2]!)
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
export function wallGeometry(radii = UNIFORM_RADII) {
  const positions: number[] = [], indices: number[] = []
  const rows = FLOW_ROWS, columns = 40
  for (const thickness of [0, .12]) {
    for (let i = 0; i <= rows; i++) {
      const radius = radiusSample(radii, i / rows).radius + thickness
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
uniform sampler2D radiusLookup;
vec2 flowRadius(float s) {
  float index = clamp(s, 0.0, 1.0) * ${FLOW_ROWS.toFixed(1)};
  int left = min(${FLOW_ROWS - 1}, int(floor(index)));
  return mix(texelFetch(radiusLookup, ivec2(left, 0), 0).rg, texelFetch(radiusLookup, ivec2(left + 1, 0), 0).rg, index - float(left));
}
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
  float lane = flowRadius(flowS()).y * flowSeed.y;
  return center + vec3(sin(a), 0.0, cos(a)) * lane * cos(flowSeed.z) + vec3(0.0, lane * sin(flowSeed.z), 0.0);
}
`
