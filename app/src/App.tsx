import { Component, useState, type ErrorInfo, type ReactNode } from 'react'
import { Canvas, type RootState } from '@react-three/fiber'
import { VoyageScene } from './scene/VoyageScene'
import { FlightDeck } from './ui/FlightDeck'
import { resolveTier, TIER_DPR, useSettings } from './state/settings'
import { webgl2Available } from './webgl'

interface SceneBoundaryState {
  failed: boolean
}

class SceneBoundary extends Component<{ children: ReactNode }, SceneBoundaryState> {
  state: SceneBoundaryState = { failed: false }

  static getDerivedStateFromError(): SceneBoundaryState {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // The user-facing recovery path is rendered below. No telemetry leaves the device.
  }

  render() {
    if (this.state.failed) {
      return <RenderFallback reason="The 3D scene stopped unexpectedly." />
    }
    return this.props.children
  }
}

function RenderFallback({ reason }: { reason: string }) {
  return (
    <main className="fallback" role="alert">
      <p className="eyebrow">PalDawn · first light</p>
      <h1>The voyage could not start.</h1>
      <p>{reason} Your settings and data remain on this device.</p>
      <button className="primary-action" type="button" onClick={() => window.location.reload()}>
        Reload the voyage <span aria-hidden="true">↻</span>
      </button>
      <p className="synthetic-stamp">Synthetic systems model · not anatomy</p>
    </main>
  )
}

export default function App() {
  // Probe once at mount; locked decision: P0 requires WebGL2.
  const [webgl2] = useState(webgl2Available)
  const [contextLost, setContextLost] = useState(false)
  const qualityTier = useSettings((s) => s.qualityTier)
  const reducedMotion = useSettings((s) => s.reducedMotion)
  const tier = resolveTier(qualityTier)

  if (!webgl2) {
    return <RenderFallback reason="This browser or device did not provide the WebGL2 context required by this release." />
  }

  if (contextLost) return <RenderFallback reason="The device reported a lost WebGL context." />

  const handleCreated = ({ gl }: RootState) => {
    gl.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      setContextLost(true)
    }, { once: true })
  }

  return (
    <div className="app-root">
      <SceneBoundary>
        <Canvas
          aria-hidden="true"
          dpr={TIER_DPR[tier]}
          frameloop={reducedMotion ? 'demand' : 'always'}
          gl={{ antialias: tier !== 'low', powerPreference: 'high-performance', alpha: false }}
          camera={{ position: [-5.8, 4.1, 8.8], fov: 43, near: 0.03, far: 80 }}
          onCreated={handleCreated}
        >
          <VoyageScene />
        </Canvas>
      </SceneBoundary>
      <FlightDeck />
    </div>
  )
}
