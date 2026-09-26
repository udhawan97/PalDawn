import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { ATLAS_EVIDENCE_STATUS, buildAtlasEvidenceLedger } from '../data/atlasEvidence'
import { searchAtlas, type AtlasSearchResult } from '../data/atlasSearch'
import { BODY_PART_LABELS, DISEASES, diseaseById, type BodyPartId, type DiseaseDefinition } from '../data/diseases'
import { useAtlas } from '../state/atlas'
import { useExperience } from '../state/experience'
import { useAtlasStudy } from '../state/atlasStudy'
import { atlasStepUrl } from '../journey/atlasRoute'
import { atlasStudyRecordId, MAX_STAGE_NOTE_LENGTH } from '../platform/localData'
import { downloadText } from '../platform/downloads'
import { shareOrCopy } from '../platform/share'
import { atlasStudyMarkdown } from '../platform/study'
import { CurriculumCatalog } from './CurriculumCatalog'

export function TopDiseasesRail() {
  const [catalogOpen, setCatalogOpen] = useState(false)
  const catalogButtonRef = useRef<HTMLButtonElement>(null)
  const openDisease = useAtlas((state) => state.openDisease)
  const lastPosition = useAtlasStudy((state) => state.lastPosition)
  const studyRecords = useAtlasStudy((state) => state.records)
  const knownRecordIds = new Set(DISEASES.flatMap((disease) => disease.steps.map((step) => atlasStudyRecordId(disease.id, step.id))))
  const savedSteps = DISEASES.flatMap((disease) => disease.steps.flatMap((step, stepIndex) =>
    studyRecords[atlasStudyRecordId(disease.id, step.id)]?.saved ? [{ disease, step, stepIndex }] : []))
  const unavailableRecords = Object.entries(studyRecords).filter(([id, record]) =>
    !knownRecordIds.has(id) && (record.saved || record.studied || Boolean(record.note.trim())))

  return (
    <>
      <aside className="top-diseases" aria-labelledby="top-diseases-title">
        <div className="top-diseases-heading">
          <div>
            <p className="eyebrow">WHO global rank · 2021</p>
            <h2 id="top-diseases-title">Ten starting journeys</h2>
          </div>
          <button
            ref={catalogButtonRef}
            type="button"
            className="curriculum-launch"
            aria-haspopup="dialog"
            aria-expanded={catalogOpen}
            onClick={() => setCatalogOpen(true)}
          >View 50</button>
        </div>
        <ol>
          {DISEASES.map((disease) => (
            <li key={disease.id}>
              <button
                type="button"
                data-atlas-opener={`rank-${disease.id}`}
                onClick={() => openDisease(disease.id, `[data-atlas-opener="rank-${disease.id}"]`)}
              >
                <span>{String(disease.rank).padStart(2, '0')}</span>
                <strong>{disease.shortTitle}</strong>
                <i aria-hidden="true" style={{ background: disease.accent }} />
              </button>
            </li>
          ))}
        </ol>
        <p>
          Ranked causes of death, not personal risk. Each route is an educational preview.
        </p>
        {lastPosition ? <button className="atlas-resume" type="button" onClick={() => {
          const disease = DISEASES.find((candidate) => candidate.id === lastPosition.diseaseId)
          const stepIndex = disease?.steps.findIndex((step) => step.id === lastPosition.stepId) ?? -1
          if (!disease || stepIndex < 0) return
          openDisease(disease.id)
          useAtlas.getState().setTarget(disease.id, stepIndex)
        }}>Continue your Atlas study →</button> : null}
        {savedSteps.length ? <details className="atlas-saved-index">
          <summary>Your saved Atlas steps ({savedSteps.length})</summary>
          <ol>{savedSteps.map(({ disease, step, stepIndex }) => <li key={`${disease.id}:${step.id}`}><button type="button" onClick={() => {
            openDisease(disease.id)
            useAtlas.getState().setTarget(disease.id, stepIndex)
          }}><strong>{step.label}</strong><span>{disease.shortTitle}</span></button></li>)}</ol>
        </details> : null}
        {unavailableRecords.length ? <details className="atlas-saved-index">
          <summary>Unavailable saved records ({unavailableRecords.length})</summary>
          <ol>{unavailableRecords.map(([id]) => <li key={id}><div className="atlas-unavailable-record"><strong>Unavailable Atlas step</strong><span>{id}</span></div></li>)}</ol>
        </details> : null}
      </aside>
      {catalogOpen ? <CurriculumCatalog onClose={() => setCatalogOpen(false)} returnFocusTo={catalogButtonRef} /> : null}
    </>
  )
}

function AtlasReadingView({
  disease,
  activeStepIndex,
  includeNotes,
  onIncludeNotes,
  onClose,
  onSelectStep,
}: {
  disease: DiseaseDefinition
  activeStepIndex: number
  includeNotes: boolean
  onIncludeNotes: (include: boolean) => void
  onClose: () => void
  onSelectStep: (index: number) => void
}) {
  const study = useAtlasStudy()
  const closeRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return <section className="atlas-reading-view" role="dialog" aria-modal="true" aria-labelledby="atlas-reading-title">
    <header>
      <div><p className="eyebrow">Focused reading · existing authored content</p><h2 id="atlas-reading-title">{disease.title}</h2></div>
      <button ref={closeRef} type="button" aria-label="Close focused reading" onClick={onClose}>×</button>
    </header>
    <div className="atlas-reading-actions">
      <label><input type="checkbox" checked={includeNotes} onChange={(event) => onIncludeNotes(event.target.checked)} /> Show private notes and include in export</label>
      <button type="button" onClick={() => {
        downloadText('paldawn-atlas-study.md', atlasStudyMarkdown(study, { includeNotes, diseaseId: disease.id }), 'text/markdown;charset=utf-8')
      }}>Download selected study</button>
      <button type="button" onClick={() => window.print()}>Print study sheet</button>
    </div>
    <p className="atlas-reading-boundary">Plain English and Clinical terms are shown together for comparison. Educational synthesis; qualified medical review is pending.</p>
    <ol className="atlas-reading-steps">
      {disease.steps.map((step, index) => {
        const record = study.records[atlasStudyRecordId(disease.id, step.id)]
        return <li key={step.id} data-current={index === activeStepIndex}>
          <div className="atlas-reading-step-heading">
            <span>{String(index + 1).padStart(2, '0')} · {step.phase}</span>
            <button type="button" onClick={() => { onSelectStep(index); onClose() }}>Open in systems map</button>
          </div>
          <h3>{step.label}</h3>
          <div className="atlas-reading-columns">
            <article><h4>Plain English</h4><p>{step.plain}</p></article>
            <article><h4>Clinical terms</h4><p>{step.clinical}</p></article>
          </div>
          {step.caution ? <p className="atlas-caution"><b>Care boundary</b>{step.caution}</p> : null}
          <div className="atlas-sources"><span>Evidence for this step</span>{disease.sources.filter((source) => step.sourceIds.includes(source.id)).map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.organization} · {source.title} ↗</a>)}</div>
          {includeNotes && record?.note.trim() ? <aside className="atlas-exported-note"><strong>Private note</strong><p>{record.note}</p></aside> : null}
        </li>
      })}
    </ol>
  </section>
}

function ExplorerGuide({ returnFocusTo }: { returnFocusTo: RefObject<HTMLButtonElement | null> }) {
  const setGuideOpen = useAtlas((state) => state.setGuideOpen)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus({ preventScroll: true }))
    const returnTarget = returnFocusTo.current
    return () => {
      window.cancelAnimationFrame(focusFrame)
      if (!returnTarget || !document.contains(returnTarget)) return
      window.requestAnimationFrame(() => returnTarget.focus())
    }
  }, [returnFocusTo])

  return (
    <section className="atlas-guide" role="dialog" aria-modal="false" aria-labelledby="atlas-guide-title">
      <div className="atlas-guide-heading">
        <div>
          <p className="eyebrow">Seven controls · one learning loop</p>
          <h2 id="atlas-guide-title">How to use the systems map</h2>
        </div>
        <button ref={closeButtonRef} type="button" autoFocus aria-label="Close how-to guide" onClick={() => setGuideOpen(false)}>×</button>
      </div>
      <ol>
        <li><b>Search the map.</b><span>Find an existing condition, phase, or highlighted structure. Results only route through this preview’s current content.</span></li>
        <li><b>Choose a condition.</b><span>The condition index follows WHO’s 2021 global ranking; it does not estimate your risk.</span></li>
        <li><b>Advance the mechanism.</b><span>Use the numbered timeline or the Previous and Next controls. Highlighted organs change at each step.</span></li>
        <li><b>Inspect the body.</b><span>Select a highlighted structure to enter close focus. The lens reveals layered geometry and the current phase signal; choose Whole body to return.</span></li>
        <li><b>Change reading depth.</b><span>Plain English explains the idea; Clinical terms adds vocabulary without turning this into professional training.</span></li>
        <li><b>Open the evidence.</b><span>Source links go directly to WHO and NIH/NIDDK pages. The synthesis itself has not received qualified medical review.</span></li>
        <li><b>Keep the boundary.</b><span>This experience cannot diagnose symptoms, calculate personal risk, or recommend treatment. Urgent warnings direct you to real care.</span></li>
      </ol>
      <div className="atlas-guide-shortcuts">
        <span><kbd>/</kbd> search</span>
        <span><kbd>←</kbd><kbd>→</kbd> steps</span>
        <span><kbd>Esc</kbd> close</span>
      </div>
    </section>
  )
}

function AtlasSearchResults({ results }: { results: AtlasSearchResult[] }) {
  const selectedDiseaseId = useAtlas((state) => state.selectedDiseaseId)
  const stepIndex = useAtlas((state) => state.stepIndex)
  const selectedBodyPart = useAtlas((state) => state.selectedBodyPart)
  const setTarget = useAtlas((state) => state.setTarget)

  if (results.length === 0) {
    return (
      <div className="atlas-search-empty" role="status">
        <strong>No route found</strong>
        <span>Try a condition, phase, or structure already shown in this preview.</span>
      </div>
    )
  }

  return (
    <div className="atlas-search-results" role="region" aria-live="polite" aria-label="Atlas search results">
      <p>{results.length} route{results.length === 1 ? '' : 's'} found</p>
      <div>
        {results.map((result) => {
          const isCurrent = result.diseaseId === selectedDiseaseId
            && (result.kind === 'condition'
              || (result.stepIndex === stepIndex && result.bodyPartId === selectedBodyPart))
          return (
            <button
              key={result.id}
              type="button"
              data-kind={result.kind}
              aria-current={isCurrent ? 'location' : undefined}
              aria-label={`Go to ${result.title}. ${result.context}`}
              onClick={() => setTarget(result.diseaseId, result.stepIndex, result.bodyPartId)}
            >
              <span aria-hidden="true">{result.kind === 'condition' ? String(result.rank).padStart(2, '0') : '⌖'}</span>
              <span>
                <strong>{result.title}</strong>
                <small>{result.context}</small>
              </span>
              <i aria-hidden="true" style={{ background: result.accent }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SourceLinks({ sourceIds }: { sourceIds: string[] }) {
  const selectedDiseaseId = useAtlas((state) => state.selectedDiseaseId)
  const sources = diseaseById(selectedDiseaseId).sources.filter((source) => sourceIds.includes(source.id))

  return (
    <div className="atlas-sources" aria-label="Sources for this step">
      <span>Evidence for this step</span>
      {sources.map((source) => (
        <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
          {source.organization} · {source.title} <span aria-hidden="true">↗</span>
        </a>
      ))}
    </div>
  )
}

function ResearchLens({
  disease,
  currentStepIndex,
  returnFocusTo,
  onClose,
  onSelectStep,
}: {
  disease: DiseaseDefinition
  currentStepIndex: number
  returnFocusTo: RefObject<HTMLButtonElement | null>
  onClose: () => void
  onSelectStep: (stepIndex: number) => void
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const ledger = buildAtlasEvidenceLedger(disease)

  useLayoutEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus({ preventScroll: true }))
    const returnTarget = returnFocusTo.current
    return () => {
      window.cancelAnimationFrame(focusFrame)
      if (!returnTarget || !document.contains(returnTarget)) return
      window.requestAnimationFrame(() => returnTarget.focus())
    }
  }, [returnFocusTo])

  return (
    <section className="atlas-research-lens" role="dialog" aria-modal="false" aria-labelledby="atlas-research-title">
      <header className="atlas-research-heading">
        <div>
          <p className="eyebrow">Research lens · current preview</p>
          <h2 id="atlas-research-title">Evidence map</h2>
          <p>{disease.title}</p>
        </div>
        <button ref={closeButtonRef} type="button" autoFocus aria-label="Close Research lens" onClick={onClose}>×</button>
      </header>

      <div className="atlas-research-scroll">
        <dl
          className="atlas-evidence-metrics"
          aria-label="Evidence map summary"
          data-source-count={ledger.sourceCoverage.length}
          data-step-coverage={`${ledger.sourcedStepCount}/${ledger.totalStepCount}`}
        >
          <div><dt>Sources</dt><dd>{ledger.sourceCoverage.length}</dd></div>
          <div><dt>Steps linked</dt><dd>{ledger.sourcedStepCount}/{ledger.totalStepCount}</dd></div>
          <div><dt>Review</dt><dd>Pending</dd></div>
        </dl>

        <p className="atlas-evidence-boundary" role="note">
          <strong>{ATLAS_EVIDENCE_STATUS.reviewLabel}</strong>
          Sources checked {ATLAS_EVIDENCE_STATUS.sourcesCheckedLabel}. This map shows authored source links, not proof that a source validates every word or visual detail.
        </p>

        {ledger.danglingSourceIds.length > 0 ? (
          <p className="atlas-evidence-integrity" role="alert">
            Evidence map unavailable: one or more step references do not resolve to a bundled source.
          </p>
        ) : (
          <ol className="atlas-evidence-ledger">
            {ledger.sourceCoverage.map(({ source, stepIndexes }, sourceIndex) => {
              const stepSet = new Set(stepIndexes)
              return (
                <li key={source.id} className="atlas-evidence-source">
                  <div className="atlas-evidence-source-heading">
                    <span>{String(sourceIndex + 1).padStart(2, '0')} · {stepIndexes.length > 0 ? 'Step evidence' : 'Index context'}</span>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      <strong>{source.organization}</strong>
                      {source.title} <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                  <p>{stepIndexes.length > 0
                    ? `Linked to ${stepIndexes.length} of ${disease.steps.length} authored steps.`
                    : 'Supports the condition index; no mechanism step links to this source.'}</p>
                  <ol className="atlas-evidence-coverage" aria-label={`${source.title} step coverage`}>
                    {disease.steps.map((step, stepIndex) => (
                      <li key={step.id}>
                        {stepSet.has(stepIndex) ? (
                          <button
                            type="button"
                            data-current={stepIndex === currentStepIndex}
                            aria-current={stepIndex === currentStepIndex ? 'step' : undefined}
                            aria-label={`Go to step ${stepIndex + 1}: ${step.label}`}
                            title={step.label}
                            onClick={() => onSelectStep(stepIndex)}
                          >{String(stepIndex + 1).padStart(2, '0')}</button>
                        ) : <span aria-hidden="true">—</span>}
                      </li>
                    ))}
                  </ol>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}

export function DiseaseExplorer({ rendererAvailable }: { rendererAvailable: boolean }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [readingOpen, setReadingOpen] = useState(false)
  const [includeNotes, setIncludeNotes] = useState(false)
  const [studyOpen, setStudyOpen] = useState(false)
  const [actionStatus, setActionStatus] = useState('')
  const selectedDiseaseId = useAtlas((state) => state.selectedDiseaseId)
  const stepIndex = useAtlas((state) => state.stepIndex)
  const narration = useAtlas((state) => state.narration)
  const exploded = useAtlas((state) => state.exploded)
  const rotationPaused = useAtlas((state) => state.rotationPaused)
  const guideOpen = useAtlas((state) => state.guideOpen)
  const researchOpen = useAtlas((state) => state.researchOpen)
  const selectedBodyPart = useAtlas((state) => state.selectedBodyPart)
  const close = useAtlas((state) => state.close)
  const setDisease = useAtlas((state) => state.setDisease)
  const setStep = useAtlas((state) => state.setStep)
  const moveStep = useAtlas((state) => state.moveStep)
  const setNarration = useAtlas((state) => state.setNarration)
  const toggleExploded = useAtlas((state) => state.toggleExploded)
  const toggleRotation = useAtlas((state) => state.toggleRotation)
  const setGuideOpen = useAtlas((state) => state.setGuideOpen)
  const setResearchOpen = useAtlas((state) => state.setResearchOpen)
  const setSelectedBodyPart = useAtlas((state) => state.setSelectedBodyPart)
  const atlasStudy = useAtlasStudy()
  const guideTriggerRef = useRef<HTMLButtonElement>(null)
  const researchTriggerRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const disease = diseaseById(selectedDiseaseId)
  const step = disease.steps[stepIndex]
  const finalStep = stepIndex === disease.steps.length - 1
  const focusPart = (rendererAvailable ? selectedBodyPart ?? step.bodyParts[0] : step.bodyParts[0]) as BodyPartId
  const focusLabel = BODY_PART_LABELS[focusPart]
  const searching = searchQuery.trim().length > 0
  const searchResults = searching ? searchAtlas(searchQuery) : []
  const recordId = atlasStudyRecordId(disease.id, step.id)
  const studyRecord = atlasStudy.records[recordId] ?? { saved: false, studied: false, note: '' }

  useEffect(() => {
    useAtlasStudy.getState().setPosition({ diseaseId: disease.id, stepId: step.id })
  }, [disease.id, step.id])

  useEffect(() => {
    useAtlas.getState().setNarration(useAtlasStudy.getState().narration)
  }, [])

  useEffect(() => {
    useExperience.getState().pause()
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return
      if (event.key === '/') {
        event.preventDefault()
        searchInputRef.current?.focus()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        useAtlas.getState().moveStep(1)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        useAtlas.getState().moveStep(-1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!rendererAvailable) useAtlas.getState().setGuideOpen(false)
  }, [rendererAvailable])

  return (
    <main className="atlas" aria-labelledby="atlas-title">
      <aside className="atlas-library" aria-label="WHO top 10 condition library">
        <div className="atlas-library-heading">
          <p className="eyebrow">WHO 2021 · global causes of death</p>
          <h2>Condition library</h2>
        </div>
        <form className="atlas-search" role="search" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="atlas-wayfinder">Find a route</label>
          <div>
            <span aria-hidden="true">⌕</span>
            <input
              ref={searchInputRef}
              id="atlas-wayfinder"
              type="search"
              autoComplete="off"
              spellCheck="false"
              value={searchQuery}
              placeholder="Kidneys, insulin, stroke…"
              aria-describedby="atlas-search-boundary"
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Escape' || !searchQuery) return
                event.stopPropagation()
                setSearchQuery('')
              }}
            />
            {searchQuery ? (
              <button type="button" aria-label="Clear Atlas search" onClick={() => {
                setSearchQuery('')
                searchInputRef.current?.focus()
              }}>×</button>
            ) : <kbd aria-label="Keyboard shortcut">/</kbd>}
          </div>
          <p id="atlas-search-boundary">Current preview only · no personal data</p>
        </form>
        {searching ? (
          <AtlasSearchResults results={searchResults} />
        ) : (
          <ol>
            {DISEASES.map((candidate) => (
              <li key={candidate.id}>
                <button
                  type="button"
                  aria-current={candidate.id === disease.id ? 'page' : undefined}
                  onClick={() => setDisease(candidate.id)}
                >
                  <span>{String(candidate.rank).padStart(2, '0')}</span>
                  <span>
                    <strong>{candidate.shortTitle}</strong>
                    <small>{candidate.category}</small>
                  </span>
                  <i aria-hidden="true" style={{ background: candidate.accent }} />
                </button>
              </li>
            ))}
          </ol>
        )}
        <a href="https://www.who.int/news-room/fact-sheets/detail/the-top-10-causes-of-death" target="_blank" rel="noreferrer">
          Why these ten? <span aria-hidden="true">↗</span>
        </a>
      </aside>

      <section
        className="atlas-stage"
        aria-label={rendererAvailable ? 'Interactive 3D systems map' : 'Scene-free mechanism guide'}
        data-renderer={rendererAvailable ? 'available' : 'unavailable'}
        data-phase-detail={step.id}
        data-focus-part={rendererAvailable ? selectedBodyPart ?? 'whole-body' : undefined}
      >
        <div className="atlas-stage-heading">
          <div>
            <p className="eyebrow">
              {rendererAvailable ? '3D systems map · visibly synthetic' : 'Scene-free mechanism guide'}
            </p>
            <p>{disease.pathwayLabel}</p>
          </div>
          {rendererAvailable ? <div className="atlas-view-actions" role="group" aria-label="3D view controls">
            <button type="button" aria-pressed={exploded} onClick={toggleExploded}>
              {exploded ? 'Assemble body' : 'Explode systems'}
            </button>
            <button type="button" aria-pressed={rotationPaused} onClick={toggleRotation}>
              {rotationPaused ? 'Resume drift' : 'Pause drift'}
            </button>
            {selectedBodyPart ? (
              <button type="button" onClick={() => setSelectedBodyPart(null)}>Whole body</button>
            ) : null}
            <button ref={guideTriggerRef} type="button" onClick={() => setGuideOpen(true)}>How to use</button>
          </div> : null}
        </div>
        {rendererAvailable ? <><div className="atlas-active-parts">
          <span>Phase detail</span>
          {step.bodyParts.map((part) => (
            <button
              key={part}
              type="button"
              data-active="true"
              aria-pressed={selectedBodyPart === part}
              onClick={() => setSelectedBodyPart(selectedBodyPart === part ? null : part)}
            >
              {BODY_PART_LABELS[part]}
            </button>
          ))}
        </div>
        <p className="atlas-structure-status" aria-live="polite">
          {selectedBodyPart
            ? `${focusLabel} in close focus. Layered geometry and phase signals are conceptual, not anatomical scale.`
            : `${focusLabel} anchors this phase. Select any highlighted structure for close detail.`}
        </p></> : (
          <p className="atlas-scene-free-note" role="note">
            <strong>Scene-free route</strong>
            <span>3D body controls are unavailable. Continue through the mechanism steps, Research Lens, and source links.</span>
          </p>
        )}
      </section>

      <article className="atlas-detail">
        <div className="atlas-detail-topline">
          <span style={{ color: disease.accent }}>WHO #{disease.rank}</span>
          <div className="atlas-detail-actions">
            <button ref={researchTriggerRef} type="button" onClick={() => setResearchOpen(true)}>Research lens</button>
            <button type="button" onClick={() => close()}>Back to overview <span aria-hidden="true">×</span></button>
          </div>
        </div>
        {import.meta.env.VITE_ANATOMY_PREVIEW ? <button className="anatomy-return" type="button" onClick={() => window.dispatchEvent(new Event('paldawn:open-anatomy'))}>← Return to Anatomy Lab</button> : null}
        <p className="atlas-category">{disease.category} · source-backed preview</p>
        <h1 id="atlas-title">{disease.title}</h1>
        <p className="atlas-summary">{disease.summary}</p>
        <ul className="atlas-system-list" aria-label="Affected systems">
          {disease.affectedSystems.map((system) => <li key={system}>{system}</li>)}
        </ul>

        <div className="atlas-reading-switch" role="group" aria-label="Explanation depth">
          <button type="button" aria-pressed={narration === 'plain'} onClick={() => { setNarration('plain'); atlasStudy.setNarration('plain') }}>Plain English</button>
          <button type="button" aria-pressed={narration === 'clinical'} onClick={() => { setNarration('clinical'); atlasStudy.setNarration('clinical') }}>Clinical terms</button>
          <button type="button" aria-pressed={readingOpen} onClick={() => setReadingOpen(true)}>Compare pathway</button>
        </div>

        <section className="atlas-step-card" aria-labelledby="atlas-step-title">
          <div className="atlas-step-count">
            <span>{String(stepIndex + 1).padStart(2, '0')}</span>
            <span>of {String(disease.steps.length).padStart(2, '0')}</span>
            <i aria-hidden="true" style={{ background: disease.accent }} />
          </div>
          <p>{step.phase}</p>
          <h2 id="atlas-step-title" aria-live="polite">{step.label}</h2>
          <aside className="atlas-mechanism-lens" aria-label={rendererAvailable ? 'Mechanism lens' : 'Mechanism context'} aria-live="polite">
            <div>
              <span>{rendererAvailable ? 'Mechanism lens' : 'Mechanism context'}</span>
              <strong>{rendererAvailable
                ? `${focusLabel} · ${selectedBodyPart ? 'close focus' : 'phase anchor'}`
                : `${step.bodyParts.length} structure${step.bodyParts.length === 1 ? '' : 's'} named`}</strong>
            </div>
            <p>
              {rendererAvailable
                ? selectedBodyPart
                  ? 'The 3D view is holding this structure close while the current phase route remains visible.'
                  : 'Select a highlighted structure in the 3D view to reveal its layered detail.'
                : 'These conceptual structures are named by the current authored step; no body view or visual highlight is active.'}
            </p>
            <ul aria-label={rendererAvailable ? 'Structures shown in this phase' : 'Structures named in this phase'}>
              {step.bodyParts.map((part) => (
                <li key={part} data-primary={rendererAvailable && part === focusPart ? 'true' : undefined}>{BODY_PART_LABELS[part]}</li>
              ))}
            </ul>
          </aside>
          <p className="atlas-step-copy">{step[narration]}</p>
          {step.caution ? <p className="atlas-caution"><b>Care boundary</b>{step.caution}</p> : null}
          <SourceLinks sourceIds={step.sourceIds} />
          <section className="atlas-study-card" aria-labelledby="atlas-study-title">
            <div><span>YOUR STUDY</span><h3 id="atlas-study-title">Keep this step</h3></div>
            <div className="atlas-study-actions">
              <button type="button" aria-pressed={studyRecord.saved} onClick={() => atlasStudy.updateRecord(disease.id, step.id, { saved: !studyRecord.saved })}>{studyRecord.saved ? 'Saved step' : 'Save step'}</button>
              <button type="button" aria-pressed={studyRecord.studied} onClick={() => atlasStudy.updateRecord(disease.id, step.id, { studied: !studyRecord.studied })}>{studyRecord.studied ? 'Studied ✓' : 'Mark studied'}</button>
              <button type="button" aria-expanded={studyOpen} onClick={() => setStudyOpen((open) => !open)}>Private note</button>
              <button type="button" onClick={() => {
                void shareOrCopy({ title: `${disease.title} · ${step.label}`, text: 'PalDawn educational mechanism step', url: atlasStepUrl(disease.id, stepIndex, selectedBodyPart as BodyPartId | null) }).then((outcome) => setActionStatus(outcome === 'shared' ? 'Step shared.' : outcome === 'copied' ? 'Step link copied.' : outcome === 'cancelled' ? 'Share cancelled.' : 'Sharing and copy are unavailable.'))
              }}>Share step</button>
            </div>
            {studyOpen ? <label className="atlas-note" htmlFor="atlas-private-note">Private note · stored only in this browser<textarea id="atlas-private-note" maxLength={MAX_STAGE_NOTE_LENGTH} value={studyRecord.note} placeholder="What do you want to remember? Do not enter patient information." onChange={(event) => atlasStudy.updateRecord(disease.id, step.id, { note: event.target.value })} /><small>{studyRecord.note.length} / {MAX_STAGE_NOTE_LENGTH}</small></label> : null}
            <p className="atlas-study-status" role="status">{actionStatus || atlasStudy.status || (atlasStudy.persisted ? '' : 'This change has not been saved to browser storage.')}</p>
          </section>
        </section>

        {finalStep ? (
          <p className="atlas-completion-status" role="status">
            <b>Mechanism complete.</b> Return to the condition index or revisit any step.
          </p>
        ) : null}
        <div className="atlas-step-actions" data-complete={finalStep}>
          <button type="button" disabled={stepIndex === 0} onClick={() => moveStep(-1)}>← Previous</button>
          {finalStep ? (
            <button type="button" onClick={() => close()}>Choose another condition →</button>
          ) : (
            <button type="button" onClick={() => moveStep(1)}>Next step →</button>
          )}
        </div>
        <p className="atlas-review-boundary" role="note" aria-label="Medical review status">
          <strong>Medical review status</strong>
          Sources checked {ATLAS_EVIDENCE_STATUS.sourcesCheckedLabel}. This educational synthesis has not yet been reviewed by a named qualified clinician.
        </p>
      </article>

      <nav className="atlas-timeline" aria-label={`${disease.title} mechanism steps`}>
        <div>
          <span>{disease.shortTitle}</span>
          <output>{stepIndex + 1} / {disease.steps.length}</output>
        </div>
        <ol>
          {disease.steps.map((candidate, index) => (
            <li key={candidate.id}>
              <button
                type="button"
                aria-current={index === stepIndex ? 'step' : undefined}
                aria-label={`Step ${index + 1}: ${candidate.label}`}
                onClick={() => setStep(index)}
                style={{ '--atlas-accent': disease.accent } as React.CSSProperties}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <i>{candidate.label}</i>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      {rendererAvailable && guideOpen ? <ExplorerGuide returnFocusTo={guideTriggerRef} /> : null}
      {researchOpen ? (
        <ResearchLens
          disease={disease}
          currentStepIndex={stepIndex}
          returnFocusTo={researchTriggerRef}
          onClose={() => setResearchOpen(false)}
          onSelectStep={(nextStepIndex) => {
            setStep(nextStepIndex)
            setResearchOpen(false)
          }}
        />
      ) : null}
      {readingOpen ? <AtlasReadingView disease={disease} activeStepIndex={stepIndex} includeNotes={includeNotes} onIncludeNotes={setIncludeNotes} onClose={() => setReadingOpen(false)} onSelectStep={setStep} /> : null}
    </main>
  )
}
