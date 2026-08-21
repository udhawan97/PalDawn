import { useEffect } from 'react'
import { JOURNEY, formatJourneyTime, stageAt, stageIndexAt, type NarrationMode } from '../journey/journey'
import { PORTAL_CENTER, PORTAL_END, PORTAL_START, smoothRange } from '../journey/route'
import { useExperience, type OpenPanel } from '../state/experience'
import { resolveTier, useSettings, type QualityTier } from '../state/settings'
import { useTelemetry } from '../state/telemetry'

const TIERS: QualityTier[] = ['auto', 'high', 'balanced', 'low']

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement &&
    ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A'].includes(target.tagName)
}

function SpdMark() {
  return (
    <div className="spd-mark" aria-hidden="true">
      <span className="spd-orbit spd-orbit-a" />
      <span className="spd-orbit spd-orbit-b" />
      <span className="spd-core">
        <i />
        <i />
      </span>
    </div>
  )
}

function PanelButton({ panel, children }: { panel: Exclude<OpenPanel, null>; children: React.ReactNode }) {
  const openPanel = useExperience((state) => state.openPanel)
  const setOpenPanel = useExperience((state) => state.setOpenPanel)
  return (
    <button
      className="text-button"
      type="button"
      aria-expanded={openPanel === panel}
      onClick={() => setOpenPanel(openPanel === panel ? null : panel)}
    >
      {children}
    </button>
  )
}

function Intro() {
  const start = useExperience((state) => state.start)
  const reducedMotion = useSettings((state) => state.reducedMotion)

  return (
    <section className="intro" aria-labelledby="intro-title">
      <p className="eyebrow">P0 technical voyage · v0.1</p>
      <h1 id="intro-title">Follow the<br /><em>first light.</em></h1>
      <p className="intro-copy">
        Enter a project-authored synthetic route that proves PalDawn’s flight
        system before any anatomy or clinical teaching is allowed aboard.
      </p>
      <div className="intro-actions">
        <button className="primary-action" type="button" onClick={() => start(reducedMotion)}>
          {reducedMotion ? 'Enter step mode' : 'Begin the voyage'}
          <span aria-hidden="true">↗</span>
        </button>
        <PanelButton panel="mission">Read the mission</PanelButton>
      </div>
      <p className="synthetic-stamp">
        <span aria-hidden="true">◇</span>
        Synthetic systems model · not anatomy
      </p>
    </section>
  )
}

function PhaseRail() {
  const entered = useExperience((state) => state.entered)
  const progress = useExperience((state) => state.progress)
  const setProgress = useExperience((state) => state.setProgress)
  const currentIndex = stageIndexAt(progress)

  return (
    <nav className="phase-rail" aria-label="Journey stages" data-visible={entered}>
      <span className="phase-axis" aria-hidden="true" />
      {JOURNEY.stages.map((stage, index) => (
        <button
          key={stage.id}
          type="button"
          className="phase-stop"
          aria-current={index === currentIndex ? 'step' : undefined}
          onClick={() => setProgress(stage.start + 0.002)}
        >
          <span className="phase-index">{String(index + 1).padStart(2, '0')}</span>
          <span className="phase-name">{stage.label}</span>
        </button>
      ))}
    </nav>
  )
}

function CompanionCaption() {
  const entered = useExperience((state) => state.entered)
  const progress = useExperience((state) => state.progress)
  const narrationMode = useExperience((state) => state.narrationMode)
  const setNarrationMode = useExperience((state) => state.setNarrationMode)
  const stage = stageAt(progress)

  if (!entered) return null

  return (
    <section className="companion" aria-labelledby="companion-title">
      <div className="companion-heading">
        <SpdMark />
        <div>
          <p className="eyebrow">SPD · co-pilot</p>
          <h2 id="companion-title">{stage.label}</h2>
        </div>
        <span className="level-tag">{stage.level}</span>
      </div>
      <p className="caption-copy" aria-live="polite" aria-atomic="true">
        {stage[narrationMode]}
      </p>
      <div className="narration-switch" role="group" aria-label="Narration depth">
        {(['guide', 'engineering'] as NarrationMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={narrationMode === mode}
            onClick={() => setNarrationMode(mode)}
          >
            {mode === 'guide' ? 'Guide' : 'Engineering'}
          </button>
        ))}
      </div>
    </section>
  )
}

function ControlDeck() {
  const entered = useExperience((state) => state.entered)
  const playing = useExperience((state) => state.playing)
  const progress = useExperience((state) => state.progress)
  const togglePlayback = useExperience((state) => state.togglePlayback)
  const replay = useExperience((state) => state.replay)
  const moveStage = useExperience((state) => state.moveStage)
  const setProgress = useExperience((state) => state.setProgress)
  const reducedMotion = useSettings((state) => state.reducedMotion)
  const currentIndex = stageIndexAt(progress)

  if (!entered) return null

  const finished = progress >= 1
  return (
    <section className="control-deck" id="flight-controls" aria-label="Voyage controls">
      <div className="transport-controls">
        <button type="button" aria-label="Skip to previous stage" onClick={() => moveStage(-1)}>←</button>
        <button
          className="play-control"
          type="button"
          onClick={() => finished ? replay(reducedMotion) : togglePlayback(reducedMotion)}
        >
          <span aria-hidden="true">{finished ? '↺' : reducedMotion ? '→' : playing ? 'Ⅱ' : '▶'}</span>
          {finished ? 'Replay' : reducedMotion ? 'Advance stage' : playing ? 'Pause' : 'Continue'}
        </button>
        <button type="button" aria-label="Skip to next stage" onClick={() => moveStage(1)}>→</button>
      </div>
      <div className="scrubber-block">
        <div className="scrubber-meta">
          <span>{JOURNEY.stages[currentIndex].label}</span>
          <output>{formatJourneyTime(progress)} / 0:42</output>
        </div>
        <input
          aria-label="Journey position"
          aria-valuetext={`${JOURNEY.stages[currentIndex].label}, ${Math.round(progress * 100)} percent`}
          type="range"
          min="0"
          max="1000"
          step="1"
          value={Math.round(progress * 1000)}
          onChange={(event) => setProgress(Number(event.target.value) / 1000)}
          style={{ '--journey-progress': `${progress * 100}%` } as React.CSSProperties}
        />
      </div>
      <div className="shortcut-hint">
        <kbd>Space</kbd> {reducedMotion ? 'next' : 'play / pause'}
        <kbd>←</kbd><kbd>→</kbd> seek
      </div>
    </section>
  )
}

function MissionPanel() {
  return (
    <>
      <p className="panel-kicker">Release boundary</p>
      <h2 id="panel-title">An engine demonstration, honestly labeled.</h2>
      <p>
        First light validates camera ownership, a semantic portal, a shared
        route lookup, GPU-driven flow markers, reduced motion, and keyboard
        operation. Every visible form is authored in code by PalDawn.
      </p>
      <dl className="boundary-list">
        <div><dt>On board</dt><dd>Synthetic geometry and engineering narration</dd></div>
        <div><dt>Held ashore</dt><dd>Anatomy assets, pathology, symptoms, and clinical teaching</dd></div>
        <div><dt>Gate</dt><dd>Per-object provenance plus named qualified-human review</dd></div>
      </dl>
      <a
        className="panel-link"
        href="https://github.com/udhawan97/PalDawn"
        target="_blank"
        rel="noreferrer"
      >
        Inspect source and evidence <span aria-hidden="true">↗</span>
      </a>
    </>
  )
}

function TranscriptPanel() {
  const narrationMode = useExperience((state) => state.narrationMode)
  return (
    <>
      <p className="panel-kicker">Text route · {narrationMode}</p>
      <h2 id="panel-title">Full transcript</h2>
      <ol className="transcript-list">
        {JOURNEY.stages.map((stage) => (
          <li key={stage.id}>
            <span>{stage.level}</span>
            <h3>{stage.label}</h3>
            <p>{stage[narrationMode]}</p>
          </li>
        ))}
      </ol>
    </>
  )
}

function SettingToggle({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="setting-toggle" htmlFor={id}>
      <span><strong>{label}</strong><small>{description}</small></span>
      <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}

function SettingsPanel() {
  const qualityTier = useSettings((state) => state.qualityTier)
  const reducedMotion = useSettings((state) => state.reducedMotion)
  const comfortVignette = useSettings((state) => state.comfortVignette)
  const highContrast = useSettings((state) => state.highContrast)
  const showTelemetry = useSettings((state) => state.showTelemetry)
  const setQualityTier = useSettings((state) => state.setQualityTier)
  const setReducedMotion = useSettings((state) => state.setReducedMotion)
  const setComfortVignette = useSettings((state) => state.setComfortVignette)
  const setHighContrast = useSettings((state) => state.setHighContrast)
  const setShowTelemetry = useSettings((state) => state.setShowTelemetry)

  return (
    <>
      <p className="panel-kicker">Display and comfort</p>
      <h2 id="panel-title">Flight settings</h2>
      <label className="quality-setting" htmlFor="quality-tier">
        <span><strong>Quality tier</strong><small>Auto is a heuristic, not a performance claim.</small></span>
        <select id="quality-tier" value={qualityTier} onChange={(event) => setQualityTier(event.target.value as QualityTier)}>
          {TIERS.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
        </select>
      </label>
      <SettingToggle id="reduced-motion" label="Reduced motion" description="Replaces flight with stage-by-stage cuts." checked={reducedMotion} onChange={setReducedMotion} />
      <SettingToggle id="comfort-vignette" label="Comfort vignette" description="Narrows peripheral motion during flight." checked={comfortVignette} onChange={setComfortVignette} />
      <SettingToggle id="high-contrast" label="High contrast" description="Strengthens type and control boundaries." checked={highContrast} onChange={setHighContrast} />
      <SettingToggle id="show-telemetry" label="Runtime telemetry" description="Shows an on-device frame-time estimate." checked={showTelemetry} onChange={setShowTelemetry} />
    </>
  )
}

function Drawer() {
  const openPanel = useExperience((state) => state.openPanel)
  const setOpenPanel = useExperience((state) => state.setOpenPanel)
  if (!openPanel) return null

  return (
    <aside className="drawer" role="dialog" aria-modal="false" aria-labelledby="panel-title">
      <button className="drawer-close" type="button" aria-label="Close panel" onClick={() => setOpenPanel(null)}>×</button>
      <div className="drawer-scroll">
        {openPanel === 'mission' && <MissionPanel />}
        {openPanel === 'transcript' && <TranscriptPanel />}
        {openPanel === 'settings' && <SettingsPanel />}
      </div>
    </aside>
  )
}

function Telemetry() {
  const show = useSettings((state) => state.showTelemetry)
  const tier = resolveTier(useSettings((state) => state.qualityTier))
  const telemetry = useTelemetry()
  if (!show) return null
  return (
    <output
      className="telemetry"
      id="runtime-telemetry"
      data-samples={telemetry.samples}
      aria-label="Estimated runtime telemetry"
    >
      <span>live estimate</span>
      <b>{telemetry.fps || '—'} fps</b>
      <b>p95 {telemetry.p95Ms || '—'} ms</b>
      <b>{telemetry.drawCalls} calls</b>
      <b>{telemetry.triangles.toLocaleString()} tris</b>
      <b>{tier}</b>
    </output>
  )
}

export function FlightDeck() {
  const entered = useExperience((state) => state.entered)
  const progress = useExperience((state) => state.progress)
  const setOpenPanel = useExperience((state) => state.setOpenPanel)
  const reducedMotion = useSettings((state) => state.reducedMotion)
  const comfortVignette = useSettings((state) => state.comfortVignette)
  const highContrast = useSettings((state) => state.highContrast)

  useEffect(() => {
    document.documentElement.dataset.contrast = highContrast ? 'high' : 'standard'
  }, [highContrast])

  useEffect(() => {
    if (reducedMotion) useExperience.getState().pause()
  }, [reducedMotion])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if (event.key === 'Escape') {
        setOpenPanel(null)
        return
      }
      if (!useExperience.getState().entered) return
      if (event.code === 'Space') {
        event.preventDefault()
        useExperience.getState().togglePlayback(reducedMotion)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        if (event.shiftKey || reducedMotion) useExperience.getState().moveStage(1)
        else useExperience.getState().setProgress(useExperience.getState().progress + 0.02)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        if (event.shiftKey || reducedMotion) useExperience.getState().moveStage(-1)
        else useExperience.getState().setProgress(useExperience.getState().progress - 0.02)
      } else if (event.key === 'Home') {
        useExperience.getState().setProgress(0)
      } else if (event.key === 'End') {
        useExperience.getState().setProgress(1)
      } else if (event.key.toLowerCase() === 't') {
        setOpenPanel('transcript')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [reducedMotion, setOpenPanel])

  const portalVeil = reducedMotion
    ? 0
    : smoothRange(progress, PORTAL_START, PORTAL_CENTER) *
      (1 - smoothRange(progress, PORTAL_CENTER, PORTAL_END))

  return (
    <div className="flight-ui" data-entered={entered}>
      <a className="skip-link" href="#flight-controls">Skip to voyage controls</a>
      <header className="masthead">
        <a className="wordmark" href="./" aria-label="PalDawn home">
          <span>Pal</span>Dawn <i>पाल</i>
        </a>
        <p className="build-mark">FIRST LIGHT / v0.1.0</p>
        <nav className="utility-nav" aria-label="Release information">
          <PanelButton panel="mission">Mission</PanelButton>
          <PanelButton panel="transcript">Transcript</PanelButton>
          <PanelButton panel="settings">Settings</PanelButton>
        </nav>
      </header>
      <div className="canvas-label" aria-hidden="true">
        <span>SYNTHETIC MODEL</span>
        <span>NO ANATOMICAL SCALE</span>
      </div>
      {!entered && <Intro />}
      <PhaseRail />
      <CompanionCaption />
      <ControlDeck />
      <Telemetry />
      <Drawer />
      <div className="portal-veil" aria-hidden="true" style={{ opacity: portalVeil * 0.5 }} />
      {comfortVignette && <div className="comfort-vignette" aria-hidden="true" />}
      <p className="safety-line">
        Education only · never diagnosis. Suspected heart attack? Contact local
        emergency services immediately.
      </p>
      <p className="sr-only" aria-live="polite">
        {entered ? `${stageAt(progress).label}. ${stageAt(progress).guide}` : 'First light introduction.'}
      </p>
    </div>
  )
}
