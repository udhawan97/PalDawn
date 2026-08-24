import { Canvas, type RootState } from '@react-three/fiber'
import { VoyageScene } from './VoyageScene'

interface SceneCanvasProps {
  dpr: number
  reducedMotion: boolean
  antialias: boolean
  onContextLost: () => void
}

export default function SceneCanvas({ dpr, reducedMotion, antialias, onContextLost }: SceneCanvasProps) {
  const handleCreated = ({ gl }: RootState) => {
    gl.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      onContextLost()
    }, { once: true })
  }

  return (
    <Canvas
      aria-hidden="true"
      dpr={dpr}
      frameloop={reducedMotion ? 'demand' : 'always'}
      gl={{ antialias, powerPreference: 'high-performance', alpha: false }}
      camera={{ position: [-5.8, 4.1, 8.8], fov: 43, near: 0.03, far: 80 }}
      onCreated={handleCreated}
    >
      <VoyageScene />
    </Canvas>
  )
}
