import { useEffect, useMemo, useRef } from 'react'
import { Line, MeshPortalMaterial } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import {
  AdditiveBlending,
  BackSide,
  Color,
  Fog,
  Group,
  InstancedMesh,
  Matrix4,
  PerspectiveCamera,
  Quaternion,
  Vector3,
} from 'three'
import {
  PORTAL_CENTER,
  PORTAL_END,
  PORTAL_START,
  ROUTE_LOOKUP,
  RouteSlice,
  routeFrameAt,
  smoothRange,
  voyageRoute,
} from '../journey/route'
import { useExperience } from '../state/experience'
import { useAtlas } from '../state/atlas'
import { resolveTier, useSettings } from '../state/settings'
import { useTelemetry } from '../state/telemetry'
import { FlowField } from './FlowField'
import { HumanSystemsScene } from './HumanSystemsScene'

const DEEP_INK = new Color('#04070c')
const CORRIDOR_INK = new Color('#12050b')

function JourneyClock() {
  const playbackRate = useSettings((state) => state.playbackRate)
  useFrame((_, delta) => useExperience.getState().advance(delta, playbackRate))
  return null
}

function CameraDirector() {
  const lookAt = useRef(new Vector3())
  const reducedMotion = useSettings((state) => state.reducedMotion)
  const comfortVignette = useSettings((state) => state.comfortVignette)
  const progress = useExperience((state) => state.progress)
  const { camera, invalidate } = useThree()

  useEffect(() => invalidate(), [invalidate, progress])

  useFrame((_, delta) => {
    const value = useExperience.getState().progress
    const frame = routeFrameAt(value)
    const approach = 1 - smoothRange(value, 0.31, PORTAL_END)
    const desired = frame.position
      .clone()
      .addScaledVector(frame.normal, 0.2 + approach * 3.8)
      .addScaledVector(frame.binormal, approach * 1.25)
    const lookAhead = 0.02 + approach * 0.165
    const target = voyageRoute.getPoint(Math.min(1, value + lookAhead))
    const damping = reducedMotion ? 1 : 1 - Math.exp(-delta * 4.8)

    camera.position.lerp(desired, damping)
    lookAt.current.lerp(target, damping)
    camera.up.lerp(frame.normal, damping).normalize()
    camera.lookAt(lookAt.current)
    const nextFov = comfortVignette ? 43 : 48
    if (camera instanceof PerspectiveCamera && Math.abs(camera.fov - nextFov) > 0.01) {
      camera.fov += (nextFov - camera.fov) * damping
      camera.updateProjectionMatrix()
    }
  })

  return null
}

function FogDirector() {
  const fog = useMemo(() => new Fog(DEEP_INK, 5, 27), [])
  const { scene } = useThree()

  useEffect(() => {
    scene.fog = fog
    return () => {
      scene.fog = null
    }
  }, [fog, scene])

  useFrame(() => {
    const progress = useExperience.getState().progress
    const enter = smoothRange(progress, PORTAL_START, PORTAL_CENTER)
    const leave = smoothRange(progress, PORTAL_CENTER, PORTAL_END)
    const veil = enter * (1 - leave)
    const interior = smoothRange(progress, PORTAL_CENTER, PORTAL_END)
    fog.color.copy(DEEP_INK).lerp(CORRIDOR_INK, interior)
    fog.near = 4.8 - veil * 4.35 + interior * 0.1
    fog.far = 27 - veil * 24 + interior * -11
  })

  return null
}

function RuntimeProbe() {
  const samples = useRef<number[]>([])
  const frame = useRef(0)
  const update = useTelemetry((state) => state.update)

  useFrame(({ gl }, delta) => {
    samples.current.push(delta * 1000)
    if (samples.current.length > 240) samples.current.shift()
    frame.current += 1
    if (frame.current % 30 !== 0 || samples.current.length < 30) return

    const sorted = [...samples.current].sort((a, b) => a - b)
    const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
    const mean = samples.current.reduce((sum, value) => sum + value, 0) / samples.current.length
    update({
      fps: Math.round(1000 / mean),
      p95Ms: Number(sorted[p95Index].toFixed(1)),
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      samples: samples.current.length,
    })
  })

  return null
}

function SyntheticCore() {
  const group = useRef<Group>(null)
  const reducedMotion = useSettings((state) => state.reducedMotion)

  useFrame(({ clock }) => {
    if (!group.current) return
    const pulse = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * 1.35) * 0.026
    group.current.scale.setScalar(pulse)
  })

  return (
    <group ref={group} position={[-1.42, 0.28, 1.55]} rotation={[0.08, -0.28, -0.12]}>
      <mesh scale={[1.22, 1.4, 1]}>
        <icosahedronGeometry args={[1.52, 5]} />
        <meshPhysicalMaterial
          color="#582030"
          emissive="#260812"
          emissiveIntensity={1.15}
          roughness={0.48}
          metalness={0.04}
          clearcoat={0.5}
          clearcoatRoughness={0.52}
        />
      </mesh>
      <mesh scale={[1.235, 1.415, 1.015]}>
        <icosahedronGeometry args={[1.52, 2]} />
        <meshBasicMaterial color="#d55f68" wireframe transparent opacity={0.29} />
      </mesh>
      <mesh rotation={[Math.PI / 2.7, 0.18, 0]} scale={[1, 0.82, 1.06]}>
        <torusGeometry args={[2.02, 0.018, 6, 160]} />
        <meshBasicMaterial color="#75d9d2" transparent opacity={0.32} />
      </mesh>
      <mesh rotation={[0.2, Math.PI / 2.25, -0.4]} scale={[1, 0.84, 1]}>
        <torusGeometry args={[2.18, 0.012, 6, 160]} />
        <meshBasicMaterial color="#f0aa54" transparent opacity={0.24} />
      </mesh>
    </group>
  )
}

function DawnRoute() {
  const progress = useExperience((state) => state.progress)
  const guidePoints = useMemo(
    () => ROUTE_LOOKUP.slice(
      Math.floor(ROUTE_LOOKUP.length * 0.13),
      Math.ceil(ROUTE_LOOKUP.length * (PORTAL_END + 0.03)),
    ),
    [],
  )

  return (
    <group>
      <Line
        points={guidePoints}
        color="#f0aa54"
        lineWidth={1.6}
        transparent
        opacity={(1 - smoothRange(progress, 0.43, 0.58)) * 0.9}
      />
      <Line
        points={guidePoints}
        color="#f7d7a2"
        lineWidth={0.45}
        transparent
        opacity={(1 - smoothRange(progress, 0.43, 0.58)) * 0.9}
      />
    </group>
  )
}

function CorridorRings() {
  const mesh = useRef<InstancedMesh>(null)
  const ringCount = 22

  useEffect(() => {
    if (!mesh.current) return
    const matrix = new Matrix4()
    const quaternion = new Quaternion()
    const scale = new Vector3(1, 1, 1)
    const forward = new Vector3(0, 0, 1)
    for (let index = 0; index < ringCount; index += 1) {
      const progress = PORTAL_CENTER +
        ((index + 0.75) / ringCount) * (1 - PORTAL_CENTER)
      const frame = routeFrameAt(progress)
      quaternion.setFromUnitVectors(forward, frame.tangent)
      matrix.compose(frame.position, quaternion, scale)
      mesh.current.setMatrixAt(index, matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  }, [])

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, ringCount]}>
      <torusGeometry args={[1.08, 0.014, 5, 48]} />
      <meshBasicMaterial color="#c7793c" transparent opacity={0.11} depthWrite={false} />
    </instancedMesh>
  )
}

function ArrivalBeacon() {
  const group = useRef<Group>(null)
  const reducedMotion = useSettings((state) => state.reducedMotion)
  const frame = useMemo(() => routeFrameAt(0.985), [])

  useFrame(({ clock }) => {
    if (!group.current) return
    const pulse = reducedMotion ? 1 : 0.92 + Math.sin(clock.elapsedTime * 2.2) * 0.08
    group.current.scale.setScalar(pulse)
  })

  return (
    <group ref={group} position={frame.position}>
      <mesh>
        <octahedronGeometry args={[0.24, 0]} />
        <meshBasicMaterial color="#f7d7a2" toneMapped={false} />
      </mesh>
      <mesh scale={1.75}>
        <octahedronGeometry args={[0.24, 0]} />
        <meshBasicMaterial color="#f0aa54" wireframe transparent opacity={0.52} toneMapped={false} />
      </mesh>
      <pointLight color="#f0aa54" intensity={14} distance={5} />
    </group>
  )
}

function Corridor() {
  const curve = useMemo(() => new RouteSlice(PORTAL_CENTER - 0.025, 1), [])
  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 220, 1.24, 28, false]} />
        <meshPhysicalMaterial
          side={BackSide}
          color="#4c111f"
          emissive="#1b0309"
          emissiveIntensity={0.8}
          roughness={0.72}
          metalness={0}
          clearcoat={0.22}
          clearcoatRoughness={0.7}
        />
      </mesh>
      <CorridorRings />
      <FlowField />
      <ArrivalBeacon />
    </group>
  )
}

function PortalPreview() {
  return (
    <>
      <color attach="background" args={['#15060c']} />
      <ambientLight intensity={0.7} color="#e85c65" />
      <group position={[0, 0, -3.2]}>
        {[0, 1, 2, 3].map((index) => (
          <mesh key={index} position={[0, 0, -index * 1.3]}>
            <torusGeometry args={[1.08 - index * 0.1, 0.024, 6, 64]} />
            <meshBasicMaterial color={index % 2 ? '#75d9d2' : '#f0aa54'} />
          </mesh>
        ))}
        <pointLight color="#e85c65" intensity={18} distance={10} />
      </group>
    </>
  )
}

function PortalGate() {
  const progress = useExperience((state) => state.progress)
  const reducedMotion = useSettings((state) => state.reducedMotion)
  const qualityTier = useSettings((state) => state.qualityTier)
  const frame = useMemo(() => routeFrameAt(PORTAL_CENTER), [])
  const quaternion = useMemo(
    () => new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), frame.tangent),
    [frame.tangent],
  )
  const inBlend = smoothRange(progress, PORTAL_START, PORTAL_CENTER)
  const outBlend = 1 - smoothRange(progress, PORTAL_CENTER, PORTAL_END)
  const blend = reducedMotion ? 0 : Math.min(0.72, inBlend * outBlend * 0.72)
  const previewVisible = !reducedMotion && progress > 0.24 && progress < PORTAL_END
  const resolution = resolveTier(qualityTier) === 'low' ? 256 : 384

  return (
    <group position={frame.position} quaternion={quaternion}>
      <mesh renderOrder={4}>
        <torusGeometry args={[1.25, 0.055, 10, 96]} />
        <meshBasicMaterial color="#f0aa54" transparent opacity={0.74} toneMapped={false} />
      </mesh>
      <mesh renderOrder={3}>
        <torusGeometry args={[1.37, 0.012, 6, 96]} />
        <meshBasicMaterial color="#75d9d2" transparent opacity={0.48} toneMapped={false} />
      </mesh>
      {previewVisible ? (
        <mesh>
          <circleGeometry args={[1.2, 72]} />
          <MeshPortalMaterial
            blend={blend}
            blur={0.08}
            resolution={resolution}
            events={false}
            renderPriority={1}
          >
            <PortalPreview />
          </MeshPortalMaterial>
        </mesh>
      ) : (
        <mesh>
          <circleGeometry args={[1.2, 72]} />
          <meshBasicMaterial color="#0b0509" transparent opacity={0.72} />
        </mesh>
      )}
    </group>
  )
}

function SignalDust() {
  const positions = useMemo(() => {
    const values = new Float32Array(360 * 3)
    let seed = 0x534744
    const random = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    for (let index = 0; index < values.length; index += 3) {
      values[index] = (random() - 0.5) * 28
      values[index + 1] = (random() - 0.5) * 18
      values[index + 2] = (random() - 0.5) * 30
    }
    return values
  }, [])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.022}
        color="#75d9d2"
        transparent
        opacity={0.38}
        depthWrite={false}
        blending={AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

export function VoyageScene() {
  const entered = useExperience((state) => state.entered)
  const atlasOpen = useAtlas((state) => state.open)
  const reducedMotion = useSettings((state) => state.reducedMotion)
  const tier = resolveTier(useSettings((state) => state.qualityTier))

  if (!entered || atlasOpen) {
    return (
      <>
        <RuntimeProbe />
        <HumanSystemsScene />
      </>
    )
  }

  return (
    <>
      <color attach="background" args={['#04070c']} />
      <ambientLight intensity={0.34} color="#d6dfef" />
      <directionalLight position={[5, 8, 7]} intensity={2.7} color="#f7d7a2" />
      <directionalLight position={[-5, -2, 2]} intensity={1.1} color="#75d9d2" />
      <pointLight position={[-0.4, 0, 0.2]} intensity={18} distance={8} color="#e85c65" />
      <JourneyClock />
      <CameraDirector />
      <FogDirector />
      <RuntimeProbe />
      <SignalDust />
      <SyntheticCore />
      <DawnRoute />
      <Corridor />
      <PortalGate />
      {tier === 'high' && !reducedMotion && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.42} luminanceThreshold={0.76} mipmapBlur />
        </EffectComposer>
      )}
    </>
  )
}
