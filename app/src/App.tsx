import { Component, lazy, Suspense, useState, type ErrorInfo, type ReactNode } from 'react'
import { FlightDeck } from './ui/FlightDeck'
import { resolveTier, TIER_DPR, useSettings } from './state/settings'
import { webgl2Available } from './webgl'

const SceneCanvas = lazy(() => import('./scene/SceneCanvas'))

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
  onRetry,
  onTextVoyage,
}: {
  reason: string
  onRetry: () => void
  onTextVoyage: () => void
}) {
  return (
    <main className="fallback" role="alert">
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
        onRetry={retryScene}
        onTextVoyage={() => setTextVoyage(true)}
      />
    )
  }

  return (
    <div className="app-root">
      <SceneBoundary key={sceneAttempt} onFailure={setSceneIssue}>
        <Suspense fallback={<div className="scene-loading" aria-hidden="true" />}>
          <SceneCanvas
            dpr={TIER_DPR[tier]}
            reducedMotion={reducedMotion}
            antialias={tier !== 'low'}
            onContextLost={() => setSceneIssue('The device reported a lost WebGL context.')}
          />
        </Suspense>
      </SceneBoundary>
      <FlightDeck textVoyage={false} onTextVoyageChange={setTextVoyage} />
    </div>
  )
}
