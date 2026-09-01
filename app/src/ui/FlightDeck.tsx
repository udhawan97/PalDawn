import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  JOURNEY,
  formatDuration,
  formatJourneyTime,
  progressForStageId,
  stageAt,
  stageIdFromHash,
  stageIndexAt,
  stageUrl,
  transcriptText,
  type NarrationMode,
} from '../journey/journey'
import { PORTAL_CENTER, PORTAL_END, PORTAL_START, smoothRange } from '../journey/route'
import { useExperience, type OpenPanel } from '../state/experience'
import {
  resolveTier,
  useSettings,
  type CaptionScale,
  type PlaybackRate,
  type QualityTier,
} from '../state/settings'
import { useTelemetry } from '../state/telemetry'
import { diagnosticReport } from '../platform/diagnostics'
import { copyText, downloadText } from '../platform/downloads'
import {
  PALDAWN_BOOKMARKS_KEY,
  PALDAWN_RESET_KEY,
  PALDAWN_SETTINGS_KEY,
  PALDAWN_STORAGE_FAILURE_EVENT,
  PALDAWN_STORAGE_SUCCESS_EVENT,
  PALDAWN_WORKSPACE_KEY,
  MAX_STAGE_NOTE_LENGTH,
  exportLocalData,
  getPendingLocalDataRecovery,
  loadLearnerWorkspace,
  loadStageBookmarks,
  parseLocalDataImport,
  replaceLocalDataFromImport,
  resetLocalData,
  saveLearnerWorkspace,
  saveJourneySession,
  saveStageBookmarks,
  writeLocalStorageValue,
  type LearnerWorkspace,
  type LocalDataImportResult,
  type StorageFailureDetail,
} from '../platform/localData'
import {
  activatePwaUpdate,
  checkForPwaUpdate,
  getPwaInstallState,
  registerPwaUpdatePreparation,
  requestPwaInstall,
  type PwaInstallState,
  type PwaUpdateBlockedDetail,
} from '../platform/pwa'
import { shareOrCopy, type ShareOutcome } from '../platform/share'
import { studyWorkspaceMarkdown } from '../platform/study'
import { syncAtlasFromHistory, useAtlas } from '../state/atlas'
import { DiseaseExplorer, TopDiseasesRail } from './DiseaseExplorer'

const TIERS: QualityTier[] = ['auto', 'high', 'balanced', 'low']
const CAPTION_SCALES: CaptionScale[] = ['standard', 'large', 'largest']
const PLAYBACK_RATES: PlaybackRate[] = [0.5, 1, 1.5]
const STAGE_IDS = new Set(JOURNEY.stages.map((stage) => stage.id))
const FULL_WIDTH_DRAWER_QUERY = '(max-width: 470px)'
const DRAWER_FOCUSABLE_SELECTOR = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
const PANEL_LABELS: Record<Exclude<OpenPanel, null>, string> = {
  mission: 'Mission',
  transcript: 'Transcript',
  workspace: 'Study',
  settings: 'Settings',
  help: 'Help',
}

const orderedBookmarks = (ids: string[]): string[] =>
  JOURNEY.stages.filter((stage) => ids.includes(stage.id)).map((stage) => stage.id)

const drawerFocusables = (drawer: HTMLElement): HTMLElement[] =>
  [...drawer.querySelectorAll<HTMLElement>(DRAWER_FOCUSABLE_SELECTOR)]
    .filter((element) => element.getClientRects().length > 0 && !element.closest('[inert]'))

const visibleFocusTarget = (element: HTMLElement | null): element is HTMLElement =>
  Boolean(element && element !== document.body && element.isConnected && element.getClientRects().length > 0 && !element.closest('[inert]'))

const shareStatus = (outcome: ShareOutcome, subject: string): string => {
  if (outcome === 'shared') return `${subject} shared.`
  if (outcome === 'copied') return `Sharing is unavailable, so the ${subject.toLowerCase()} was copied.`
  if (outcome === 'cancelled') return 'Share cancelled.'
  return 'Sharing and copy are unavailable in this browser context.'
}

const replaceStageHash = (id: string): void => {
  const url = new URL(window.location.href)
  url.hash = `stage/${encodeURIComponent(id)}`
  window.history.replaceState(window.history.state, '', url)
}

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
  const reducedMotion = useSettings((state) => state.reducedMotion)
  return (
    <button
      className="text-button"
      type="button"
      data-panel={panel}
      aria-expanded={openPanel === panel}
      onClick={() => setOpenPanel(openPanel === panel ? null : panel, { resumePlayback: !reducedMotion })}
    >
      {children}
    </button>
  )
}

function Intro() {
  const start = useExperience((state) => state.start)
  const resume = useExperience((state) => state.resume)
  const progress = useExperience((state) => state.progress)
  const reducedMotion = useSettings((state) => state.reducedMotion)
  const openDisease = useAtlas((state) => state.openDisease)
  const resumeAvailable = progress > 0.01 && progress < 0.999

  return (
    <section className="intro" aria-labelledby="intro-title">
      <p className="eyebrow">A companion voyage through the human body</p>
      <h1 id="intro-title" aria-label="Enter the body. Follow what happens next." tabIndex={-1}>
        <span>Enter the body.</span>
        <span className="intro-brand-route" aria-hidden="true">
          <img
            src={`${import.meta.env.BASE_URL}${reducedMotion ? 'icon-static.svg' : 'icon.svg'}`}
            alt=""
          />
          <i />
        </span>
        <span>Follow what happens next.</span>
      </h1>
      <p className="intro-copy">
        Choose a source-linked condition, then follow its authored systems path
        step by step. The 3D body is a conceptual learning map, not reviewed anatomy.
      </p>
      <div className="intro-actions" data-resume-available={resumeAvailable}>
        <button
          className="primary-action"
          type="button"
          data-atlas-opener="intro-diabetes"
          onClick={() => openDisease('diabetes', '[data-atlas-opener="intro-diabetes"]')}
        >
          Explore diabetes
          <span aria-hidden="true">↗</span>
        </button>
        <button className="secondary-action begin-action" type="button" onClick={() => start(reducedMotion)}>
          {reducedMotion ? 'Enter step mode' : 'Begin the voyage'}
        </button>
        {resumeAvailable ? (
          <button className="secondary-action resume-action" type="button" onClick={resume}>
            Resume at {stageAt(progress).label}
          </button>
        ) : null}
        <PanelButton panel="mission">Read the mission</PanelButton>
      </div>
      <p className="synthetic-stamp">
        <span aria-hidden="true">◇</span>
        Conceptual systems map · education only · not diagnosis
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
          onClick={() => {
            replaceStageHash(stage.id)
            setProgress(stage.start + 0.002)
          }}
        >
          <span className="phase-index">{String(index + 1).padStart(2, '0')}</span>
          <span className="phase-name">{stage.label}</span>
        </button>
      ))}
    </nav>
  )
}

function CompanionCaption({
  bookmarks,
  onToggleBookmark,
  onOpenWorkspace,
}: {
  bookmarks: string[]
  onToggleBookmark: (id: string) => boolean
  onOpenWorkspace: (focusNote: boolean) => void
}) {
  const entered = useExperience((state) => state.entered)
  const progress = useExperience((state) => state.progress)
  const narrationMode = useExperience((state) => state.narrationMode)
  const setNarrationMode = useExperience((state) => state.setNarrationMode)
  const [linkStatus, setLinkStatus] = useState('')
  const stage = stageAt(progress)
  const bookmarked = bookmarks.includes(stage.id)

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
      <div className="companion-actions">
        <button className="quiet-action" type="button" onClick={() => onOpenWorkspace(false)}>
          Compare tracks
        </button>
        <button className="quiet-action" type="button" onClick={() => onOpenWorkspace(true)}>
          Private note
        </button>
        <button
          className="quiet-action"
          type="button"
          aria-pressed={bookmarked}
          onClick={() => {
            const persisted = onToggleBookmark(stage.id)
            setLinkStatus(persisted
              ? bookmarked ? 'Stage removed from saved stages.' : 'Stage saved on this device.'
              : 'Stage changed for this tab, but browser storage is unavailable. Reload may lose it.')
          }}
        >
          {bookmarked ? 'Saved' : 'Save stage'}
        </button>
        <button
          className="quiet-action"
          type="button"
          onClick={() => {
            replaceStageHash(stage.id)
            void shareOrCopy({
              title: `PalDawn First Light — ${stage.label}`,
              text: stage[narrationMode],
              url: stageUrl(stage.id),
            }).then((outcome) => setLinkStatus(shareStatus(outcome, 'Stage')))
          }}
        >
          Share
        </button>
        <button
          className="quiet-action"
          type="button"
          aria-label="Copy this stage link"
          onClick={() => {
            replaceStageHash(stage.id)
            void copyText(stageUrl(stage.id)).then((copied) => {
              setLinkStatus(copied ? 'Stage link copied.' : 'Copy unavailable. The stage URL is now in the address bar.')
            })
          }}
        >
          Copy link
        </button>
      </div>
      <p className="action-status" aria-live="polite">{linkStatus}</p>
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
  const playbackRate = useSettings((state) => state.playbackRate)
  const currentIndex = stageIndexAt(progress)

  if (!entered) return null

  const finished = progress >= 1
  const moveToStage = (direction: -1 | 1) => {
    const target = Math.min(JOURNEY.stages.length - 1, Math.max(0, currentIndex + direction))
    replaceStageHash(JOURNEY.stages[target].id)
    moveStage(direction)
  }
  return (
    <section className="control-deck" id="flight-controls" aria-label="Voyage controls" tabIndex={-1}>
      <div className="transport-controls">
        <button type="button" aria-label="Skip to previous stage" onClick={() => moveToStage(-1)}>←</button>
        <button
          className="play-control"
          type="button"
          onClick={() => finished ? replay(reducedMotion) : togglePlayback(reducedMotion)}
        >
          <span aria-hidden="true">{finished ? '↺' : reducedMotion ? '→' : playing ? 'Ⅱ' : '▶'}</span>
          {finished ? 'Replay' : reducedMotion ? 'Advance stage' : playing ? 'Pause' : 'Continue'}
        </button>
        <button type="button" aria-label="Skip to next stage" onClick={() => moveToStage(1)}>→</button>
      </div>
      <div className="scrubber-block">
        <div className="scrubber-meta">
          <span>{JOURNEY.stages[currentIndex].label}</span>
          <output>{formatJourneyTime(progress)} / {formatDuration(JOURNEY.duration_seconds)}</output>
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
        <output aria-label="Playback speed">{playbackRate}×</output>
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

function TranscriptPanel({
  bookmarks,
  onToggleBookmark,
}: {
  bookmarks: string[]
  onToggleBookmark: (id: string) => boolean
}) {
  const narrationMode = useExperience((state) => state.narrationMode)
  const setProgress = useExperience((state) => state.setProgress)
  const setOpenPanel = useExperience((state) => state.setOpenPanel)
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const transcript = transcriptText(narrationMode)
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const stages = normalizedQuery
    ? JOURNEY.stages.filter((stage) =>
      [stage.label, stage.level, stage[narrationMode]].join(' ').toLocaleLowerCase().includes(normalizedQuery),
    )
    : JOURNEY.stages
  const savedStages = JOURNEY.stages.filter((stage) => bookmarks.includes(stage.id))
  const openStage = (id: string) => {
    const progress = progressForStageId(id)
    if (progress === null) return
    replaceStageHash(id)
    setProgress(progress)
    setOpenPanel(null)
  }

  return (
    <>
      <p className="panel-kicker">Text route · {narrationMode}</p>
      <h2 id="panel-title">Full transcript</h2>
      <label className="transcript-search" htmlFor="transcript-search">
        <span>Find a stage or phrase</span>
        <input
          id="transcript-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search this authored route"
        />
      </label>
      <p className="search-status" role="status">
        {stages.length} {stages.length === 1 ? 'stage' : 'stages'} shown
      </p>
      {savedStages.length ? (
        <section className="saved-stages" aria-labelledby="saved-stages-title">
          <h3 id="saved-stages-title">Saved stages</h3>
          <div>
            {savedStages.map((stage) => (
              <button type="button" key={stage.id} onClick={() => openStage(stage.id)}>{stage.label}</button>
            ))}
          </div>
        </section>
      ) : null}
      <ol className="transcript-list">
        {stages.map((stage) => (
          <li key={stage.id}>
            <span>{stage.level}</span>
            <h3>{stage.label}</h3>
            <p>{stage[narrationMode]}</p>
            <div className="transcript-stage-actions">
              <button type="button" onClick={() => openStage(stage.id)}>Go to stage</button>
              <button type="button" aria-pressed={bookmarks.includes(stage.id)} onClick={() => onToggleBookmark(stage.id)}>
                {bookmarks.includes(stage.id) ? 'Remove saved stage' : 'Save stage'}
              </button>
            </div>
          </li>
        ))}
      </ol>
      {!stages.length ? <p className="empty-search">No stage matches that phrase.</p> : null}
      <div className="panel-actions" aria-label="Transcript actions">
        <button type="button" onClick={() => {
          void copyText(transcript).then((copied) => setStatus(copied ? 'Transcript copied.' : 'Copy unavailable.'))
        }}>Copy transcript</button>
        <button type="button" onClick={() => {
          downloadText(`paldawn-first-light-${narrationMode}.txt`, transcript)
          setStatus('Transcript downloaded.')
        }}>Download text</button>
        <button type="button" onClick={() => {
          void shareOrCopy({
            title: `PalDawn First Light — ${narrationMode} transcript`,
            text: transcript,
            url: window.location.href.split('#')[0],
          }).then((outcome) => setStatus(shareStatus(outcome, 'Transcript')))
        }}>Share transcript</button>
        <button type="button" onClick={() => window.print()}>Print</button>
      </div>
      <p className="action-status" aria-live="polite">{status}</p>
    </>
  )
}

function WorkspacePanel({
  workspace,
  workspacePersisted,
  onUpdateWorkspace,
  onRetryPersistence,
}: {
  workspace: LearnerWorkspace
  workspacePersisted: boolean
  onUpdateWorkspace: (update: (current: LearnerWorkspace) => LearnerWorkspace) => void
  onRetryPersistence: () => boolean
}) {
  const progress = useExperience((state) => state.progress)
  const setProgress = useExperience((state) => state.setProgress)
  const setOpenPanel = useExperience((state) => state.setOpenPanel)
  const [selectedStageId, setSelectedStageId] = useState(stageAt(progress).id)
  const [status, setStatus] = useState('')
  const selectedStage = JOURNEY.stages.find((stage) => stage.id === selectedStageId) ?? JOURNEY.stages[0]
  const note = workspace.notes[selectedStage.id] ?? ''
  const checkpointed = workspace.checkpoints.includes(selectedStage.id)
  const markdown = () => studyWorkspaceMarkdown(workspace)

  useEffect(() => {
    setSelectedStageId(stageAt(progress).id)
  }, [progress])

  const updateNote = (value: string) => {
    onUpdateWorkspace((current) => {
      const notes = { ...current.notes }
      const bounded = value.replaceAll('\0', '').slice(0, MAX_STAGE_NOTE_LENGTH)
      if (bounded.trim()) notes[selectedStage.id] = bounded
      else delete notes[selectedStage.id]
      return { ...current, notes }
    })
  }

  const toggleCheckpoint = () => {
    onUpdateWorkspace((current) => ({
      ...current,
      checkpoints: current.checkpoints.includes(selectedStage.id)
        ? current.checkpoints.filter((id) => id !== selectedStage.id)
        : [...current.checkpoints, selectedStage.id],
    }))
  }

  return (
    <>
      <p className="panel-kicker">Private learner workspace</p>
      <h2 id="panel-title">Compare, note, and continue.</h2>
      <p className="panel-note">
        Stored only in this browser. Do not enter patient or personal health information.
        Personal checkpoints are not evidence, approval, or medical review.
      </p>
      {!workspacePersisted ? (
        <aside className="persistence-warning" role="alert">
          <strong>Browser storage is unavailable.</strong>
          <p>Keep this page open while editing. Reloading may lose these private notes and checkpoints; copy or download them before leaving.</p>
          <button type="button" onClick={() => {
            setStatus(onRetryPersistence()
              ? 'Private workspace saved in this browser.'
              : 'Browser storage is still unavailable. Keep this page open or export your work.')
          }}>Retry saving</button>
        </aside>
      ) : null}
      <nav className="workspace-stage-nav" aria-label="Workspace stages">
        {JOURNEY.stages.map((stage, index) => (
          <button
            key={stage.id}
            type="button"
            aria-current={stage.id === selectedStage.id ? 'step' : undefined}
            onClick={() => setSelectedStageId(stage.id)}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>{stage.label}
          </button>
        ))}
      </nav>
      <section className="track-comparison" aria-labelledby="track-comparison-title">
        <div className="workspace-heading">
          <div>
            <p>{selectedStage.level}</p>
            <h3 id="track-comparison-title">{selectedStage.label}</h3>
          </div>
          <button type="button" onClick={() => {
            const next = progressForStageId(selectedStage.id)
            if (next === null) return
            replaceStageHash(selectedStage.id)
            setProgress(next)
            setOpenPanel(null)
          }}>Go to stage</button>
        </div>
        <div className="track-columns">
          <article><h4>Guide</h4><p>{selectedStage.guide}</p></article>
          <article><h4>Engineering</h4><p>{selectedStage.engineering}</p></article>
        </div>
      </section>
      <label className="workspace-note" htmlFor="workspace-note">
        <span><strong>Private note for {selectedStage.label}</strong><small>{note.length} / {MAX_STAGE_NOTE_LENGTH}</small></span>
        <textarea
          id="workspace-note"
          value={note}
          maxLength={MAX_STAGE_NOTE_LENGTH}
          rows={5}
          onChange={(event) => updateNote(event.target.value)}
          placeholder="Add a local reminder in your own words"
        />
      </label>
      <div className="workspace-checkpoint">
        <button type="button" aria-pressed={checkpointed} onClick={toggleCheckpoint}>
          {checkpointed ? 'Personal checkpoint complete' : 'Mark personal checkpoint'}
        </button>
        <output aria-live="polite">
          {workspace.checkpoints.length} of {JOURNEY.stages.length} personal checkpoints
        </output>
      </div>
      <section className="workspace-summary" aria-labelledby="workspace-summary-title">
        <h3 id="workspace-summary-title">Study summary</h3>
        <ol>
          {JOURNEY.stages.map((stage) => (
            <li key={stage.id}>
              <button type="button" onClick={() => setSelectedStageId(stage.id)}>{stage.label}</button>
              <span>{workspace.checkpoints.includes(stage.id) ? 'Checkpoint complete' : 'Open'}</span>
              <span>{workspace.notes[stage.id]?.trim()
                ? workspacePersisted ? 'Private note saved' : 'Private note not saved'
                : 'No note'}</span>
            </li>
          ))}
        </ol>
      </section>
      <div className="panel-actions" aria-label="Workspace actions">
        <button type="button" onClick={() => {
          void copyText(markdown()).then((copied) => setStatus(copied ? 'Study workspace copied.' : 'Copy unavailable.'))
        }}>Copy study Markdown</button>
        <button type="button" onClick={() => {
          downloadText('paldawn-first-light-study.md', markdown(), 'text/markdown;charset=utf-8')
          setStatus('Private study Markdown downloaded.')
        }}>Download study Markdown</button>
      </div>
      <p className="action-status" aria-live="polite">{status}</p>
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

function HelpPanel() {
  return (
    <>
      <p className="panel-kicker">Controls and access</p>
      <h2 id="panel-title">Fly without guessing.</h2>
      <dl className="shortcut-list">
        <div><dt><kbd>Space</kbd></dt><dd>Play or pause; advance in reduced-motion mode</dd></div>
        <div><dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>Seek through the route</dd></div>
        <div><dt><kbd>Shift</kbd> + <kbd>←</kbd> <kbd>→</kbd></dt><dd>Move one complete stage</dd></div>
        <div><dt><kbd>Home</kbd> <kbd>End</kbd></dt><dd>Move to the first or final route position</dd></div>
        <div><dt><kbd>T</kbd></dt><dd>Open the complete transcript</dd></div>
        <div><dt><kbd>/</kbd></dt><dd>Open the transcript and focus its search</dd></div>
        <div><dt><kbd>B</kbd></dt><dd>Save or remove the current stage on this device</dd></div>
        <div><dt><kbd>N</kbd></dt><dd>Open the private workspace and focus the current stage note</dd></div>
        <div><dt><kbd>?</kbd></dt><dd>Open this help panel</dd></div>
        <div><dt><kbd>Esc</kbd></dt><dd>Close the open panel</dd></div>
      </dl>
      <p className="panel-note">All controls remain local. PalDawn does not send interaction or diagnostic data anywhere.</p>
    </>
  )
}

function SettingsPanel({
  textVoyage,
  onTextVoyageChange,
  workspace,
  setStatus,
}: {
  textVoyage: boolean
  onTextVoyageChange: (enabled: boolean) => void
  workspace: LearnerWorkspace
  setStatus: (status: string) => void
}) {
  const qualityTier = useSettings((state) => state.qualityTier)
  const reducedMotion = useSettings((state) => state.reducedMotion)
  const comfortVignette = useSettings((state) => state.comfortVignette)
  const highContrast = useSettings((state) => state.highContrast)
  const showTelemetry = useSettings((state) => state.showTelemetry)
  const captionScale = useSettings((state) => state.captionScale)
  const playbackRate = useSettings((state) => state.playbackRate)
  const textVoyagePreferred = useSettings((state) => state.textVoyagePreferred)
  const setQualityTier = useSettings((state) => state.setQualityTier)
  const setReducedMotion = useSettings((state) => state.setReducedMotion)
  const setComfortVignette = useSettings((state) => state.setComfortVignette)
  const setHighContrast = useSettings((state) => state.setHighContrast)
  const setShowTelemetry = useSettings((state) => state.setShowTelemetry)
  const setCaptionScale = useSettings((state) => state.setCaptionScale)
  const setPlaybackRate = useSettings((state) => state.setPlaybackRate)
  const restart = useExperience((state) => state.restart)
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement))
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmRestart, setConfirmRestart] = useState(false)
  const [pendingImport, setPendingImport] = useState<Extract<LocalDataImportResult, { ok: true }> | null>(null)
  const [pendingLocalDataRecovery, setPendingLocalDataRecovery] = useState<'reset' | 'import' | null>(
    () => getPendingLocalDataRecovery()?.kind ?? null,
  )
  const [installState, setInstallState] = useState<PwaInstallState>(getPwaInstallState)
  const fullscreenAvailable = document.fullscreenEnabled
  const mounted = useRef(true)
  const recoveryActionRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useLayoutEffect(() => {
    if (!pendingLocalDataRecovery) return
    const focusFrame = window.requestAnimationFrame(() => recoveryActionRef.current?.focus({ preventScroll: false }))
    return () => window.cancelAnimationFrame(focusFrame)
  }, [pendingLocalDataRecovery])

  const reportStatus = (status: string) => {
    if (mounted.current) setStatus(status)
  }

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    const syncInstallState = () => setInstallState(getPwaInstallState())
    window.addEventListener('paldawn:install-ready', syncInstallState)
    window.addEventListener('paldawn:app-installed', syncInstallState)
    return () => {
      window.removeEventListener('paldawn:install-ready', syncInstallState)
      window.removeEventListener('paldawn:app-installed', syncInstallState)
    }
  }, [])

  const report = () => diagnosticReport({
    qualityTier,
    resolvedTier: resolveTier(qualityTier),
    reducedMotion,
    highContrast,
    textVoyage,
    playbackRate,
    bookmarkCount: orderedBookmarks(loadStageBookmarks()).length,
    noteCount: Object.keys(workspace.notes).length,
    checkpointCount: workspace.checkpoints.length,
    telemetry: useTelemetry.getState(),
  })

  const finishLocalDataRecovery = () => {
    const recoveryUrl = new URL(window.location.href)
    recoveryUrl.hash = ''
    window.history.replaceState(null, '', recoveryUrl)
    window.location.reload()
  }

  return (
    <>
      {pendingLocalDataRecovery ? (
        <aside className="persistence-warning local-data-recovery" role="alert" aria-labelledby="local-data-recovery-title">
          <strong id="local-data-recovery-title">Reload required to finish local-data recovery.</strong>
          <p>
            {pendingLocalDataRecovery === 'reset'
              ? 'PalDawn saved and verified a recovery plan that will finish clearing the local records selected by reset.'
              : 'PalDawn saved and verified a recovery plan that will finish replacing local records with the validated backup preview.'}{' '}
            Settings and local-data actions are disabled until recovery finishes. Reload this tab now; if it closes first, recovery resumes the next time PalDawn opens.
          </p>
          <button ref={recoveryActionRef} type="button" onClick={finishLocalDataRecovery}>Reload to finish recovery</button>
        </aside>
      ) : null}
      <fieldset className="settings-recovery-lock" disabled={pendingLocalDataRecovery !== null}>
        <legend className="sr-only">Settings and local-data actions</legend>
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
      <label className="quality-setting" htmlFor="caption-scale">
        <span><strong>Caption size</strong><small>Scales SPD narration without changing scene geometry.</small></span>
        <select id="caption-scale" value={captionScale} onChange={(event) => setCaptionScale(event.target.value as CaptionScale)}>
          {CAPTION_SCALES.map((scale) => <option key={scale} value={scale}>{scale}</option>)}
        </select>
      </label>
      <label className="quality-setting" htmlFor="playback-rate">
        <span><strong>Playback speed</strong><small>Changes route pacing without skipping authored stages.</small></span>
        <select id="playback-rate" value={playbackRate} onChange={(event) => setPlaybackRate(Number(event.target.value) as PlaybackRate)}>
          {PLAYBACK_RATES.map((rate) => <option key={rate} value={rate}>{rate}×</option>)}
        </select>
      </label>
      <div className="settings-actions">
        {textVoyage && !textVoyagePreferred ? (
          <>
            <button type="button" onClick={() => onTextVoyageChange(true)}>Prefer text voyage in this browser</button>
            <button type="button" onClick={() => onTextVoyageChange(false)}>Try the 3D scene again</button>
          </>
        ) : (
          <button type="button" onClick={() => onTextVoyageChange(!textVoyagePreferred)}>
            {textVoyagePreferred ? 'Return to 3D scene' : 'Use text voyage'}
          </button>
        )}
        <button
          type="button"
          disabled={!fullscreenAvailable}
          onClick={() => {
            const action = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()
            void action.catch(() => reportStatus('Fullscreen is unavailable in this browser context.'))
          }}
        >
          {fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        </button>
        <button type="button" onClick={() => {
          void checkForPwaUpdate().then((outcome) => {
            if (outcome === 'checked') reportStatus('PalDawn checked for an app update.')
            else if (outcome === 'unavailable') reportStatus('App update checks are unavailable in this browser context.')
            else reportStatus('PalDawn could not check for an app update. Try again when the connection is available.')
          })
        }}>Check for app update</button>
        <button
          type="button"
          disabled={installState === 'installed'}
          onClick={() => {
            void requestPwaInstall().then((outcome) => {
              setInstallState(getPwaInstallState())
              if (outcome === 'accepted') reportStatus('Install request accepted. Your browser will finish adding PalDawn.')
              else if (outcome === 'dismissed') reportStatus('Install cancelled. Nothing changed.')
              else if (outcome === 'installed') reportStatus('PalDawn is already running as an installed app.')
              else reportStatus('If your browser offers Install App or Add to Home Screen, use that command to install PalDawn.')
            })
          }}
        >
          {installState === 'available' ? 'Install PalDawn' : installState === 'installed' ? 'PalDawn installed' : 'Installation help'}
        </button>
      </div>
      <section className="settings-subsection" aria-labelledby="diagnostics-title">
        <h3 id="diagnostics-title">Local diagnostics</h3>
        <p>Generated only when requested. Nothing is uploaded automatically.</p>
        <div className="panel-actions">
          <button type="button" onClick={() => {
            void copyText(report()).then((copied) => reportStatus(copied ? 'Diagnostics copied.' : 'Copy unavailable.'))
          }}>Copy diagnostics</button>
          <button type="button" onClick={() => {
            downloadText('paldawn-diagnostics.json', report(), 'application/json')
            reportStatus('Diagnostics downloaded.')
          }}>Download diagnostics</button>
        </div>
      </section>
      <section className="settings-subsection" aria-labelledby="local-data-title">
        <h3 id="local-data-title">Local data</h3>
        <p>Only display preferences, one First Light resume position, saved stage IDs, private notes, and personal checkpoints are stored.</p>
        <div className="panel-actions">
          <button type="button" onClick={() => {
            downloadText('paldawn-local-data.json', exportLocalData(), 'application/json')
            reportStatus('Local data downloaded.')
          }}>Download local data</button>
          {confirmReset ? (
            <button className="danger-action" type="button" onClick={() => {
              const outcome = resetLocalData()
              if (!outcome.ok) {
                if (outcome.recoveryPending) {
                  setPendingLocalDataRecovery(outcome.recoveryPending.kind)
                  setStatus('')
                  return
                }
                setConfirmReset(false)
                setStatus('PalDawn could not verify that every local record was cleared. This page was kept open; restore browser storage, then retry or use Study to copy memory-only notes.')
                return
              }
              const resetUrl = new URL(window.location.href)
              resetUrl.hash = ''
              window.history.replaceState(null, '', resetUrl)
              window.location.reload()
            }}>Confirm reset</button>
          ) : (
            <button type="button" onClick={() => setConfirmReset(true)}>Reset local data</button>
          )}
          {confirmReset ? <button type="button" onClick={() => setConfirmReset(false)}>Cancel</button> : null}
        </div>
        <div className="local-import">
          <label className="file-action" htmlFor="local-data-import">
            Check a local-data backup
            <input
              id="local-data-import"
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (!file) return
                void file.text().then((text) => {
                  const result = parseLocalDataImport(text)
                  if (!result.ok) {
                    setPendingImport(null)
                    reportStatus(result.error)
                    return
                  }
                  setPendingImport(result)
                  reportStatus('Backup validated. Review the preview before replacing local data.')
                }).catch(() => {
                  setPendingImport(null)
                  reportStatus('That backup could not be read.')
                })
              }}
            />
          </label>
          {pendingImport ? (
            <section className="import-preview" aria-labelledby="import-preview-title">
              <h4 id="import-preview-title">Replacement preview</h4>
              <p>
                {pendingImport.preview.progressPercent}% route progress · {pendingImport.preview.bookmarkCount} saved stages ·{' '}
                {pendingImport.preview.noteCount} private notes · {pendingImport.preview.checkpointCount} personal checkpoints ·{' '}
                {pendingImport.preview.hasSettings ? 'preferences included' : 'no preferences'}
              </p>
              <div className="panel-actions">
                <button className="danger-action" type="button" onClick={() => {
                  const outcome = replaceLocalDataFromImport(pendingImport.data)
                  if (!outcome.ok) {
                    if (outcome.recoveryPending) {
                      setPendingLocalDataRecovery(outcome.recoveryPending.kind)
                      reportStatus('')
                      return
                    }
                    reportStatus('PalDawn could not verify the local-data replacement. This page was kept open; restore browser storage before retrying.')
                    return
                  }
                  const importUrl = new URL(window.location.href)
                  importUrl.hash = ''
                  window.history.replaceState(null, '', importUrl)
                  window.location.reload()
                }}>Confirm replace local data</button>
                <button type="button" onClick={() => {
                  setPendingImport(null)
                  reportStatus('Backup import cancelled. Nothing changed.')
                }}>Cancel import</button>
              </div>
            </section>
          ) : null}
        </div>
      </section>
      <section className="settings-subsection" aria-labelledby="restart-title">
        <h3 id="restart-title">Voyage recovery</h3>
        <p>Return to the introduction while keeping display preferences and saved stages.</p>
        <div className="panel-actions">
          {confirmRestart ? (
            <button type="button" onClick={() => {
              const restartUrl = new URL(window.location.href)
              restartUrl.hash = ''
              window.history.replaceState(null, '', restartUrl)
              useAtlas.getState().close({ navigateHistory: false, restoreFocus: false })
              restart()
              window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
                document.getElementById('intro-title')?.focus({ preventScroll: true })
              }))
            }}>Confirm restart voyage</button>
          ) : (
            <button type="button" onClick={() => setConfirmRestart(true)}>Restart voyage</button>
          )}
          {confirmRestart ? <button type="button" onClick={() => setConfirmRestart(false)}>Cancel restart</button> : null}
        </div>
      </section>
      </fieldset>
    </>
  )
}

function Drawer({
  textVoyage,
  onTextVoyageChange,
  bookmarks,
  onToggleBookmark,
  workspace,
  workspacePersisted,
  onUpdateWorkspace,
  onRetryWorkspacePersistence,
}: {
  textVoyage: boolean
  onTextVoyageChange: (enabled: boolean) => void
  bookmarks: string[]
  onToggleBookmark: (id: string) => boolean
  workspace: LearnerWorkspace
  workspacePersisted: boolean
  onUpdateWorkspace: (update: (current: LearnerWorkspace) => LearnerWorkspace) => void
  onRetryWorkspacePersistence: () => boolean
}) {
  const openPanel = useExperience((state) => state.openPanel)
  const setOpenPanel = useExperience((state) => state.setOpenPanel)
  const reducedMotion = useSettings((state) => state.reducedMotion)
  const drawerRef = useRef<HTMLElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const [settingsStatus, setSettingsStatus] = useState('')
  const [fullWidth, setFullWidth] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(FULL_WIDTH_DRAWER_QUERY).matches)

  useEffect(() => {
    if (openPanel !== 'settings') setSettingsStatus('')
  }, [openPanel])

  useEffect(() => {
    const media = window.matchMedia(FULL_WIDTH_DRAWER_QUERY)
    const sync = () => setFullWidth(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const onStorageFailure = (event: Event) => {
      const detail = (event as CustomEvent<StorageFailureDetail>).detail
      if (openPanel === 'settings' && detail?.key === PALDAWN_SETTINGS_KEY) {
        setSettingsStatus('This preference changed for this tab, but browser storage is unavailable. Reload may lose it.')
      }
    }
    const onStorageSuccess = (event: Event) => {
      const detail = (event as CustomEvent<StorageFailureDetail>).detail
      if (openPanel === 'settings' && detail?.key === PALDAWN_SETTINGS_KEY) {
        setSettingsStatus('Preference saved in this browser.')
      }
    }
    window.addEventListener(PALDAWN_STORAGE_FAILURE_EVENT, onStorageFailure)
    window.addEventListener(PALDAWN_STORAGE_SUCCESS_EVENT, onStorageSuccess)
    return () => {
      window.removeEventListener(PALDAWN_STORAGE_FAILURE_EVENT, onStorageFailure)
      window.removeEventListener(PALDAWN_STORAGE_SUCCESS_EVENT, onStorageSuccess)
    }
  }, [openPanel])

  useLayoutEffect(() => {
    if (!openPanel) return
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusTarget = openPanel === 'transcript'
      ? drawerRef.current?.querySelector<HTMLElement>('#transcript-search')
      : drawerRef.current
    focusTarget?.focus()
    return () => {
      window.requestAnimationFrame(() => {
        if (useExperience.getState().openPanel !== null) return
        const panelTrigger = document.querySelector<HTMLElement>(`[data-panel="${openPanel}"]`)
        const visiblePanelTrigger = [...document.querySelectorAll<HTMLElement>('[data-panel]')]
          .find(visibleFocusTarget) ?? null
        const target = [previousFocus.current, panelTrigger, visiblePanelTrigger].find(visibleFocusTarget)
        target?.focus()
      })
    }
  }, [openPanel])

  useLayoutEffect(() => {
    const drawer = drawerRef.current
    const shell = drawer?.closest('.flight-ui')
    if (!openPanel || !fullWidth || !drawer || !shell) return
    const priorInert = new Map<HTMLElement, boolean>()
    const makeBackgroundInert = () => {
      for (const element of shell.children) {
        if (!(element instanceof HTMLElement) || element === drawer) continue
        if (!priorInert.has(element)) priorInert.set(element, element.inert)
        element.inert = true
      }
    }
    makeBackgroundInert()
    const observer = new MutationObserver(makeBackgroundInert)
    observer.observe(shell, { childList: true })
    return () => {
      observer.disconnect()
      priorInert.forEach((inert, element) => { element.inert = inert })
    }
  }, [fullWidth, openPanel])

  const trapFocus = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!fullWidth || event.key !== 'Tab' || !drawerRef.current) return
    const focusable = drawerFocusables(drawerRef.current)
    if (focusable.length === 0) {
      event.preventDefault()
      drawerRef.current.focus()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && (document.activeElement === first || document.activeElement === drawerRef.current)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!openPanel) return null

  return (
    <aside
      ref={drawerRef}
      className="drawer"
      role="dialog"
      aria-modal={fullWidth ? 'true' : 'false'}
      aria-labelledby="panel-title"
      data-full-width={fullWidth}
      tabIndex={-1}
      onKeyDown={trapFocus}
    >
      <div className="drawer-header">
        <div className="drawer-header-bar">
          <span className="drawer-header-label" aria-hidden="true">{PANEL_LABELS[openPanel]}</span>
          <button className="drawer-close" type="button" aria-label="Close panel" onClick={() => {
            setSettingsStatus('')
            setOpenPanel(null, { resumePlayback: !reducedMotion })
          }}>×</button>
        </div>
        {openPanel === 'settings' ? (
          <p className="action-status settings-status" aria-live="polite" aria-atomic="true">{settingsStatus}</p>
        ) : null}
      </div>
      <div className="drawer-scroll">
        {openPanel === 'mission' && <MissionPanel />}
        {openPanel === 'transcript' && <TranscriptPanel bookmarks={bookmarks} onToggleBookmark={onToggleBookmark} />}
        {openPanel === 'workspace' && (
          <WorkspacePanel
            workspace={workspace}
            workspacePersisted={workspacePersisted}
            onUpdateWorkspace={onUpdateWorkspace}
            onRetryPersistence={onRetryWorkspacePersistence}
          />
        )}
        {openPanel === 'settings' && (
          <SettingsPanel
            textVoyage={textVoyage}
            onTextVoyageChange={onTextVoyageChange}
            workspace={workspace}
            setStatus={setSettingsStatus}
          />
        )}
        {openPanel === 'help' && <HelpPanel />}
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

function CompletionSummary() {
  const narrationMode = useExperience((state) => state.narrationMode)
  const replay = useExperience((state) => state.replay)
  const setOpenPanel = useExperience((state) => state.setOpenPanel)
  const reducedMotion = useSettings((state) => state.reducedMotion)
  const [status, setStatus] = useState('')
  const summaryRef = useRef<HTMLElement>(null)

  useEffect(() => {
    summaryRef.current?.focus()
  }, [])

  return (
    <section
      ref={summaryRef}
      className="completion-summary"
      id="completion-summary"
      aria-labelledby="completion-title"
      tabIndex={-1}
    >
      <p className="eyebrow">Route complete · five synthetic stages</p>
      <h2 id="completion-title">First light reached.</h2>
      <p>You completed the {narrationMode} track. Anatomy and clinical teaching remain locked behind separate evidence and review.</p>
      <div className="completion-actions">
        <button type="button" onClick={() => replay(reducedMotion)}>Replay voyage</button>
        <button type="button" onClick={() => setOpenPanel('transcript')}>Open transcript</button>
        <button type="button" onClick={() => {
          replaceStageHash('arrival')
          void copyText(stageUrl('arrival')).then((copied) => setStatus(copied ? 'Arrival link copied.' : 'Copy unavailable.'))
        }}>Copy arrival link</button>
        <button type="button" onClick={() => {
          replaceStageHash('arrival')
          void shareOrCopy({
            title: 'PalDawn First Light — route complete',
            text: `First Light complete on PalDawn’s ${narrationMode} track. Synthetic systems model; not anatomy.`,
            url: stageUrl('arrival'),
          }).then((outcome) => setStatus(shareStatus(outcome, 'Arrival')))
        }}>Share arrival</button>
      </div>
      <p className="action-status" aria-live="polite">{status}</p>
    </section>
  )
}

export function FlightDeck({
  textVoyage,
  onTextVoyageChange,
}: {
  textVoyage: boolean
  onTextVoyageChange: (enabled: boolean) => void
}) {
  const entered = useExperience((state) => state.entered)
  const progress = useExperience((state) => state.progress)
  const playing = useExperience((state) => state.playing)
  const openPanel = useExperience((state) => state.openPanel)
  const setOpenPanel = useExperience((state) => state.setOpenPanel)
  const atlasOpen = useAtlas((state) => state.open)
  const openDisease = useAtlas((state) => state.openDisease)
  const closeAtlas = useAtlas((state) => state.close)
  const guideOpen = useAtlas((state) => state.guideOpen)
  const researchOpen = useAtlas((state) => state.researchOpen)
  const setGuideOpen = useAtlas((state) => state.setGuideOpen)
  const setResearchOpen = useAtlas((state) => state.setResearchOpen)
  const reducedMotion = useSettings((state) => state.reducedMotion)
  const comfortVignette = useSettings((state) => state.comfortVignette)
  const highContrast = useSettings((state) => state.highContrast)
  const captionScale = useSettings((state) => state.captionScale)
  const [updateReady, setUpdateReady] = useState(false)
  const [updateBlocked, setUpdateBlocked] = useState<PwaUpdateBlockedDetail | null>(null)
  const [updatePreparing, setUpdatePreparing] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [visibilityPaused, setVisibilityPaused] = useState(false)
  const [systemNoticesOpen, setSystemNoticesOpen] = useState(false)
  const [bookmarks, setBookmarks] = useState(() => orderedBookmarks(loadStageBookmarks()))
  const [workspace, setWorkspace] = useState(loadLearnerWorkspace)
  const [workspacePersisted, setWorkspacePersisted] = useState(true)
  const [failedStorageKeys, setFailedStorageKeys] = useState<string[]>([])
  const [bookmarkStatus, setBookmarkStatus] = useState('')
  const flightUiRef = useRef<HTMLDivElement>(null)
  const safetyLineRef = useRef<HTMLParagraphElement>(null)
  const bookmarksRef = useRef(bookmarks)
  const workspaceRef = useRef(workspace)
  const pausedForVisibility = useRef(false)
  const systemNoticeLabels = [
    !online ? 'Offline mode' : null,
    offlineReady ? 'Offline ready' : null,
    updateBlocked ? 'Update paused' : updateReady ? 'Update ready' : null,
    visibilityPaused ? 'Voyage paused' : null,
    failedStorageKeys.length ? 'Local storage unavailable' : null,
  ].filter((label): label is string => label !== null)
  const systemNoticeCount = systemNoticeLabels.length
  const systemNoticeSummary = systemNoticeCount > 1
    ? `${systemNoticeCount} notices`
    : systemNoticeLabels[0] ?? ''

  const toggleStageBookmark = useCallback((id: string) => {
    if (!STAGE_IDS.has(id)) return false
    const current = bookmarksRef.current
    const wasSaved = current.includes(id)
    const next = orderedBookmarks(wasSaved ? current.filter((candidate) => candidate !== id) : [...current, id])
    bookmarksRef.current = next
    setBookmarks(next)
    const persisted = saveStageBookmarks(next)
    setBookmarkStatus(persisted
      ? wasSaved ? 'Stage removed from saved stages.' : 'Stage saved on this device.'
      : 'Stage changed for this tab, but browser storage is unavailable. Reload may lose it.')
    return persisted
  }, [])

  const updateWorkspace = useCallback((update: (current: LearnerWorkspace) => LearnerWorkspace) => {
    const next = update(workspaceRef.current)
    workspaceRef.current = next
    setWorkspace(next)
    setWorkspacePersisted(saveLearnerWorkspace(next))
  }, [])

  const retryWorkspacePersistence = useCallback(() => {
    const persisted = saveLearnerWorkspace(workspaceRef.current)
    setWorkspacePersisted(persisted)
    return persisted
  }, [])

  const preparePwaUpdate = useCallback(() => {
    const experience = useExperience.getState()
    if (experience.playing) experience.pause()
    const settings = useSettings.getState()
    const journeySaved = !experience.entered || saveJourneySession({
      progress: experience.progress,
      narrationMode: experience.narrationMode,
    })
    const bookmarksSaved = saveStageBookmarks(bookmarksRef.current)
    const workspaceSaved = saveLearnerWorkspace(workspaceRef.current)
    const settingsSaved = writeLocalStorageValue(PALDAWN_SETTINGS_KEY, JSON.stringify({
      state: {
        qualityTier: settings.qualityTier,
        reducedMotion: settings.reducedMotion,
        comfortVignette: settings.comfortVignette,
        highContrast: settings.highContrast,
        showTelemetry: settings.showTelemetry,
        captionScale: settings.captionScale,
        playbackRate: settings.playbackRate,
        textVoyagePreferred: settings.textVoyagePreferred,
      },
      version: 1,
    }))
    setWorkspacePersisted(workspaceSaved)
    return journeySaved && bookmarksSaved && workspaceSaved && settingsSaved
  }, [])

  const openWorkspace = useCallback((focusNote: boolean) => {
    setOpenPanel('workspace')
    if (focusNote) window.setTimeout(() => document.getElementById('workspace-note')?.focus(), 0)
  }, [setOpenPanel])

  useEffect(() => {
    document.documentElement.dataset.contrast = highContrast ? 'high' : 'standard'
  }, [highContrast])

  useEffect(() => {
    document.documentElement.dataset.captionSize = captionScale
  }, [captionScale])

  useEffect(() => {
    const onStorageFailure = (event: Event) => {
      const { key } = (event as CustomEvent<StorageFailureDetail>).detail
      setFailedStorageKeys((current) => current.includes(key) ? current : [...current, key])
    }
    const onStorageSuccess = (event: Event) => {
      const { key } = (event as CustomEvent<StorageFailureDetail>).detail
      setFailedStorageKeys((current) => current.includes(key) ? current.filter((candidate) => candidate !== key) : current)
    }
    window.addEventListener(PALDAWN_STORAGE_FAILURE_EVENT, onStorageFailure)
    window.addEventListener(PALDAWN_STORAGE_SUCCESS_EVENT, onStorageSuccess)
    return () => {
      window.removeEventListener(PALDAWN_STORAGE_FAILURE_EVENT, onStorageFailure)
      window.removeEventListener(PALDAWN_STORAGE_SUCCESS_EVENT, onStorageSuccess)
    }
  }, [])

  useEffect(() => registerPwaUpdatePreparation(preparePwaUpdate), [preparePwaUpdate])

  useLayoutEffect(() => {
    const shell = flightUiRef.current
    const safetyLine = safetyLineRef.current
    if (!shell || !safetyLine) return
    const updateReserve = () => {
      const shellBounds = shell.getBoundingClientRect()
      const safetyBounds = safetyLine.getBoundingClientRect()
      shell.style.setProperty('--safety-line-reserve', `${Math.ceil(shellBounds.bottom - safetyBounds.top)}px`)
    }
    updateReserve()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateReserve)
    observer?.observe(safetyLine)
    window.addEventListener('resize', updateReserve)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateReserve)
    }
  }, [])

  useEffect(() => {
    if (reducedMotion) useExperience.getState().pause()
  }, [reducedMotion])

  useEffect(() => {
    const followAtlasHistory = (event?: PopStateEvent) => {
      syncAtlasFromHistory(event ? event.state : window.history.state)
    }
    followAtlasHistory()
    window.addEventListener('popstate', followAtlasHistory)
    return () => window.removeEventListener('popstate', followAtlasHistory)
  }, [])

  useEffect(() => {
    const followHash = () => {
      const id = stageIdFromHash(window.location.hash)
      if (!id) return
      const next = progressForStageId(id)
      if (next !== null) useExperience.getState().setProgress(next)
    }
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (navigation?.type !== 'reload') followHash()
    window.addEventListener('hashchange', followHash)
    return () => window.removeEventListener('hashchange', followHash)
  }, [])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === PALDAWN_BOOKMARKS_KEY) {
        const next = orderedBookmarks(loadStageBookmarks())
        bookmarksRef.current = next
        setBookmarks(next)
        return
      }
      if (event.key === PALDAWN_WORKSPACE_KEY) {
        const next = loadLearnerWorkspace()
        workspaceRef.current = next
        setWorkspace(next)
        setWorkspacePersisted(true)
        return
      }
      if (event.key !== PALDAWN_RESET_KEY || event.newValue === null) return
      const resetUrl = new URL(window.location.href)
      resetUrl.hash = ''
      window.history.replaceState(null, '', resetUrl)
      window.location.reload()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const currentStageId = stageAt(progress).id
  useEffect(() => {
    if (!entered || stageIdFromHash(window.location.hash) === currentStageId) return
    replaceStageHash(currentStageId)
  }, [currentStageId, entered])

  useEffect(() => {
    const flush = () => {
      const state = useExperience.getState()
      if (!state.entered) return
      saveJourneySession({ progress: state.progress, narrationMode: state.narrationMode })
    }
    const timer = window.setInterval(flush, 3000)
    window.addEventListener('pagehide', flush)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [])

  useEffect(() => {
    const onVisibilityChange = () => {
      const state = useExperience.getState()
      if (document.hidden) {
        pausedForVisibility.current = state.playing
        if (state.playing) state.pause()
        return
      }
      if (pausedForVisibility.current) {
        pausedForVisibility.current = false
        setVisibilityPaused(true)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  useEffect(() => {
    if (!playing) return
    pausedForVisibility.current = false
    setVisibilityPaused(false)
  }, [playing])

  useLayoutEffect(() => {
    const onUpdate = () => {
      setUpdateReady(true)
      setUpdateBlocked(null)
      setUpdatePreparing(false)
    }
    const onUpdatePreparing = () => {
      setUpdateBlocked(null)
      setUpdatePreparing(true)
    }
    const onUpdateBlocked = (event: Event) => {
      setUpdateReady(true)
      setUpdateBlocked((event as CustomEvent<PwaUpdateBlockedDetail>).detail)
      setUpdatePreparing(false)
      setSystemNoticesOpen(true)
      window.setTimeout(() => document.getElementById('pwa-update-action')?.focus(), 0)
    }
    const onOfflineReady = () => setOfflineReady(true)
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('paldawn:update-ready', onUpdate)
    window.addEventListener('paldawn:update-preparing', onUpdatePreparing)
    window.addEventListener('paldawn:update-blocked', onUpdateBlocked)
    window.addEventListener('paldawn:offline-ready', onOfflineReady)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('paldawn:update-ready', onUpdate)
      window.removeEventListener('paldawn:update-preparing', onUpdatePreparing)
      window.removeEventListener('paldawn:update-blocked', onUpdateBlocked)
      window.removeEventListener('paldawn:offline-ready', onOfflineReady)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    if (systemNoticeCount === 0) setSystemNoticesOpen(false)
  }, [systemNoticeCount])

  useLayoutEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (openPanel) setOpenPanel(null, { resumePlayback: !reducedMotion })
        else if (researchOpen) setResearchOpen(false)
        else if (guideOpen) setGuideOpen(false)
        else if (atlasOpen) closeAtlas()
        else setSystemNoticesOpen(false)
        return
      }
      const isTextEntry = event.target instanceof HTMLElement &&
        (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName) || event.target.isContentEditable)
      if (!isTextEntry && (event.key === '?' || (event.code === 'Slash' && event.shiftKey))) {
        event.preventDefault()
        setOpenPanel('help')
        return
      }
      if (!isTextEntry && event.key.toLowerCase() === 't') {
        setOpenPanel('transcript')
        return
      }
      if (!isTextEntry && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        openWorkspace(true)
        return
      }
      if (atlasOpen && !isTextEntry && event.code === 'Slash' && !event.shiftKey) return
      if (!isTextEntry && event.code === 'Slash' && !event.shiftKey) {
        event.preventDefault()
        setOpenPanel('transcript')
        return
      }
      if (isTypingTarget(event.target)) return
      const state = useExperience.getState()
      if (!state.entered || state.progress >= 1) return
      if (event.key.toLowerCase() === 'b') {
        toggleStageBookmark(stageAt(state.progress).id)
      } else if (event.code === 'Space') {
        event.preventDefault()
        state.togglePlayback(reducedMotion)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        if (event.shiftKey || reducedMotion) {
          const target = Math.min(JOURNEY.stages.length - 1, stageIndexAt(state.progress) + 1)
          replaceStageHash(JOURNEY.stages[target].id)
          state.moveStage(1)
        } else {
          const next = Math.min(1, state.progress + 0.02)
          replaceStageHash(stageAt(next).id)
          state.setProgress(next)
        }
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        if (event.shiftKey || reducedMotion) {
          const target = Math.max(0, stageIndexAt(state.progress) - 1)
          replaceStageHash(JOURNEY.stages[target].id)
          state.moveStage(-1)
        } else {
          const next = Math.max(0, state.progress - 0.02)
          replaceStageHash(stageAt(next).id)
          state.setProgress(next)
        }
      } else if (event.key === 'Home') {
        replaceStageHash(JOURNEY.stages[0].id)
        useExperience.getState().setProgress(0)
      } else if (event.key === 'End') {
        replaceStageHash(JOURNEY.stages[JOURNEY.stages.length - 1].id)
        useExperience.getState().setProgress(1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [atlasOpen, closeAtlas, guideOpen, openPanel, openWorkspace, reducedMotion, researchOpen, setGuideOpen, setOpenPanel, setResearchOpen, toggleStageBookmark])

  const portalVeil = reducedMotion
    ? 0
    : smoothRange(progress, PORTAL_START, PORTAL_CENTER) *
      (1 - smoothRange(progress, PORTAL_CENTER, PORTAL_END))
  const completed = entered && progress >= 1
  const skipTargetId = atlasOpen ? 'atlas-title' : !entered ? 'intro-title' : completed ? 'completion-summary' : 'flight-controls'
  const skipTargetLabel = atlasOpen ? 'disease explorer' : !entered ? 'introduction' : completed ? 'completion summary' : 'voyage controls'

  return (
    <div
      ref={flightUiRef}
      className="flight-ui"
      data-entered={entered}
      data-text-voyage={textVoyage}
      data-atlas={atlasOpen}
      data-reduced-motion={reducedMotion}
      data-system-notices={systemNoticeCount > 0}
    >
      <a
        className="skip-link"
        href={`#${skipTargetId}`}
        onClick={(event) => {
          const target = document.getElementById(skipTargetId)
          if (!target) return
          event.preventDefault()
          const skipUrl = new URL(window.location.href)
          skipUrl.hash = skipTargetId
          window.history.replaceState(window.history.state, '', skipUrl)
          target.focus()
        }}
      >
        Skip to {skipTargetLabel}
      </a>
      <header className="masthead">
        <a className="wordmark" href="./" aria-label="PalDawn home">
          <img
            className="brand-icon"
            src={`${import.meta.env.BASE_URL}${reducedMotion ? 'icon-static.svg' : 'icon.svg'}`}
            alt=""
            aria-hidden="true"
          />
          <span className="wordmark-name">PalDawn</span>
        </a>
        <p className="build-mark">PAL · DAWN / MECHANISM LENS</p>
        <nav className="utility-nav" aria-label="Release information">
          <button className="text-button" type="button" data-atlas-opener="utility-atlas" aria-expanded={atlasOpen} onClick={() => {
            setOpenPanel(null, { resumePlayback: false })
            openDisease('diabetes', '[data-atlas-opener="utility-atlas"]')
          }}>Atlas</button>
          <PanelButton panel="transcript">Transcript</PanelButton>
          <PanelButton panel="workspace">Study</PanelButton>
          <PanelButton panel="settings">Settings</PanelButton>
          <PanelButton panel="help">Help</PanelButton>
        </nav>
      </header>
      <div className="system-banners" data-expanded={systemNoticesOpen} aria-live="polite">
        {systemNoticeCount > 0 ? (
          <button
            className="system-notice-summary"
            type="button"
            aria-controls="system-notice-list"
            aria-expanded={systemNoticesOpen}
            aria-label={`${systemNoticeLabels.join(', ')}. ${systemNoticesOpen ? 'Hide' : 'Show'} system notice details.`}
            onClick={() => setSystemNoticesOpen((open) => !open)}
          >
            <span className="system-notice-signal" aria-hidden="true" />
            <span className="system-notice-count" aria-hidden="true">{systemNoticeCount}</span>
            <span className="system-notice-label">{systemNoticeSummary}</span>
          </button>
        ) : null}
        <div className="system-notice-list" id="system-notice-list">
          {!online ? <p className="system-banner">Offline mode · cached voyage controls remain available.</p> : null}
          {offlineReady ? (
            <p className="system-banner system-banner-offline-ready">Offline voyage ready.<button type="button" onClick={() => setOfflineReady(false)}>Dismiss</button></p>
          ) : null}
          {updateReady ? (
            <p
              className="system-banner system-banner-update-ready"
              role={updateBlocked ? 'alert' : undefined}
              aria-busy={updatePreparing}
            >
              {updatePreparing
                ? 'Saving local changes in every open PalDawn tab before updating…'
                : updateBlocked
                ? updateBlocked.reason === 'activation-timeout'
                  ? 'Update did not finish, so PalDawn did not reload this tab. Your local work remains open; retry when every PalDawn tab is ready.'
                  : updateBlocked.reason === 'changed'
                    ? 'Update paused because the set of open PalDawn tabs changed while saving. Keep the tabs you need open, then retry.'
                    : 'Update paused because an open PalDawn tab could not verify that its local work was saved. Keep that tab open, restore browser storage or copy its private work, close older tabs, then retry.'
                : 'A new local build is ready.'}
              <button id="pwa-update-action" type="button" disabled={updatePreparing} onClick={activatePwaUpdate}>{updateBlocked ? 'Retry update and reload' : 'Update and reload open tabs'}</button>
            </p>
          ) : null}
          {visibilityPaused ? (
            <p className="system-banner">Voyage paused while this page was in the background.<button type="button" onClick={() => {
              setVisibilityPaused(false)
              pausedForVisibility.current = false
              const state = useExperience.getState()
              if (!state.playing && state.progress < 1 && !reducedMotion) state.togglePlayback(false)
            }}>Resume</button></p>
          ) : null}
          {failedStorageKeys.length ? (
            <p className="system-banner system-banner-storage">
              Local changes are not being saved. Keep this page open. Use Study to copy or download private notes; saved-stage changes and preferences remain only in this tab until storage recovers.
            </p>
          ) : null}
        </div>
      </div>
      <div className="canvas-label" aria-hidden="true">
        <span>{textVoyage ? 'TEXT VOYAGE' : atlasOpen || !entered ? '3D SYSTEMS MAP' : 'SYNTHETIC MODEL'}</span>
        <span>{textVoyage ? 'SCENE-FREE ROUTE' : atlasOpen || !entered ? 'CONCEPTUAL / NOT TO SCALE' : 'NO ANATOMICAL SCALE'}</span>
      </div>
      {atlasOpen ? <DiseaseExplorer rendererAvailable={!textVoyage} /> : null}
      {!atlasOpen && !entered ? <><Intro /><TopDiseasesRail /></> : null}
      {!atlasOpen && completed ? (
        <CompletionSummary />
      ) : !atlasOpen && entered ? (
        <>
          <PhaseRail />
          <CompanionCaption bookmarks={bookmarks} onToggleBookmark={toggleStageBookmark} onOpenWorkspace={openWorkspace} />
          <ControlDeck />
          <Telemetry />
        </>
      ) : null}
      <Drawer
        textVoyage={textVoyage}
        onTextVoyageChange={onTextVoyageChange}
        bookmarks={bookmarks}
        onToggleBookmark={toggleStageBookmark}
        workspace={workspace}
        workspacePersisted={workspacePersisted}
        onUpdateWorkspace={updateWorkspace}
        onRetryWorkspacePersistence={retryWorkspacePersistence}
      />
      {entered && !textVoyage && !atlasOpen ? <div className="portal-veil" aria-hidden="true" style={{ opacity: portalVeil * 0.5 }} /> : null}
      {entered && comfortVignette && !textVoyage && !atlasOpen ? <div className="comfort-vignette" aria-hidden="true" /> : null}
      <p ref={safetyLineRef} className="safety-line">
        Education only · never diagnosis. Source-backed disease content is an
        unreviewed preview; urgent symptoms need real medical care.
      </p>
      <p className="sr-only" aria-live="polite">
        {atlasOpen ? 'Disease systems explorer open.' : entered ? `${stageAt(progress).label}. ${stageAt(progress).guide}` : 'PalDawn disease systems introduction.'}
      </p>
      <p className="sr-only" aria-live="polite">{bookmarkStatus}</p>
    </div>
  )
}
