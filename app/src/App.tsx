import { Component, lazy, Suspense, useEffect, useState, type ErrorInfo, type ReactNode } from 'react'
import { FlightDeck } from './ui/FlightDeck'
import { useExperience } from './state/experience'
import { resolveTier, TIER_DPR, useSettings } from './state/settings'
import { webgl2Available } from './webgl'

const sceneRecoveryRequested = typeof window !== 'undefined' &&
  new URL(window.location.href).searchParams.has('scene-retry')
const SceneCanvas = lazy(() => sceneRecoveryRequested
  ? import('./scene/SceneCanvas?scene-recovery')
  : import('./scene/SceneCanvas'))

interface SceneBoundaryState {
  failed: boolean
}

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, SceneBoundaryState> {
  state: SceneBoundaryState = { failed: false }

  static getDerivedStateFromError(): SceneBoundaryState {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // The user-facing recovery path is rendered below. No telemetry leaves the device.
    this.props.onFailure()
  }

  render() {
    if (this.state.failed) {
      return null
    }
    return this.props.children
  }
}

function JourneyPlaybackDriver() {
  const playing = useExperience((state) => state.playing)
  const playbackRate = useSettings((state) => state.playbackRate)
  const reducedMotion = useSettings((state) => state.reducedMotion)

  useEffect(() => {
    if (!playing || reducedMotion) return

    let frame = 0
    let previous = performance.now()
    const resetClock = () => { previous = performance.now() }
    const advance = (now: number) => {
      const deltaSeconds = Math.min(0.1, Math.max(0, (now - previous) / 1000))
      previous = now
      if (!document.hidden) useExperience.getState().advance(deltaSeconds, playbackRate)
      frame = window.requestAnimationFrame(advance)
    }

    document.addEventListener('visibilitychange', resetClock)
    frame = window.requestAnimationFrame(advance)
    return () => {
      document.removeEventListener('visibilitychange', resetClock)
      window.cancelAnimationFrame(frame)
    }
  }, [playbackRate, playing, reducedMotion])

  return null
}

function RenderFallback({
  reason,
  reducedMotion,
  reloadRequired,
  freshRequestAvailable,
  onRetry,
  onTextVoyage,
}: {
  reason: string
  reducedMotion: boolean
  reloadRequired: boolean
  freshRequestAvailable: boolean
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
      <p className="eyebrow">PalDawn · Mechanism Lens</p>
      <h1>The 3D map could not start.</h1>
      <p>{reason} The disease guides and First Light text voyage remain available, and your saved position and settings stay on this device.</p>
      <div className="fallback-actions">
        <button className="primary-action" type="button" onClick={onRetry}>
          {reloadRequired ? freshRequestAvailable ? 'Reload the scene' : 'Reload the app' : 'Retry the scene'} <span aria-hidden="true">↻</span>
        </button>
        <button className="secondary-action" type="button" onClick={onTextVoyage}>
          Continue without 3D
        </button>
      </div>
      <p className="synthetic-stamp">Conceptual systems map · education only · not diagnosis</p>
    </main>
  )
}

export default function App() {
  // Probe once at mount; locked decision: P0 requires WebGL2.
  const [webgl2, setWebgl2] = useState(webgl2Available)
  const [sceneIssue, setSceneIssue] = useState<string | null>(null)
  const [sceneReloadRequired, setSceneReloadRequired] = useState(false)
  const [sceneAttempt, setSceneAttempt] = useState(0)
  const [recoveryTextVoyage, setRecoveryTextVoyage] = useState(false)
  const qualityTier = useSettings((s) => s.qualityTier)
  const reducedMotion = useSettings((s) => s.reducedMotion)
  const textVoyagePreferred = useSettings((s) => s.textVoyagePreferred)
  const setTextVoyagePreferred = useSettings((s) => s.setTextVoyagePreferred)
  const textVoyage = textVoyagePreferred || recoveryTextVoyage
  const tier = resolveTier(qualityTier)

  useEffect(() => {
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (favicon) {
      favicon.href = `${import.meta.env.BASE_URL}${reducedMotion ? 'icon-static.svg' : 'icon.svg'}`
    }
  }, [reducedMotion])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('scene-retry')) return
    url.searchParams.delete('scene-retry')
    window.history.replaceState(window.history.state, '', url)
  }, [])

  const retryScene = () => {
    const available = webgl2Available()
    setWebgl2(available)
    setSceneIssue(available ? null : 'This browser or device still does not provide the WebGL2 context required by this release.')
    setSceneReloadRequired(false)
    if (available) {
      setRecoveryTextVoyage(false)
      setSceneAttempt((attempt) => attempt + 1)
    }
  }

  const reloadScene = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('scene-retry', Date.now().toString(36))
    window.location.replace(url)
  }

  const reloadApp = () => window.location.reload()

  const changeTextVoyagePreference = (enabled: boolean) => {
    setTextVoyagePreferred(enabled)
    if (!enabled) setRecoveryTextVoyage(false)
  }

  if (textVoyage) {
    return (
      <div className="app-root app-root--text">
        <JourneyPlaybackDriver />
        <div className="text-voyage-backdrop" aria-hidden="true" />
        <FlightDeck textVoyage onTextVoyageChange={changeTextVoyagePreference} />
      </div>
    )
  }

  if (!webgl2 || sceneIssue) {
    return (
      <RenderFallback
        reason={sceneIssue ?? 'This browser or device did not provide the WebGL2 context required by this release.'}
        reducedMotion={reducedMotion}
        reloadRequired={sceneReloadRequired}
        freshRequestAvailable={!sceneRecoveryRequested}
        onRetry={sceneReloadRequired ? sceneRecoveryRequested ? reloadApp : reloadScene : retryScene}
        onTextVoyage={() => setRecoveryTextVoyage(true)}
      />
    )
  }

  return (
    <div className="app-root">
      <JourneyPlaybackDriver />
      <SceneBoundary key={sceneAttempt} onFailure={() => {
        setSceneReloadRequired(true)
        setSceneIssue(sceneRecoveryRequested
          ? 'The 3D scene did not load after a fresh request.'
          : 'The 3D scene stopped unexpectedly. Reloading will make a fresh scene request while keeping saved local data.')
      }}>
        <Suspense fallback={<div className="scene-loading" aria-hidden="true" />}>
          <SceneCanvas
            dpr={TIER_DPR[tier]}
            reducedMotion={reducedMotion}
            antialias={tier !== 'low'}
            onContextLost={() => {
              setSceneReloadRequired(false)
              setSceneIssue('The device reported a lost WebGL context.')
            }}
          />
        </Suspense>
      </SceneBoundary>
      <FlightDeck textVoyage={false} onTextVoyageChange={changeTextVoyagePreference} />
    </div>
  )
}
