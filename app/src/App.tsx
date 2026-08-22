import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from 'react'
import { Canvas, type RootState } from '@react-three/fiber'
import { VoyageScene } from './scene/VoyageScene'
import { FlightDeck } from './ui/FlightDeck'
import { resolveTier, TIER_DPR, useSettings } from './state/settings'
import { webgl2Available } from './webgl'

interface SceneBoundaryState {
  failed: boolean
}

class SceneBoundary extends Component<{ children: ReactNode; onFailure: (reason: string) => void }, SceneBoundaryState> {
  state: SceneBoundaryState = { failed: false }

  static getDerivedStateFromError(): SceneBoundaryState {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // The user-facing recovery path is rendered below. No telemetry leaves the device.
    this.props.onFailure('The 3D scene stopped unexpectedly.')
  }

  render() {
    if (this.state.failed) {
      return null
    }
    return this.props.children
  }
}

function RenderFallback({
  reason,
  reducedMotion,
  onRetry,
  onTextVoyage,
}: {
  reason: string
  reducedMotion: boolean
  onRetry: () => void
  onTextVoyage: () => void
}) {
  return (
    <main className="fallback" role="alert">
      <img
        className="fallback-brand-icon"
        src={`${import.meta.env.BASE_URL}${reducedMotion ? 'icon-static.svg' : 'icon.svg'}`}
        alt=""
        aria-hidden="true"
      />
      <p className="eyebrow">PalDawn · first light</p>
      <h1>The voyage could not start.</h1>
      <p>{reason} Your saved position and settings remain on this device.</p>
      <div className="fallback-actions">
        <button className="primary-action" type="button" onClick={onRetry}>
          Retry the scene <span aria-hidden="true">↻</span>
        </button>
        <button className="secondary-action" type="button" onClick={onTextVoyage}>
          Continue with the text voyage
        </button>
      </div>
      <p className="synthetic-stamp">Synthetic systems model · not anatomy</p>
    </main>
  )
}

export default function App() {
  // Probe once at mount; locked decision: P0 requires WebGL2.
  const [webgl2, setWebgl2] = useState(webgl2Available)
  const [sceneIssue, setSceneIssue] = useState<string | null>(null)
  const [sceneAttempt, setSceneAttempt] = useState(0)
  const [textVoyage, setTextVoyage] = useState(false)
  const qualityTier = useSettings((s) => s.qualityTier)
  const reducedMotion = useSettings((s) => s.reducedMotion)
  const tier = resolveTier(qualityTier)

  useEffect(() => {
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (favicon) {
      favicon.href = `${import.meta.env.BASE_URL}${reducedMotion ? 'icon-static.svg' : 'icon.svg'}`
    }
  }, [reducedMotion])

  const retryScene = () => {
    const available = webgl2Available()
    setWebgl2(available)
    setSceneIssue(available ? null : 'This browser or device still does not provide the WebGL2 context required by this release.')
    if (available) {
      setTextVoyage(false)
      setSceneAttempt((attempt) => attempt + 1)
    }
  }

  if (textVoyage) {
    return (
      <div className="app-root app-root--text">
        <div className="text-voyage-backdrop" aria-hidden="true" />
        <FlightDeck textVoyage onTextVoyageChange={setTextVoyage} />
      </div>
    )
  }

  if (!webgl2 || sceneIssue) {
    return (
      <RenderFallback
        reason={sceneIssue ?? 'This browser or device did not provide the WebGL2 context required by this release.'}
        reducedMotion={reducedMotion}
        onRetry={retryScene}
        onTextVoyage={() => setTextVoyage(true)}
      />
    )
  }

  const handleCreated = ({ gl }: RootState) => {
    gl.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      setSceneIssue('The device reported a lost WebGL context.')
    }, { once: true })
  }

  return (
    <div className="app-root">
      <SceneBoundary key={sceneAttempt} onFailure={setSceneIssue}>
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
      <FlightDeck textVoyage={false} onTextVoyageChange={setTextVoyage} />
    </div>
  )
}
