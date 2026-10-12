import { Component, lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from 'react'
import { FlightDeck } from './ui/FlightDeck'
import { useExperience } from './state/experience'
import { useAtlas } from './state/atlas'
import { resolveTier, TIER_DPR, useSettings } from './state/settings'
import { webgl2Available } from './webgl'
import type { AnatomyStudySession } from './anatomy/studyStorage'
import type { BodyPartId } from './data/diseases'

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

function SceneLoading({ onTextVoyage }: { onTextVoyage: () => void }) {
  const [slow, setSlow] = useState(false)
  const entered = useExperience((state) => state.entered)
  const atlasOpen = useAtlas((state) => state.open)

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 10_000)
    return () => window.clearTimeout(timer)
  }, [])

  if (!entered && !atlasOpen) return null

  return (
    <div className="scene-loading" role="status" aria-live="polite">
      <span className="scene-loading-signal" aria-hidden="true" />
      <div>
        <p>Preparing the conceptual 3D body…</p>
        {slow ? (
          <>
            <small>The diagram is taking longer than expected. Your saved learning is unchanged.</small>
            <button type="button" onClick={onTextVoyage}>Continue without 3D</button>
          </>
        ) : null}
      </div>
    </div>
  )
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
  returnFocus,
}: {
  reason: string
  reducedMotion: boolean
  reloadRequired: boolean
  freshRequestAvailable: boolean
  onRetry: () => void
  onTextVoyage: () => void
  returnFocus: HTMLElement | null
}) {
  const recoveryRef = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const controls = () => [...(recoveryRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
    controls()[0]?.focus()
    const containKeyboard = (event: KeyboardEvent) => {
      // The learner interface remains mounted, but none of its global shortcuts
      // may consume input while the recovery controls own the interaction.
      event.stopImmediatePropagation()
      if (event.key !== 'Tab') return
      event.preventDefault()
      const buttons = controls()
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus()
    }
    window.addEventListener('keydown', containKeyboard, true)
    return () => {
      window.removeEventListener('keydown', containKeyboard, true)
      window.requestAnimationFrame(() => {
        const targets = [returnFocus, ...document.querySelectorAll<HTMLElement>('.flight-ui .drawer, #intro-title, #flight-controls')]
        targets.find((target) => target && target !== document.body && target.isConnected && target.getClientRects().length && !target.closest('[inert]'))?.focus({ preventScroll: true })
      })
    }
  }, [returnFocus])
  return (
    <main ref={recoveryRef} className="fallback" role="alertdialog" aria-modal="true" aria-labelledby="scene-recovery-title">
      <img
        className="fallback-brand-icon"
        src={`${import.meta.env.BASE_URL}${reducedMotion ? 'icon-static.svg' : 'icon.svg'}`}
        alt=""
        aria-hidden="true"
      />
      <p className="eyebrow">PalDawn · Mechanism Lens</p>
      <h1 id="scene-recovery-title">The 3D map could not start.</h1>
      <p>{reason} The disease guides and First Light text voyage remain available, and your saved position and settings stay on this device.</p>
      <p>Unsaved work stays in this tab. Continue without 3D to copy or export it before reloading.</p>
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

function JourneyApp() {
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
  const recoveryActive = !textVoyage && (!webgl2 || sceneIssue !== null)
  const recoveryReturnFocus = useRef<HTMLElement | null>(null)
  const sceneOwner = useMemo(() => ({ active: true }), [textVoyage, recoveryActive, sceneAttempt])
  const tier = resolveTier(qualityTier)

  useLayoutEffect(() => {
    sceneOwner.active = true
    // Disposing a canvas can report context loss after a newer scene mounts.
    return () => { sceneOwner.active = false }
  }, [sceneOwner])

  const reportSceneIssue = (reason: string) => {
    recoveryReturnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    useExperience.getState().pause()
    setSceneIssue(reason)
  }

  useLayoutEffect(() => {
    if (recoveryActive) useExperience.getState().pause()
  }, [recoveryActive])

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
    if (available) setSceneIssue(null)
    else reportSceneIssue('This browser or device still does not provide the WebGL2 context required by this release.')
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

  return (
    <div className={`app-root${textVoyage ? ' app-root--text' : ''}`}>
      {!recoveryActive && <JourneyPlaybackDriver />}
      {textVoyage ? <div className="text-voyage-backdrop" aria-hidden="true" /> : recoveryActive ? null : <SceneBoundary key={sceneAttempt} onFailure={() => {
        if (!sceneOwner.active) return
        setSceneReloadRequired(true)
        reportSceneIssue(sceneRecoveryRequested
          ? 'The 3D scene did not load after a fresh request.'
          : 'The 3D scene stopped unexpectedly. Reloading will make a fresh scene request while keeping saved local data.')
      }}>
        <Suspense fallback={<SceneLoading onTextVoyage={() => setRecoveryTextVoyage(true)} />}>
          <SceneCanvas
            dpr={TIER_DPR[tier]}
            reducedMotion={reducedMotion}
            antialias={tier !== 'low'}
            onContextLost={() => {
              if (!sceneOwner.active) return
              setSceneReloadRequired(false)
              reportSceneIssue('The device reported a lost WebGL context.')
            }}
          />
        </Suspense>
      </SceneBoundary>}
      <FlightDeck textVoyage={textVoyage} recoveryActive={recoveryActive} onTextVoyageChange={changeTextVoyagePreference} />
      {recoveryActive && <RenderFallback
        reason={sceneIssue ?? 'This browser or device did not provide the WebGL2 context required by this release.'}
        reducedMotion={reducedMotion}
        reloadRequired={sceneReloadRequired}
        freshRequestAvailable={!sceneRecoveryRequested}
        onRetry={sceneReloadRequired ? sceneRecoveryRequested ? reloadApp : reloadScene : retryScene}
        onTextVoyage={() => setRecoveryTextVoyage(true)}
        returnFocus={recoveryReturnFocus.current}
      />}
    </div>
  )
}


const AnatomyStudy = import.meta.env.VITE_ANATOMY_PREVIEW ? lazy(() => import('./anatomy/AnatomyStudy')) : null
const AnatomyLanding = import.meta.env.VITE_ANATOMY_PREVIEW ? lazy(() => import('./anatomy/AnatomyLanding')) : null

const candidateView = (url: URL): string => {
  if (url.hash.startsWith('#atlas/')) return 'journeys'
  if (url.hash === '#home') return 'journeys'
  if (url.hash === '#body') return 'anatomy'
  if (url.hash === '#conditions' || url.hash === '#study') return 'journeys'
  return url.searchParams.get('study') ?? 'home'
}

function AnatomyCandidate() {
  const [view, setView] = useState(() => candidateView(new URL(window.location.href)))
  const [anatomyStudy, setAnatomyStudy] = useState<AnatomyStudySession | null>(null)
  const [requestedBodyPart, setRequestedBodyPart] = useState<BodyPartId | null>(null)
  const [returnView, setReturnView] = useState<'home' | 'journeys'>(() =>
    new URL(window.location.href).hash.startsWith('#atlas/') ? 'journeys' : 'home')
  const navigate = (next: string, reference?: 'male' | 'female') => {
    useExperience.getState().pause()
    const url = new URL(window.location.href)
    if (reference) url.searchParams.set('reference', reference)
    if (next === 'home') {
      url.searchParams.delete('study')
      url.hash = ''
    } else url.searchParams.set('study', next)
    if (next === 'anatomy' && !url.hash.startsWith('#atlas/')) url.hash = ''
    window.history.pushState(window.history.state, '', url); setView(next)
  }
  useEffect(() => {
    const follow = () => setView(candidateView(new URL(window.location.href)))
    const open = (event: Event) => {
      const url = new URL(window.location.href)
      setReturnView(url.hash.startsWith('#atlas/') ? 'journeys' : candidateView(url) === 'journeys' ? 'journeys' : 'home')
      setRequestedBodyPart((event as CustomEvent<{ bodyPart?: BodyPartId }>).detail?.bodyPart ?? null)
      navigate('anatomy')
    }
    window.addEventListener('paldawn:open-anatomy', open); window.addEventListener('popstate', follow)
    return () => { window.removeEventListener('paldawn:open-anatomy', open); window.removeEventListener('popstate', follow) }
  }, [])
  const closeStudy = () => {
    const url = new URL(window.location.href)
    if (!url.hash.startsWith('#atlas/')) {
      navigate(returnView)
      return
    }
    if (returnView === 'journeys') {
      window.history.back()
      return
    }
    useExperience.getState().pause()
    url.searchParams.delete('study')
    window.history.replaceState(window.history.state, '', url)
    setView('journeys')
  }
  return <Suspense fallback={<main className="fallback"><h1>Opening PalDawn…</h1><button onClick={() => navigate('journeys')}>Continue to disease pathways</button></main>}>
    {view === 'anatomy' && AnatomyStudy ? <AnatomyStudy onClose={closeStudy} retainedStudy={anatomyStudy} onRetainStudy={setAnatomyStudy} requestedBodyPart={requestedBodyPart}/> : view === 'home' && AnatomyLanding ? <AnatomyLanding onExplore={(sex) => { setRequestedBodyPart(null); setReturnView('home'); navigate('anatomy', sex) }} onJourneys={() => navigate('journeys')}/> : <JourneyApp/>}
  </Suspense>
}
export default function App() {
  return import.meta.env.VITE_ANATOMY_PREVIEW ? <AnatomyCandidate/> : <JourneyApp/>
}
