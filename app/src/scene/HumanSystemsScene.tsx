import { useEffect, useMemo, useRef } from 'react'
import { Line } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Color, Group, Mesh, Vector3 } from 'three'
import { diseaseById, type BodyPartId } from '../data/diseases'
import { useAtlas } from '../state/atlas'
import { useSettings } from '../state/settings'

const QUIET = '#263748'
const BONE = '#d9e1df'
const VESSEL = '#d85c64'
const NERVE = '#e8bf65'

interface OrganProps {
  id: BodyPartId
  position: [number, number, number]
  explodedPosition?: [number, number, number]
  scale: [number, number, number]
  color: string
  geometry?: 'sphere' | 'capsule' | 'torus' | 'knot'
  rotation?: [number, number, number]
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
  const mesh = useRef<Mesh>(null)
  const selectedDiseaseId = useAtlas((state) => state.selectedDiseaseId)
  const stepIndex = useAtlas((state) => state.stepIndex)
  const exploded = useAtlas((state) => state.exploded)
  const selectedBodyPart = useAtlas((state) => state.selectedBodyPart)
  const setSelectedBodyPart = useAtlas((state) => state.setSelectedBodyPart)
  const reducedMotion = useSettings((state) => state.reducedMotion)
  const active = diseaseById(selectedDiseaseId).steps[stepIndex]?.bodyParts.includes(id) ?? false
  const selected = selectedBodyPart === id
  const target = exploded ? explodedPosition : position
  const targetVector = useMemo(() => new Vector3(...target), [target])

  useFrame(({ clock }, delta) => {
    if (!mesh.current) return
    const damping = reducedMotion ? 1 : 1 - Math.exp(-delta * 6)
    mesh.current.position.lerp(targetVector, damping)
    const pulse = active && !reducedMotion ? 1 + Math.sin(clock.elapsedTime * 2.2 + position[1]) * 0.035 : 1
    mesh.current.scale.set(scale[0] * pulse, scale[1] * pulse, scale[2] * pulse)
  })

  const onPointer = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setSelectedBodyPart(id)
  }

  return (
    <mesh
      ref={mesh}
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
      {geometry === 'sphere' && <sphereGeometry args={[1, 32, 24]} />}
      {geometry === 'capsule' && <capsuleGeometry args={[0.72, 1.15, 10, 20]} />}
      {geometry === 'torus' && <torusGeometry args={[0.78, 0.27, 12, 40, Math.PI * 1.55]} />}
      {geometry === 'knot' && <torusKnotGeometry args={[0.68, 0.18, 72, 9, 2, 3]} />}
      <meshPhysicalMaterial
        color={active || selected ? color : QUIET}
        emissive={active || selected ? color : '#05080c'}
        emissiveIntensity={active ? 0.72 : selected ? 0.42 : 0.08}
        transparent
        opacity={active || selected ? 0.94 : 0.44}
        roughness={0.48}
        metalness={0.02}
        clearcoat={0.3}
        depthWrite={false}
      />
    </mesh>
  )
}

function VesselNetwork({ active }: { active: boolean }) {
  const lines = useMemo(() => [
    [[0, 1.25, 0.05], [0, 0.1, 0.05], [0, -1.8, 0.05], [-0.34, -3.8, 0.04]],
    [[0, 0.7, 0.05], [-1.08, 0.2, 0.02], [-1.65, -0.7, 0], [-2.05, -1.45, 0]],
    [[0, 0.7, 0.05], [1.08, 0.2, 0.02], [1.65, -0.7, 0], [2.05, -1.45, 0]],
    [[0, -1.7, 0.05], [0.8, -2.45, 0.04], [0.62, -4.25, 0.02]],
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

function BodyShell() {
  return (
    <group>
      <mesh position={[0, 3.65, 0]} scale={[0.74, 0.92, 0.68]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshPhysicalMaterial color="#7e9ab0" wireframe transparent opacity={0.15} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.75, 0]} scale={[1.34, 2.15, 0.72]}>
        <capsuleGeometry args={[0.72, 1.45, 10, 24]} />
        <meshPhysicalMaterial color="#91aabc" wireframe transparent opacity={0.12} depthWrite={false} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 1.54, 0.13, 0]} rotation={[0, 0, side * -0.2]}>
            <capsuleGeometry args={[0.23, 2.52, 8, 14]} />
            <meshBasicMaterial color="#718a9d" wireframe transparent opacity={0.13} />
          </mesh>
          <mesh position={[side * 0.62, -3.25, 0]} rotation={[0, 0, side * -0.045]}>
            <capsuleGeometry args={[0.34, 2.9, 8, 14]} />
            <meshBasicMaterial color="#718a9d" wireframe transparent opacity={0.13} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Skeleton({ active }: { active: boolean }) {
  const materialColor = active ? BONE : '#485866'
  return (
    <group>
      <mesh position={[0, 0.45, -0.08]}>
        <cylinderGeometry args={[0.07, 0.1, 5.55, 10]} />
        <meshBasicMaterial color={materialColor} transparent opacity={active ? 0.82 : 0.27} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 1.5, 0.2, -0.04]} rotation={[0, 0, side * -0.2]}>
            <cylinderGeometry args={[0.065, 0.085, 3.65, 8]} />
            <meshBasicMaterial color={materialColor} transparent opacity={active ? 0.76 : 0.24} />
          </mesh>
          <mesh position={[side * 0.58, -3.23, -0.03]}>
            <cylinderGeometry args={[0.08, 0.1, 3.6, 8]} />
            <meshBasicMaterial color={materialColor} transparent opacity={active ? 0.76 : 0.24} />
          </mesh>
        </group>
      ))}
      {[0, 1, 2, 3, 4].map((ring) => (
        <mesh key={ring} position={[0, 1.75 - ring * 0.52, -0.02]} rotation={[Math.PI / 2, 0, 0]} scale={[1 - ring * 0.06, 1, 0.72]}>
          <torusGeometry args={[0.92, 0.035, 5, 36, Math.PI * 1.75]} />
          <meshBasicMaterial color={materialColor} transparent opacity={active ? 0.7 : 0.2} />
        </mesh>
      ))}
    </group>
  )
}

export function HumanSystemsScene() {
  const group = useRef<Group>(null)
  const selectedDiseaseId = useAtlas((state) => state.selectedDiseaseId)
  const stepIndex = useAtlas((state) => state.stepIndex)
  const rotationPaused = useAtlas((state) => state.rotationPaused)
  const selectedBodyPart = useAtlas((state) => state.selectedBodyPart)
  const setSelectedBodyPart = useAtlas((state) => state.setSelectedBodyPart)
  const reducedMotion = useSettings((state) => state.reducedMotion)
  const { camera, scene, invalidate } = useThree()
  const disease = diseaseById(selectedDiseaseId)
  const activeParts = disease.steps[stepIndex]?.bodyParts ?? []

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
    const target = rotationPaused || reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.18) * 0.13
    const damping = reducedMotion ? 1 : 1 - Math.exp(-delta * 2.5)
    group.current.rotation.y += (target - group.current.rotation.y) * damping
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
        <Organ id="brain" position={[0, 3.68, 0]} explodedPosition={[0, 3.85, 0.72]} scale={[0.55, 0.45, 0.5]} color="#c7a8f2" geometry="knot" />
        <Organ id="eyes" position={[-0.23, 3.72, 0.57]} explodedPosition={[-0.4, 3.86, 1.05]} scale={[0.09, 0.09, 0.09]} color="#a9e8e5" />
        <Organ id="eyes" position={[0.23, 3.72, 0.57]} explodedPosition={[0.4, 3.86, 1.05]} scale={[0.09, 0.09, 0.09]} color="#a9e8e5" />
        <Organ id="lungs" position={[-0.48, 1.55, 0.02]} explodedPosition={[-1.22, 1.68, 0.55]} scale={[0.48, 0.88, 0.38]} color="#85c4ec" geometry="capsule" rotation={[0, 0, -0.05]} />
        <Organ id="lungs" position={[0.48, 1.55, 0.02]} explodedPosition={[1.22, 1.68, 0.55]} scale={[0.48, 0.88, 0.38]} color="#85c4ec" geometry="capsule" rotation={[0, 0, 0.05]} />
        <Organ id="heart" position={[-0.16, 1.22, 0.5]} explodedPosition={[-0.22, 1.25, 1.45]} scale={[0.38, 0.5, 0.35]} color="#f06f75" rotation={[0, 0, -0.35]} />
        <Organ id="liver" position={[0.42, 0.2, 0.34]} explodedPosition={[1.35, 0.15, 0.75]} scale={[0.88, 0.38, 0.42]} color="#b77862" />
        <Organ id="stomach" position={[-0.46, 0.02, 0.36]} explodedPosition={[-1.28, -0.05, 0.82]} scale={[0.44, 0.52, 0.3]} color="#d69a9e" geometry="torus" rotation={[0, 0.4, -0.35]} />
        <Organ id="pancreas" position={[0, -0.18, 0.52]} explodedPosition={[0, -0.22, 1.55]} scale={[0.72, 0.16, 0.18]} color="#f0aa54" geometry="capsule" rotation={[0, 0, Math.PI / 2]} />
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
