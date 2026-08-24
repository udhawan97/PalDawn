import { useEffect, useMemo, useRef } from 'react'
import { Line } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { AdditiveBlending, CatmullRomCurve3, Color, Group, Vector3 } from 'three'
import { diseaseById, type BodyPartId } from '../data/diseases'
import { useAtlas } from '../state/atlas'
import { resolveTier, useSettings } from '../state/settings'

const QUIET = '#263748'
const BONE = '#d9e1df'
const VESSEL = '#d85c64'
const NERVE = '#e8bf65'

const BODY_DETAIL_POINTS: Record<BodyPartId, [number, number, number]> = {
  brain: [0, 3.68, 0.08],
  eyes: [0, 3.72, 0.58],
  lungs: [0, 1.55, 0.04],
  heart: [-0.16, 1.22, 0.52],
  blood: [0, 0.65, 0.12],
  liver: [0.42, 0.2, 0.36],
  pancreas: [0, -0.18, 0.54],
  stomach: [-0.46, 0.02, 0.38],
  intestines: [0, -0.92, 0.32],
  kidneys: [0, -0.45, -0.08],
  bladder: [0, -1.64, 0.16],
  nerves: [0, 1.2, -0.04],
  muscles: [0, -2.85, 0.17],
  fat: [0.74, -0.12, -0.16],
  immune: [0.72, 0.86, -0.13],
  bones: [0, 0.45, -0.06],
}

interface OrganProps {
  id: BodyPartId
  position: [number, number, number]
  explodedPosition?: [number, number, number]
  scale: [number, number, number]
  color: string
  geometry?: 'sphere' | 'capsule' | 'torus' | 'knot'
  rotation?: [number, number, number]
}

function OrganGeometry({ geometry, fine = false }: { geometry: OrganProps['geometry']; fine?: boolean }) {
  if (geometry === 'capsule') return <capsuleGeometry args={[0.72, 1.15, fine ? 12 : 8, fine ? 28 : 16]} />
  if (geometry === 'torus') return <torusGeometry args={[0.78, 0.27, fine ? 18 : 10, fine ? 56 : 32, Math.PI * 1.55]} />
  if (geometry === 'knot') return <torusKnotGeometry args={[0.68, 0.18, fine ? 96 : 48, fine ? 12 : 7, 2, 3]} />
  return <sphereGeometry args={[1, fine ? 42 : 24, fine ? 32 : 18]} />
}

function Organ({
  id,
  position,
  explodedPosition = position,
  scale,
  color,
  geometry = 'sphere',
  rotation = [0, 0, 0],
}: OrganProps) {
  const group = useRef<Group>(null)
  const selectedDiseaseId = useAtlas((state) => state.selectedDiseaseId)
  const stepIndex = useAtlas((state) => state.stepIndex)
  const exploded = useAtlas((state) => state.exploded)
  const selectedBodyPart = useAtlas((state) => state.selectedBodyPart)
  const setSelectedBodyPart = useAtlas((state) => state.setSelectedBodyPart)
  const reducedMotion = useSettings((state) => state.reducedMotion)
  const qualityTier = useSettings((state) => state.qualityTier)
  const active = diseaseById(selectedDiseaseId).steps[stepIndex]?.bodyParts.includes(id) ?? false
  const selected = selectedBodyPart === id
  const fine = resolveTier(qualityTier) !== 'low'
  const target = exploded ? explodedPosition : position
  const targetVector = useMemo(() => new Vector3(...target), [target])

  useFrame(({ clock }, delta) => {
    if (!group.current) return
    const damping = reducedMotion ? 1 : 1 - Math.exp(-delta * 6)
    group.current.position.lerp(targetVector, damping)
    const pulse = active && !reducedMotion ? 1 + Math.sin(clock.elapsedTime * 2.2 + position[1]) * 0.028 : 1
    group.current.scale.set(scale[0] * pulse, scale[1] * pulse, scale[2] * pulse)
  })

  const onPointer = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setSelectedBodyPart(id)
  }

  return (
    <group
      ref={group}
      name={id}
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={onPointer}
      onPointerOver={(event) => {
        event.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => { document.body.style.cursor = '' }}
    >
      <mesh>
        <OrganGeometry geometry={geometry} fine={fine} />
        <meshPhysicalMaterial
          color={active || selected ? color : QUIET}
          emissive={active || selected ? color : '#05080c'}
          emissiveIntensity={active ? 0.58 : selected ? 0.44 : 0.06}
          transparent
          opacity={active || selected ? 0.9 : 0.36}
          roughness={0.42}
          metalness={0.02}
          clearcoat={0.58}
          clearcoatRoughness={0.34}
          depthWrite={false}
        />
      </mesh>
      {(active || selected) && fine ? (
        <>
          <mesh scale={1.025}>
            <OrganGeometry geometry={geometry} />
            <meshBasicMaterial color={color} wireframe transparent opacity={selected ? 0.28 : 0.14} depthWrite={false} />
          </mesh>
          <mesh scale={0.72}>
            <OrganGeometry geometry={geometry} />
            <meshPhysicalMaterial
              color={color}
              emissive={color}
              emissiveIntensity={selected ? 0.7 : 0.36}
              transparent
              opacity={selected ? 0.32 : 0.16}
              roughness={0.2}
              depthWrite={false}
            />
          </mesh>
        </>
      ) : null}
    </group>
  )
}

function VesselNetwork({ active }: { active: boolean }) {
  const lines = useMemo(() => [
    [[0, 1.42, 0.08], [0.04, 0.58, 0.09], [0, -0.55, 0.08], [0, -1.8, 0.05], [-0.34, -3.8, 0.04], [-0.58, -5.03, 0.12]],
    [[-0.16, 1.22, 0.5], [-0.42, 1.42, 0.42], [-0.7, 1.22, 0.28], [-0.82, 0.72, 0.16]],
    [[-0.16, 1.22, 0.5], [0.08, 1.5, 0.42], [0.36, 1.34, 0.3], [0.5, 0.94, 0.18]],
    [[0, 1.82, 0.03], [-0.18, 2.62, 0.02], [-0.28, 3.46, 0.06], [0, 3.9, 0.08]],
    [[0, 0.7, 0.05], [-1.08, 0.2, 0.02], [-1.65, -0.7, 0], [-2.05, -1.45, 0]],
    [[0, 0.7, 0.05], [1.08, 0.2, 0.02], [1.65, -0.7, 0], [2.05, -1.45, 0]],
    [[0, -1.7, 0.05], [0.8, -2.45, 0.04], [0.62, -4.25, 0.02], [0.58, -5.06, 0.12]],
    [[0, -1.7, 0.05], [-0.8, -2.45, 0.04], [-0.62, -4.25, 0.02], [-0.58, -5.06, 0.12]],
    [[0.04, 0.58, 0.09], [0.44, 0.2, 0.24], [0.08, -0.18, 0.42], [-0.5, -0.46, 0]],
    [[0.04, 0.58, 0.09], [-0.42, 0.05, 0.24], [0, -0.92, 0.22], [0.5, -0.46, 0]],
  ] as [number, number, number][][], [])

  return (
    <group>
      {lines.map((points, index) => (
        <Line
          key={index}
          points={points}
          color={active ? VESSEL : '#334554'}
          lineWidth={active ? 1.7 : 0.7}
          transparent
          opacity={active ? 0.8 : 0.3}
        />
      ))}
    </group>
  )
}

function NerveNetwork({ active }: { active: boolean }) {
  const lines = useMemo(() => [
    [[0, 3.55, -0.05], [0, 2.4, -0.05], [0, 0.5, -0.08], [0, -1.8, -0.08], [0.55, -4.2, -0.06]],
    [[0, 1.8, -0.05], [-1.15, 0.7, -0.04], [-2.02, -1.5, -0.04]],
    [[0, 1.8, -0.05], [1.15, 0.7, -0.04], [2.02, -1.5, -0.04]],
    [[0, 3.55, -0.05], [-0.34, 3.78, 0], [-0.56, 3.52, 0.08]],
    [[0, 3.55, -0.05], [0.34, 3.78, 0], [0.56, 3.52, 0.08]],
    [[0, 0.5, -0.08], [-0.52, -0.18, -0.04], [-0.62, -1.2, 0.01]],
    [[0, 0.5, -0.08], [0.52, -0.18, -0.04], [0.62, -1.2, 0.01]],
    [[0, -1.8, -0.08], [-0.58, -2.7, -0.04], [-0.58, -4.82, 0.02]],
    [[0, -1.8, -0.08], [0.58, -2.7, -0.04], [0.58, -4.82, 0.02]],
  ] as [number, number, number][][], [])

  return (
    <group>
      {lines.map((points, index) => (
        <Line
          key={index}
          points={points}
          color={active ? NERVE : '#394451'}
          lineWidth={active ? 1.3 : 0.55}
          transparent
          opacity={active ? 0.78 : 0.25}
        />
      ))}
    </group>
  )
}

function ShellSegment({
  position,
  scale,
  rotation = [0, 0, 0],
  shape = 'capsule',
  opacity = 0.105,
}: {
  position: [number, number, number]
  scale: [number, number, number]
  rotation?: [number, number, number]
  shape?: 'capsule' | 'sphere'
  opacity?: number
}) {
  return (
    <mesh position={position} scale={scale} rotation={rotation}>
      {shape === 'capsule'
        ? <capsuleGeometry args={[0.72, 1.45, 10, 28]} />
        : <sphereGeometry args={[1, 36, 28]} />}
      <meshPhysicalMaterial
        color="#87a8bc"
        emissive="#142b38"
        emissiveIntensity={0.22}
        transparent
        opacity={opacity}
        roughness={0.2}
        metalness={0.04}
        clearcoat={0.72}
        clearcoatRoughness={0.18}
        depthWrite={false}
      />
    </mesh>
  )
}

function BodyShell() {
  return (
    <group>
      <ShellSegment position={[0, 3.72, 0]} scale={[0.73, 0.9, 0.69]} shape="sphere" opacity={0.15} />
      <ShellSegment position={[0, 2.75, 0]} scale={[0.42, 0.48, 0.43]} />
      <ShellSegment position={[0, 0.92, 0]} scale={[1.26, 1.55, 0.7]} opacity={0.12} />
      <ShellSegment position={[0, -1.03, 0]} scale={[1.05, 0.76, 0.66]} opacity={0.11} />
      <ShellSegment position={[0, -1.82, 0]} scale={[0.92, 0.48, 0.65]} opacity={0.13} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <ShellSegment position={[side * 1.02, 1.85, 0]} scale={[0.46, 0.42, 0.48]} shape="sphere" opacity={0.12} />
          <ShellSegment position={[side * 1.48, 0.65, 0]} scale={[0.25, 0.92, 0.28]} rotation={[0, 0, side * -0.18]} />
          <ShellSegment position={[side * 1.77, -0.77, 0]} scale={[0.21, 0.86, 0.24]} rotation={[0, 0, side * -0.12]} />
          <ShellSegment position={[side * 1.92, -1.72, 0.02]} scale={[0.19, 0.25, 0.23]} shape="sphere" opacity={0.12} />
          <ShellSegment position={[side * 0.58, -2.8, 0]} scale={[0.38, 0.88, 0.4]} rotation={[0, 0, side * -0.035]} />
          <ShellSegment position={[side * 0.58, -4.27, 0.02]} scale={[0.29, 0.82, 0.32]} rotation={[0, 0, side * 0.025]} />
          <ShellSegment position={[side * 0.58, -5.12, 0.2]} scale={[0.34, 0.17, 0.62]} shape="sphere" opacity={0.12} />
        </group>
      ))}
      <mesh position={[0, 0.72, 0]} scale={[1.31, 2.04, 0.74]}>
        <capsuleGeometry args={[0.72, 1.45, 8, 20]} />
        <meshBasicMaterial color="#a9cfdd" wireframe transparent opacity={0.13} depthWrite={false} />
      </mesh>
      <mesh position={[0, 3.72, 0]} scale={[0.755, 0.925, 0.715]}>
        <sphereGeometry args={[1, 22, 16]} />
        <meshBasicMaterial color="#a9cfdd" wireframe transparent opacity={0.17} depthWrite={false} />
      </mesh>
      <mesh position={[0, 3.6, 0.7]} scale={[0.13, 0.24, 0.12]} rotation={[0.5, 0, 0]}>
        <coneGeometry args={[1, 1.8, 12]} />
        <meshBasicMaterial color="#a9cfdd" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Skeleton({ active }: { active: boolean }) {
  const materialColor = active ? BONE : '#485866'
  return (
    <group>
      <mesh position={[0, 3.7, -0.1]} scale={[0.54, 0.66, 0.5]}>
        <sphereGeometry args={[1, 20, 16]} />
        <meshBasicMaterial color={materialColor} wireframe transparent opacity={active ? 0.42 : 0.13} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.45, -0.08]}>
        <cylinderGeometry args={[0.07, 0.1, 5.55, 10]} />
        <meshBasicMaterial color={materialColor} transparent opacity={active ? 0.82 : 0.18} depthWrite={false} />
      </mesh>
      <mesh position={[0, 1.08, 0.12]}>
        <cylinderGeometry args={[0.04, 0.06, 2.15, 8]} />
        <meshBasicMaterial color={materialColor} transparent opacity={active ? 0.68 : 0.13} depthWrite={false} />
      </mesh>
      <mesh position={[0, -1.62, -0.02]} rotation={[Math.PI / 2, 0, 0]} scale={[1.04, 0.6, 0.56]}>
        <torusGeometry args={[0.78, 0.08, 8, 32, Math.PI * 1.82]} />
        <meshBasicMaterial color={materialColor} transparent opacity={active ? 0.62 : 0.12} depthWrite={false} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 1.5, 0.2, -0.04]} rotation={[0, 0, side * -0.2]}>
            <cylinderGeometry args={[0.065, 0.085, 3.65, 8]} />
            <meshBasicMaterial color={materialColor} transparent opacity={active ? 0.76 : 0.14} depthWrite={false} />
          </mesh>
          <mesh position={[side * 0.58, -3.23, -0.03]}>
            <cylinderGeometry args={[0.08, 0.1, 3.6, 8]} />
            <meshBasicMaterial color={materialColor} transparent opacity={active ? 0.76 : 0.14} depthWrite={false} />
          </mesh>
          {[[-1.72, 0.68], [-2.55, -4.2]].map(([x, y], index) => (
            <mesh key={index} position={[side * Math.abs(x), y, -0.02]} scale={index ? 0.13 : 0.1}>
              <sphereGeometry args={[1, 12, 10]} />
              <meshBasicMaterial color={materialColor} transparent opacity={active ? 0.72 : 0.13} depthWrite={false} />
            </mesh>
          ))}
        </group>
      ))}
      {[0, 1, 2, 3, 4, 5, 6].map((ring) => (
        <mesh key={ring} position={[0, 1.86 - ring * 0.37, -0.02]} rotation={[Math.PI / 2, 0, 0]} scale={[1 - ring * 0.035, 1, 0.72]}>
          <torusGeometry args={[0.92, 0.035, 5, 36, Math.PI * 1.75]} />
          <meshBasicMaterial color={materialColor} transparent opacity={active ? 0.7 : 0.1} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function PhaseSignal({
  activeParts,
  focusPart,
  accent,
}: {
  activeParts: BodyPartId[]
  focusPart: BodyPartId
  accent: string
}) {
  const marker = useRef<Group>(null)
  const lens = useRef<Group>(null)
  const reducedMotion = useSettings((state) => state.reducedMotion)
  const qualityTier = useSettings((state) => state.qualityTier)
  const routeKey = activeParts.join('|')
  const points = useMemo(() => {
    const unique = activeParts.filter((part, index) => activeParts.indexOf(part) === index)
    return unique.map((part) => new Vector3(...BODY_DETAIL_POINTS[part]))
  }, [routeKey])
  const route = useMemo(
    () => points.length > 1 ? new CatmullRomCurve3(points, false, 'centripetal', 0.35) : null,
    [points],
  )
  const focusPoint = BODY_DETAIL_POINTS[focusPart]
  const particlePositions = useMemo(() => {
    const count = resolveTier(qualityTier) === 'high' ? 72 : 36
    const positions = new Float32Array(count * 3)
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))
    for (let index = 0; index < count; index += 1) {
      const y = 1 - (index / Math.max(1, count - 1)) * 2
      const radius = Math.sqrt(Math.max(0, 1 - y * y))
      const angle = goldenAngle * index
      positions[index * 3] = Math.cos(angle) * radius * 0.72
      positions[index * 3 + 1] = y * 0.72
      positions[index * 3 + 2] = Math.sin(angle) * radius * 0.72
    }
    return positions
  }, [qualityTier])

  useFrame(({ clock }) => {
    if (marker.current && route) {
      const progress = reducedMotion ? 0.68 : (clock.elapsedTime * 0.12) % 1
      marker.current.position.copy(route.getPoint(progress))
    }
    if (lens.current) {
      lens.current.rotation.z = reducedMotion ? 0.18 : clock.elapsedTime * 0.16
      const pulse = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * 2.15) * 0.045
      lens.current.scale.setScalar(pulse)
    }
  })

  return (
    <group>
      {route ? (
        <>
          <Line points={points} color={accent} lineWidth={1.1} transparent opacity={0.42} dashed dashSize={0.12} gapSize={0.08} />
          <Line points={points} color="#dceff2" lineWidth={0.34} transparent opacity={0.55} />
          <group ref={marker}>
            <mesh>
              <sphereGeometry args={[0.075, 14, 10]} />
              <meshBasicMaterial color="#f9efe0" toneMapped={false} />
            </mesh>
            <pointLight color={accent} intensity={5.5} distance={1.8} />
          </group>
        </>
      ) : null}
      <group ref={lens} position={focusPoint}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.72, 0.012, 6, 72]} />
          <meshBasicMaterial color={accent} transparent opacity={0.72} toneMapped={false} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, Math.PI / 5]}>
          <torusGeometry args={[0.9, 0.008, 5, 72]} />
          <meshBasicMaterial color="#75d9d2" transparent opacity={0.36} toneMapped={false} />
        </mesh>
        <mesh rotation={[Math.PI / 3, 0, -Math.PI / 4]}>
          <torusGeometry args={[1.08, 0.006, 5, 72]} />
          <meshBasicMaterial color="#dceff2" transparent opacity={0.2} toneMapped={false} />
        </mesh>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[particlePositions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={0.035}
            color={accent}
            transparent
            opacity={0.62}
            depthWrite={false}
            blending={AdditiveBlending}
            sizeAttenuation
          />
        </points>
      </group>
    </group>
  )
}

function SystemDetailLayer({ activeParts, selectedBodyPart }: { activeParts: BodyPartId[]; selectedBodyPart: string | null }) {
  const active = useMemo(() => new Set(activeParts), [activeParts])
  const show = (...parts: BodyPartId[]) => parts.some((part) => active.has(part) || selectedBodyPart === part)
  const airwayActive = show('lungs')
  const digestiveActive = show('stomach', 'intestines', 'liver', 'pancreas')
  const renalActive = show('kidneys', 'bladder')
  const opticActive = show('eyes', 'brain', 'nerves')
  const cardiacActive = show('heart', 'blood')

  return (
    <group>
      <Line
        points={[[0, 2.62, 0.32], [0, 2.15, 0.34], [-0.42, 1.72, 0.25], [-0.58, 1.25, 0.12]]}
        color="#9bd8f2"
        lineWidth={airwayActive ? 1.7 : 0.42}
        transparent
        opacity={airwayActive ? 0.78 : 0.16}
      />
      <Line
        points={[[0, 2.15, 0.34], [0.42, 1.72, 0.25], [0.58, 1.25, 0.12]]}
        color="#9bd8f2"
        lineWidth={airwayActive ? 1.7 : 0.42}
        transparent
        opacity={airwayActive ? 0.78 : 0.16}
      />
      <Line
        points={[[0, 3.35, 0.42], [-0.08, 2.25, 0.28], [-0.46, 0.08, 0.4], [-0.08, -0.52, 0.42], [0, -1.05, 0.34]]}
        color="#eda6ad"
        lineWidth={digestiveActive ? 1.45 : 0.34}
        transparent
        opacity={digestiveActive ? 0.72 : 0.12}
      />
      <Line
        points={[[-0.55, -0.45, -0.02], [-0.34, -1.1, 0.02], [0, -1.64, 0.14], [0.34, -1.1, 0.02], [0.55, -0.45, -0.02]]}
        color="#b7e1e3"
        lineWidth={renalActive ? 1.35 : 0.3}
        transparent
        opacity={renalActive ? 0.7 : 0.12}
      />
      <Line
        points={[[-0.23, 3.72, 0.57], [-0.08, 3.6, 0.32], [0, 3.68, 0.08], [0.08, 3.6, 0.32], [0.23, 3.72, 0.57]]}
        color="#c7a8f2"
        lineWidth={opticActive ? 1.18 : 0.28}
        transparent
        opacity={opticActive ? 0.68 : 0.1}
      />
      <group position={[-0.16, 1.22, 0.52]} rotation={[0.2, -0.1, -0.35]}>
        <mesh>
          <torusGeometry args={[0.42, 0.025, 8, 56, Math.PI * 1.72]} />
          <meshBasicMaterial color="#f4a0a4" transparent opacity={cardiacActive ? 0.72 : 0.12} depthWrite={false} />
        </mesh>
        <mesh scale={0.64} rotation={[Math.PI / 2, 0.2, 0]}>
          <torusGeometry args={[0.42, 0.018, 6, 48]} />
          <meshBasicMaterial color="#f7d7a2" transparent opacity={cardiacActive ? 0.56 : 0.08} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

export function HumanSystemsScene() {
  const group = useRef<Group>(null)
  const cameraTarget = useRef(new Vector3())
  const cameraDestination = useRef(new Vector3())
  const selectedDiseaseId = useAtlas((state) => state.selectedDiseaseId)
  const stepIndex = useAtlas((state) => state.stepIndex)
  const atlasOpen = useAtlas((state) => state.open)
  const rotationPaused = useAtlas((state) => state.rotationPaused)
  const selectedBodyPart = useAtlas((state) => state.selectedBodyPart)
  const setSelectedBodyPart = useAtlas((state) => state.setSelectedBodyPart)
  const reducedMotion = useSettings((state) => state.reducedMotion)
  const { camera, scene, size, invalidate } = useThree()
  const disease = diseaseById(selectedDiseaseId)
  const activeParts = disease.steps[stepIndex]?.bodyParts ?? []
  const focusPart = (selectedBodyPart ?? activeParts[0] ?? 'heart') as BodyPartId

  useEffect(() => {
    camera.position.set(0, 0.1, 11.8)
    camera.up.set(0, 1, 0)
    camera.lookAt(0, 0, 0)
    scene.fog = null
    scene.background = new Color('#050a10')
    invalidate()
  }, [camera, invalidate, scene])

  useFrame(({ clock }, delta) => {
    if (!group.current) return
    const detailOpen = selectedBodyPart !== null
    const stageOffset = atlasOpen && size.width > 820 ? -1.2 : 0
    const target = rotationPaused || reducedMotion || detailOpen ? 0 : Math.sin(clock.elapsedTime * 0.18) * 0.1
    const damping = reducedMotion ? 1 : 1 - Math.exp(-delta * 2.5)
    group.current.rotation.y += (target - group.current.rotation.y) * damping
    group.current.position.x += (stageOffset - group.current.position.x) * damping

    if (detailOpen) {
      const point = BODY_DETAIL_POINTS[focusPart]
      const stageCompensation = atlasOpen && size.width > 820 ? 1.12 : 0
      cameraTarget.current.set(point[0] + stageOffset + stageCompensation, point[1], point[2])
      cameraDestination.current.set(point[0] + stageCompensation, point[1] + 0.08, point[2] + 5.8)
    } else {
      cameraTarget.current.set(0, 0.05, 0)
      cameraDestination.current.set(0, 0.1, 11.8)
    }
    camera.position.lerp(cameraDestination.current, damping)
    camera.lookAt(cameraTarget.current)
  })

  return (
    <>
      <color attach="background" args={['#050a10']} />
      <ambientLight intensity={0.78} color="#b9cfdf" />
      <directionalLight position={[5, 7, 8]} intensity={2.8} color="#d8e8ef" />
      <directionalLight position={[-5, -1, 5]} intensity={1.7} color={disease.accent} />
      <pointLight position={[0, 1.1, 2.5]} intensity={18} distance={8} color={disease.accent} />
      <group
        ref={group}
        scale={0.92}
        position={[0, 0.05, 0]}
        onPointerMissed={() => setSelectedBodyPart(null)}
      >
        <BodyShell />
        <Skeleton active={activeParts.includes('bones') || selectedBodyPart === 'bones'} />
        <VesselNetwork active={activeParts.includes('blood') || selectedBodyPart === 'blood'} />
        <NerveNetwork active={activeParts.includes('nerves') || selectedBodyPart === 'nerves'} />
        <SystemDetailLayer activeParts={activeParts} selectedBodyPart={selectedBodyPart} />
        <PhaseSignal activeParts={activeParts} focusPart={focusPart} accent={disease.accent} />
        <Organ id="brain" position={[0, 3.68, 0]} explodedPosition={[0, 3.85, 0.72]} scale={[0.55, 0.45, 0.5]} color="#c7a8f2" geometry="knot" />
        <Organ id="eyes" position={[-0.23, 3.72, 0.57]} explodedPosition={[-0.4, 3.86, 1.05]} scale={[0.09, 0.09, 0.09]} color="#a9e8e5" />
        <Organ id="eyes" position={[0.23, 3.72, 0.57]} explodedPosition={[0.4, 3.86, 1.05]} scale={[0.09, 0.09, 0.09]} color="#a9e8e5" />
        <Organ id="lungs" position={[-0.48, 1.55, 0.02]} explodedPosition={[-1.22, 1.68, 0.55]} scale={[0.48, 0.88, 0.38]} color="#85c4ec" geometry="capsule" rotation={[0, 0, -0.05]} />
        <Organ id="lungs" position={[0.48, 1.55, 0.02]} explodedPosition={[1.22, 1.68, 0.55]} scale={[0.48, 0.88, 0.38]} color="#85c4ec" geometry="capsule" rotation={[0, 0, 0.05]} />
        <Organ id="heart" position={[-0.16, 1.22, 0.5]} explodedPosition={[-0.22, 1.25, 1.45]} scale={[0.38, 0.5, 0.35]} color="#f06f75" rotation={[0, 0, -0.35]} />
        <Organ id="liver" position={[0.42, 0.2, 0.34]} explodedPosition={[1.35, 0.15, 0.75]} scale={[0.88, 0.38, 0.42]} color="#b77862" />
        <Organ id="stomach" position={[-0.46, 0.02, 0.36]} explodedPosition={[-1.28, -0.05, 0.82]} scale={[0.44, 0.52, 0.3]} color="#d69a9e" geometry="torus" rotation={[0, 0.4, -0.35]} />
        <Organ id="pancreas" position={[0, -0.18, 0.52]} explodedPosition={[0, -0.22, 1.55]} scale={[0.72, 0.16, 0.18]} color="#f0aa54" />
        <Organ id="intestines" position={[0, -0.92, 0.3]} explodedPosition={[0, -1.12, 1.22]} scale={[0.68, 0.76, 0.38]} color="#de9cab" geometry="knot" />
        <Organ id="kidneys" position={[-0.55, -0.45, -0.12]} explodedPosition={[-1.3, -0.42, 0.2]} scale={[0.24, 0.42, 0.2]} color="#e6a6c3" />
        <Organ id="kidneys" position={[0.55, -0.45, -0.12]} explodedPosition={[1.3, -0.42, 0.2]} scale={[0.24, 0.42, 0.2]} color="#e6a6c3" />
        <Organ id="bladder" position={[0, -1.64, 0.14]} explodedPosition={[0, -1.8, 0.82]} scale={[0.3, 0.32, 0.25]} color="#b6d9dc" />
        <Organ id="immune" position={[0.72, 0.86, -0.15]} explodedPosition={[1.65, 0.88, 0.1]} scale={[0.18, 0.34, 0.16]} color="#75d9d2" />
        <Organ id="muscles" position={[-0.6, -2.85, 0.15]} explodedPosition={[-1.05, -3, 0.55]} scale={[0.18, 0.82, 0.17]} color="#d77778" geometry="capsule" />
        <Organ id="fat" position={[0.74, -0.12, -0.18]} explodedPosition={[1.55, -0.12, -0.1]} scale={[0.28, 0.46, 0.18]} color="#e5ca7b" geometry="capsule" />
      </group>
    </>
  )
}
