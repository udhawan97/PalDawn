import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  CircleGeometry,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  ShaderMaterial,
} from 'three'
import { PORTAL_CENTER, ROUTE_LOOKUP, ROUTE_LOOKUP_COUNT, smoothRange } from '../journey/route'
import { resolveTier, useSettings, type ResolvedTier } from '../state/settings'
import { useExperience } from '../state/experience'

const INSTANCE_COUNTS: Record<ResolvedTier, number> = {
  high: 4_000,
  balanced: 2_000,
  low: 750,
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

const vertexShader = /* glsl */ `
  #define ROUTE_COUNT ${ROUTE_LOOKUP_COUNT}

  uniform float uTime;
  uniform float uReveal;
  uniform vec3 uRoute[ROUTE_COUNT];
  attribute float aPhase;
  attribute float aRadius;
  attribute float aAngle;
  attribute float aSpeed;
  attribute float aSeed;
  varying float vGlow;
  varying float vReveal;

  vec3 routeAt(float routeProgress) {
    float scaled = clamp(routeProgress, 0.0, 0.999999) * float(ROUTE_COUNT - 1);
    int index = int(floor(scaled));
    float amount = fract(scaled);
    vec3 a = uRoute[index];
    vec3 b = uRoute[min(index + 1, ROUTE_COUNT - 1)];
    return mix(a, b, amount);
  }

  void main() {
    float localProgress = fract(aPhase + uTime * aSpeed);
    float routeProgress = ${PORTAL_CENTER.toFixed(4)} + localProgress * ${(1 - PORTAL_CENTER).toFixed(4)};
    vec3 center = routeAt(routeProgress);
    vec3 ahead = routeAt(min(1.0, routeProgress + 0.002));
    vec3 tangent = normalize(ahead - center);
    vec3 reference = abs(tangent.y) > 0.92 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 normal = normalize(cross(tangent, reference));
    vec3 binormal = normalize(cross(tangent, normal));
    float angle = aAngle + sin(uTime * 0.34 + aSeed * 8.0) * 0.18;
    float drift = sin(uTime * 0.52 + aSeed * 13.0) * 0.035;
    vec3 radial = normal * cos(angle) + binormal * sin(angle);
    vec3 marker = normal * position.x + binormal * position.y;
    vec3 worldPosition = center + radial * (aRadius + drift) + marker;

    vGlow = 0.55 + 0.45 * sin(aSeed * 21.0 + uTime * 1.7);
    vReveal = uReveal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPosition, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vGlow;
  varying float vReveal;

  void main() {
    vec3 color = mix(uColorA, uColorB, vGlow);
    gl_FragColor = vec4(color, (0.2 + vGlow * 0.42) * vReveal);
  }
`

export function FlowField() {
  const materialRef = useRef<ShaderMaterial>(null)
  const qualityTier = useSettings((state) => state.qualityTier)
  const reducedMotion = useSettings((state) => state.reducedMotion)
  const tier = resolveTier(qualityTier)

  const geometry = useMemo(() => {
    const base = new CircleGeometry(0.009, 6)
    const instanced = new InstancedBufferGeometry()
    instanced.index = base.index
    instanced.setAttribute('position', base.getAttribute('position'))
    instanced.setAttribute('uv', base.getAttribute('uv'))

    const maxCount = INSTANCE_COUNTS.high
    const phase = new Float32Array(maxCount)
    const radius = new Float32Array(maxCount)
    const angle = new Float32Array(maxCount)
    const speed = new Float32Array(maxCount)
    const seed = new Float32Array(maxCount)
    const random = seededRandom(0x50414c44)

    for (let index = 0; index < maxCount; index += 1) {
      phase[index] = random()
      radius[index] = 0.12 + Math.sqrt(random()) * 0.82
      angle[index] = random() * Math.PI * 2
      speed[index] = 0.018 + random() * 0.028
      seed[index] = random()
    }

    instanced.setAttribute('aPhase', new InstancedBufferAttribute(phase, 1))
    instanced.setAttribute('aRadius', new InstancedBufferAttribute(radius, 1))
    instanced.setAttribute('aAngle', new InstancedBufferAttribute(angle, 1))
    instanced.setAttribute('aSpeed', new InstancedBufferAttribute(speed, 1))
    instanced.setAttribute('aSeed', new InstancedBufferAttribute(seed, 1))
    instanced.instanceCount = INSTANCE_COUNTS.balanced
    base.dispose()
    return instanced
  }, [])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uRoute: { value: ROUTE_LOOKUP },
      uColorA: { value: new Color('#d84959') },
      uColorB: { value: new Color('#f6b45f') },
    }),
    [],
  )

  useEffect(() => {
    geometry.instanceCount = INSTANCE_COUNTS[tier]
  }, [geometry, tier])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((state) => {
    const material = materialRef.current
    if (!material) return
    const progress = useExperience.getState().progress
    material.uniforms.uTime.value = reducedMotion
      ? progress * 8
      : state.clock.elapsedTime
    material.uniforms.uReveal.value = smoothRange(progress, 0.46, 0.62)
  })

  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={3}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        depthTest
        side={DoubleSide}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}
