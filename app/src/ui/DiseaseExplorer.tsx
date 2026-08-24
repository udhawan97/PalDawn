import { useEffect, useRef, type RefObject } from 'react'
import { BODY_PART_LABELS, DISEASES, diseaseById, type BodyPartId } from '../data/diseases'
import { useAtlas } from '../state/atlas'
import { useExperience } from '../state/experience'

export function TopDiseasesRail() {
  const openDisease = useAtlas((state) => state.openDisease)

  return (
    <aside className="top-diseases" aria-labelledby="top-diseases-title">
      <div className="top-diseases-heading">
        <p className="eyebrow">WHO global rank · 2021</p>
        <h2 id="top-diseases-title">Ten starting journeys</h2>
      </div>
      <ol>
        {DISEASES.map((disease) => (
          <li key={disease.id}>
            <button type="button" onClick={() => openDisease(disease.id)}>
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
    </aside>
  )
}

function ExplorerGuide({ returnFocusTo }: { returnFocusTo: RefObject<HTMLButtonElement | null> }) {
  const setGuideOpen = useAtlas((state) => state.setGuideOpen)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
    const returnTarget = returnFocusTo.current
    return () => {
      if (!returnTarget || !document.contains(returnTarget)) return
      window.requestAnimationFrame(() => returnTarget.focus())
    }
  }, [returnFocusTo])

  return (
    <section className="atlas-guide" role="dialog" aria-modal="false" aria-labelledby="atlas-guide-title">
      <div className="atlas-guide-heading">
        <div>
          <p className="eyebrow">Six controls · one learning loop</p>
          <h2 id="atlas-guide-title">How to use the systems map</h2>
        </div>
        <button ref={closeButtonRef} type="button" aria-label="Close how-to guide" onClick={() => setGuideOpen(false)}>×</button>
      </div>
      <ol>
        <li><b>Choose a condition.</b><span>The condition index follows WHO’s 2021 global ranking; it does not estimate your risk.</span></li>
        <li><b>Advance the mechanism.</b><span>Use the numbered timeline or the Previous and Next controls. Highlighted organs change at each step.</span></li>
        <li><b>Inspect the body.</b><span>Select a highlighted structure to enter close focus. The lens reveals layered geometry and the current phase signal; choose Whole body to return.</span></li>
        <li><b>Change reading depth.</b><span>Plain English explains the idea; Clinical terms adds vocabulary without turning this into professional training.</span></li>
        <li><b>Open the evidence.</b><span>Source links go directly to WHO and NIH/NIDDK pages. The synthesis itself has not received qualified medical review.</span></li>
        <li><b>Keep the boundary.</b><span>This experience cannot diagnose symptoms, calculate personal risk, or recommend treatment. Urgent warnings direct you to real care.</span></li>
      </ol>
      <div className="atlas-guide-shortcuts">
        <span><kbd>←</kbd><kbd>→</kbd> steps</span>
        <span><kbd>Esc</kbd> close</span>
      </div>
    </section>
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

export function DiseaseExplorer() {
  const selectedDiseaseId = useAtlas((state) => state.selectedDiseaseId)
  const stepIndex = useAtlas((state) => state.stepIndex)
  const narration = useAtlas((state) => state.narration)
  const exploded = useAtlas((state) => state.exploded)
  const rotationPaused = useAtlas((state) => state.rotationPaused)
  const guideOpen = useAtlas((state) => state.guideOpen)
  const selectedBodyPart = useAtlas((state) => state.selectedBodyPart)
  const close = useAtlas((state) => state.close)
  const setDisease = useAtlas((state) => state.setDisease)
  const setStep = useAtlas((state) => state.setStep)
  const moveStep = useAtlas((state) => state.moveStep)
  const setNarration = useAtlas((state) => state.setNarration)
  const toggleExploded = useAtlas((state) => state.toggleExploded)
  const toggleRotation = useAtlas((state) => state.toggleRotation)
  const setGuideOpen = useAtlas((state) => state.setGuideOpen)
  const setSelectedBodyPart = useAtlas((state) => state.setSelectedBodyPart)
  const guideTriggerRef = useRef<HTMLButtonElement>(null)
  const disease = diseaseById(selectedDiseaseId)
  const step = disease.steps[stepIndex]
  const finalStep = stepIndex === disease.steps.length - 1
  const focusPart = (selectedBodyPart ?? step.bodyParts[0]) as BodyPartId
  const focusLabel = BODY_PART_LABELS[focusPart]

  useEffect(() => {
    useExperience.getState().pause()
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return
      if (event.key === 'Escape') {
        if (useAtlas.getState().guideOpen) useAtlas.getState().setGuideOpen(false)
        else useAtlas.getState().close()
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

  return (
    <main className="atlas" aria-labelledby="atlas-title">
      <aside className="atlas-library" aria-label="WHO top 10 condition library">
        <div className="atlas-library-heading">
          <p className="eyebrow">WHO 2021 · global causes of death</p>
          <h2>Condition library</h2>
        </div>
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
        <a href="https://www.who.int/news-room/fact-sheets/detail/the-top-10-causes-of-death" target="_blank" rel="noreferrer">
          Why these ten? <span aria-hidden="true">↗</span>
        </a>
      </aside>

      <section
        className="atlas-stage"
        aria-label="Interactive 3D systems map"
        data-phase-detail={step.id}
        data-focus-part={selectedBodyPart ?? 'whole-body'}
      >
        <div className="atlas-stage-heading">
          <div>
            <p className="eyebrow">3D systems map · visibly synthetic</p>
            <p>{disease.pathwayLabel}</p>
          </div>
          <div className="atlas-view-actions" role="group" aria-label="3D view controls">
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
          </div>
        </div>
        <div className="atlas-active-parts">
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
        </p>
      </section>

      <article className="atlas-detail">
        <div className="atlas-detail-topline">
          <span style={{ color: disease.accent }}>WHO #{disease.rank}</span>
          <button type="button" onClick={close}>Back to overview <span aria-hidden="true">×</span></button>
        </div>
        <p className="atlas-category">{disease.category} · source-backed preview</p>
        <h1 id="atlas-title">{disease.title}</h1>
        <p className="atlas-summary">{disease.summary}</p>
        <ul className="atlas-system-list" aria-label="Affected systems">
          {disease.affectedSystems.map((system) => <li key={system}>{system}</li>)}
        </ul>

        <div className="atlas-reading-switch" role="group" aria-label="Explanation depth">
          <button type="button" aria-pressed={narration === 'plain'} onClick={() => setNarration('plain')}>Plain English</button>
          <button type="button" aria-pressed={narration === 'clinical'} onClick={() => setNarration('clinical')}>Clinical terms</button>
        </div>

        <section className="atlas-step-card" aria-labelledby="atlas-step-title">
          <div className="atlas-step-count">
            <span>{String(stepIndex + 1).padStart(2, '0')}</span>
            <span>of {String(disease.steps.length).padStart(2, '0')}</span>
            <i aria-hidden="true" style={{ background: disease.accent }} />
          </div>
          <p>{step.phase}</p>
          <h2 id="atlas-step-title" aria-live="polite">{step.label}</h2>
          <aside className="atlas-mechanism-lens" aria-label="Mechanism lens" aria-live="polite">
            <div>
              <span>Mechanism lens</span>
              <strong>{focusLabel} · {selectedBodyPart ? 'close focus' : 'phase anchor'}</strong>
            </div>
            <p>
              {selectedBodyPart
                ? 'The 3D view is holding this structure close while the current phase route remains visible.'
                : 'Select a highlighted structure in the 3D view to reveal its layered detail.'}
            </p>
            <ul aria-label="Structures shown in this phase">
              {step.bodyParts.map((part) => (
                <li key={part} data-primary={part === focusPart}>{BODY_PART_LABELS[part]}</li>
              ))}
            </ul>
          </aside>
          <p className="atlas-step-copy">{step[narration]}</p>
          {step.caution ? <p className="atlas-caution"><b>Care boundary</b>{step.caution}</p> : null}
          <SourceLinks sourceIds={step.sourceIds} />
        </section>

        {finalStep ? (
          <p className="atlas-completion-status" role="status">
            <b>Mechanism complete.</b> Return to the condition index or revisit any step.
          </p>
        ) : null}
        <div className="atlas-step-actions" data-complete={finalStep}>
          <button type="button" disabled={stepIndex === 0} onClick={() => moveStep(-1)}>← Previous</button>
          {finalStep ? (
            <button type="button" onClick={close}>Choose another condition →</button>
          ) : (
            <button type="button" onClick={() => moveStep(1)}>Next step →</button>
          )}
        </div>
        <p className="atlas-review-boundary">
          Educational synthesis · sources checked 22 Aug 2026 · not yet reviewed by a named qualified clinician.
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
      {guideOpen ? <ExplorerGuide returnFocusTo={guideTriggerRef} /> : null}
    </main>
  )
}
