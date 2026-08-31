import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import {
  SEMANTIC_SCALES,
  proposalPlanningProgress,
  type DiseasePackProposal,
  type SemanticScaleId,
} from '../data/diseasePack'
import type { AtlasNarration } from '../state/atlas'

const STATUS_LABELS = {
  complete: 'Planning complete',
  draft: 'Draft',
  'not-started': 'Not started',
  blocked: 'Blocked',
} as const

export function DiseasePackInspector({
  proposal,
  narration,
  onNarrationChange,
  onBack,
  returnFocusTo,
}: {
  proposal: DiseasePackProposal
  narration: AtlasNarration
  onNarrationChange: (narration: AtlasNarration) => void
  onBack: () => void
  returnFocusTo: RefObject<HTMLButtonElement | null>
}) {
  const [selectedScaleId, setSelectedScaleId] = useState<SemanticScaleId>('L0')
  const backButtonRef = useRef<HTMLButtonElement>(null)
  const selectedScale = useMemo(
    () => proposal.scaleStoryboard.find((scale) => scale.id === selectedScaleId)!,
    [proposal.scaleStoryboard, selectedScaleId],
  )
  const completedPlanningGates = proposalPlanningProgress(proposal)

  useLayoutEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => backButtonRef.current?.focus({ preventScroll: true }))
    return () => window.cancelAnimationFrame(focusFrame)
  }, [])

  const goBack = () => {
    onBack()
    window.requestAnimationFrame(() => returnFocusTo.current?.focus({ preventScroll: true }))
  }

  return (
    <div className="pack-inspector" aria-labelledby="pack-inspector-title">
      <div className="pack-inspector-toolbar">
        <button ref={backButtonRef} type="button" autoFocus onClick={goBack}>← All conditions</button>
        <span>{proposal.packId}</span>
        <strong>Planning only · publication blocked</strong>
      </div>

      <div className="pack-inspector-scroll">
        <section className="pack-inspector-hero">
          <div className="pack-orbit" aria-hidden="true">
            {SEMANTIC_SCALES.map((scale, index) => (
              <i
                key={scale.id}
                data-active={scale.id === selectedScaleId}
                style={{ '--orbit-index': index } as CSSProperties}
              />
            ))}
            <b>{selectedScaleId}</b>
          </div>
          <div>
            <p className="eyebrow">CV-03 · first disease-pack proposal</p>
            <h3 id="pack-inspector-title">Hypertension, from whole person to cell</h3>
            <p>{proposal.selectionRationale}</p>
            <dl>
              <div><dt>Official sources</dt><dd>{proposal.sources.length}</dd></div>
              <div><dt>Draft claims</dt><dd>{proposal.claims.length}</dd></div>
              <div><dt>Planning gates</dt><dd>{completedPlanningGates}/{proposal.gates.length}</dd></div>
              <div><dt>Approved assets</dt><dd>{proposal.assets.length}</dd></div>
            </dl>
          </div>
        </section>

        <section className="pack-scale-lab" aria-labelledby="pack-scale-title">
          <header>
            <div>
              <p className="eyebrow">Shared state · two reading depths</p>
              <h4 id="pack-scale-title">Six-scale storyboard</h4>
            </div>
            <div className="pack-reading-switch" role="group" aria-label="Planning explanation depth">
              <button type="button" aria-pressed={narration === 'plain'} onClick={() => onNarrationChange('plain')}>Plain English</button>
              <button type="button" aria-pressed={narration === 'clinical'} onClick={() => onNarrationChange('clinical')}>Clinical terms</button>
            </div>
          </header>

          <div className="pack-scale-workbench">
            <ol className="pack-scale-rail" aria-label="Hypertension storyboard scales">
              {proposal.scaleStoryboard.map((scale) => {
                const scaleLabel = SEMANTIC_SCALES.find((candidate) => candidate.id === scale.id)!.label
                return (
                  <li key={scale.id}>
                    <button
                      type="button"
                      aria-current={scale.id === selectedScaleId ? 'step' : undefined}
                      onClick={() => setSelectedScaleId(scale.id)}
                    >
                      <span>{scale.id}</span>
                      <strong>{scaleLabel}</strong>
                      <small>Storyboard draft</small>
                    </button>
                  </li>
                )
              })}
            </ol>

            <article className="pack-scale-detail" aria-live="polite">
              <div className="pack-scale-detail-heading">
                <span>{selectedScale.id}</span>
                <div>
                  <p>{SEMANTIC_SCALES.find((scale) => scale.id === selectedScale.id)!.label}</p>
                  <h5>{narration === 'plain' ? selectedScale.plainFocus : selectedScale.clinicalFocus}</h5>
                </div>
              </div>
              <p className="pack-comparison-question"><span>Comparison question</span>{selectedScale.comparisonQuestion}</p>
              <ul aria-label="Planned structures">
                {selectedScale.structureIds.map((structureId) => (
                  <li key={structureId}>{structureId.replaceAll('-', ' ')}</li>
                ))}
              </ul>
              <dl className="pack-scale-status">
                <div><dt>Storyboard</dt><dd>Draft</dd></div>
                <div><dt>3D assets</dt><dd>Not started</dd></div>
                <div><dt>Review</dt><dd>Not started</dd></div>
              </dl>
            </article>
          </div>
          <p className="pack-depth-contract">{proposal.readingDepthContract}</p>
        </section>

        <div className="pack-inspector-ledgers">
          <section className="pack-gate-ledger" aria-labelledby="pack-gates-title">
            <header>
              <p className="eyebrow">Fail-closed build ledger</p>
              <h4 id="pack-gates-title">Eight gates before Explore now</h4>
            </header>
            <ol>
              {proposal.gates.map((gate, index) => (
                <li key={gate.id} data-status={gate.status}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{gate.label}</strong><small>{gate.evidence}</small></div>
                  <em>{STATUS_LABELS[gate.status]}</em>
                </li>
              ))}
            </ol>
          </section>

          <aside className="pack-source-ledger" aria-labelledby="pack-sources-title">
            <header>
              <p className="eyebrow">Source ledger · rechecked {proposal.updatedOn}</p>
              <h4 id="pack-sources-title">Recorded foundations</h4>
            </header>
            <ol>
              {proposal.sources.map((source, index) => (
                <li key={source.id}>
                  <span>S{String(index + 1).padStart(2, '0')}</span>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    <strong>{source.title}</strong>
                    <small>{source.organization} ↗</small>
                  </a>
                </li>
              ))}
            </ol>
            <p>
              Thresholds remain source-contextual: the WHO and cited U.S. NIH material use different diagnostic framing.
              The future lesson must name its guideline context rather than invent one universal number.
            </p>
          </aside>
        </div>
      </div>

      <footer id="pack-inspector-boundary" className="pack-inspector-boundary">
        <strong>This is a build dossier, not a hypertension lesson.</strong>
        <span>No journey, anatomy asset, simulation, diagnostic guidance, reviewer identity, or approval is attached.</span>
      </footer>
    </div>
  )
}
