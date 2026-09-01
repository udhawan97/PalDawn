import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import {
  CURRICULUM_SYSTEMS,
  DISEASE_CURRICULUM,
  EXPLORABLE_CURRICULUM,
  curriculumSystemById,
  filterDiseaseCurriculum,
  type CurriculumStatus,
  type CurriculumSystemId,
} from '../data/diseaseCatalog'
import { diseasePackProposalByConditionId } from '../data/diseasePackRegistry'
import { useAtlas } from '../state/atlas'
import { DiseasePackInspector } from './DiseasePackInspector'

type CatalogStatusFilter = CurriculumStatus | 'all'
type CatalogSystemFilter = CurriculumSystemId | 'all'

const SCALE_STAGES = [
  ['L0', 'Body'],
  ['L1', 'System'],
  ['L2', 'Organ'],
  ['L3', 'Structure'],
  ['L4', 'Tissue'],
  ['L5', 'Cellular'],
] as const

export function CurriculumCatalog({
  onClose,
  returnFocusTo,
}: {
  onClose: () => void
  returnFocusTo: RefObject<HTMLButtonElement | null>
}) {
  const [query, setQuery] = useState('')
  const [systemFilter, setSystemFilter] = useState<CatalogSystemFilter>('all')
  const [statusFilter, setStatusFilter] = useState<CatalogStatusFilter>('all')
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const proposalTriggerRef = useRef<HTMLButtonElement>(null)
  const scaleRef = useRef<HTMLOListElement>(null)
  const [scaleScrollable, setScaleScrollable] = useState(false)
  const openDisease = useAtlas((state) => state.openDisease)
  const narration = useAtlas((state) => state.narration)
  const setNarration = useAtlas((state) => state.setNarration)
  const selectedProposal = selectedProposalId ? diseasePackProposalByConditionId(selectedProposalId) : null

  const results = useMemo(
    () => filterDiseaseCurriculum(query, systemFilter, statusFilter),
    [query, statusFilter, systemFilter],
  )

  useLayoutEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }))
    return () => window.cancelAnimationFrame(focusFrame)
  }, [])

  useLayoutEffect(() => {
    const scale = scaleRef.current
    if (!scale) return
    const updateScrollable = () => setScaleScrollable(scale.scrollWidth > scale.clientWidth + 1)
    updateScrollable()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateScrollable)
    observer?.observe(scale)
    window.addEventListener('resize', updateScrollable)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateScrollable)
    }
  }, [])

  useEffect(() => {
    const returnTarget = returnFocusTo.current
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.requestAnimationFrame(() => returnTarget?.focus())
    }
  }, [onClose, returnFocusTo])

  const chooseJourney = (journeyId: string) => {
    onClose()
    openDisease(journeyId)
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="curriculum-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className="curriculum-catalog"
        data-inspector-open={selectedProposal ? 'true' : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="curriculum-title"
        aria-describedby={selectedProposal ? 'pack-inspector-boundary' : 'curriculum-boundary'}
      >
        <header className="curriculum-header">
          <div>
            <p className="eyebrow">Global burden curriculum · planning instrument</p>
            <h2 id="curriculum-title">Fifty conditions. One body. Six scales.</h2>
          </div>
          <button type="button" className="curriculum-close" aria-label="Close condition curriculum" onClick={onClose}>×</button>
        </header>

        {selectedProposal ? (
          <DiseasePackInspector
            proposal={selectedProposal}
            narration={narration}
            onNarrationChange={setNarration}
            onBack={() => setSelectedProposalId(null)}
            returnFocusTo={proposalTriggerRef}
          />
        ) : (
        <>
        <div className="curriculum-brief">
          <div className="curriculum-count" aria-label={`${DISEASE_CURRICULUM.length} conditions in the curriculum`}>
            <strong>{DISEASE_CURRICULUM.length}</strong>
            <span>condition curriculum</span>
          </div>
          <p>
            This is a coverage plan, not a worldwide rank. Mortality, disability burden,
            organ-system breadth, and mechanism diversity shape the queue.
          </p>
          <dl>
            <div><dt>Explore now</dt><dd>{EXPLORABLE_CURRICULUM.length}</dd></div>
            <div><dt>Build queue</dt><dd>{DISEASE_CURRICULUM.length - EXPLORABLE_CURRICULUM.length}</dd></div>
            <div><dt>Published review</dt><dd>0</dd></div>
          </dl>
        </div>

        <ol
          ref={scaleRef}
          className="curriculum-scale"
          aria-label="Planned semantic scale coverage"
          data-scrollable={scaleScrollable ? 'true' : undefined}
          tabIndex={scaleScrollable ? 0 : undefined}
        >
          {SCALE_STAGES.map(([level, label]) => (
            <li key={level}>
              <span>{level}</span>
              <strong>{label}</strong>
            </li>
          ))}
        </ol>

        <div className="curriculum-controls">
          <label>
            <span>Find a condition or system</span>
            <input
              ref={searchRef}
              type="search"
              autoFocus
              value={query}
              placeholder="Hypertension, brain, CV-03…"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="curriculum-status-filter" role="group" aria-label="Filter by build status">
            {([
              ['all', 'All 50'],
              ['explorable', 'Explore now'],
              ['planned', 'Build queue'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={statusFilter === value}
                onClick={() => setStatusFilter(value)}
              >{label}</button>
            ))}
          </div>
        </div>

        <div className="curriculum-system-filter" role="group" aria-label="Filter by organ system">
          <button type="button" aria-pressed={systemFilter === 'all'} onClick={() => setSystemFilter('all')}>
            <span>ALL</span>
            <strong>{DISEASE_CURRICULUM.length}</strong>
          </button>
          {CURRICULUM_SYSTEMS.map((system) => {
            const count = DISEASE_CURRICULUM.filter((entry) => entry.systemId === system.id).length
            return (
              <button
                key={system.id}
                type="button"
                style={{ '--system-accent': system.accent } as CSSProperties}
                aria-label={`${system.label}: ${count} conditions`}
                aria-pressed={systemFilter === system.id}
                title={system.label}
                onClick={() => setSystemFilter(system.id)}
              >
                <span>{system.code}</span>
                <strong>{count}</strong>
              </button>
            )
          })}
        </div>

        <div className="curriculum-result-heading" role="status" aria-live="polite">
          <strong>{results.length} condition{results.length === 1 ? '' : 's'}</strong>
          <span>{systemFilter === 'all' ? 'All systems' : curriculumSystemById(systemFilter).label}</span>
        </div>

        {results.length > 0 ? (
          <ol className="curriculum-grid">
            {results.map((entry) => {
              const system = curriculumSystemById(entry.systemId)
              const proposal = diseasePackProposalByConditionId(entry.id)
              const content = (
                <>
                  <span className="curriculum-code" style={{ color: system.accent }}>{entry.code}</span>
                  <strong>{entry.title}</strong>
                  <small>{system.label}</small>
                  <span className="curriculum-entry-status">
                    {entry.status === 'explorable'
                      ? 'Open source-linked preview'
                      : proposal
                        ? 'Dossier draft · inspect build plan'
                        : 'Sources + review required'}
                  </span>
                </>
              )
              return (
                <li key={entry.id} data-status={entry.status} style={{ '--system-accent': system.accent } as CSSProperties}>
                  {entry.journeyId ? (
                    <button type="button" onClick={() => chooseJourney(entry.journeyId!)}>{content}</button>
                  ) : proposal ? (
                    <button
                      ref={proposalTriggerRef}
                      type="button"
                      aria-label={`Inspect ${entry.title} build plan`}
                      onClick={() => setSelectedProposalId(entry.id)}
                    >{content}</button>
                  ) : (
                    <article aria-label={`${entry.title}. Planned; sources and qualified review required.`}>{content}</article>
                  )}
                </li>
              )
            })}
          </ol>
        ) : (
          <div className="curriculum-empty">
            <strong>No curriculum match</strong>
            <span>Try another condition name or reset the system and status filters.</span>
            <button type="button" onClick={() => { setQuery(''); setSystemFilter('all'); setStatusFilter('all') }}>Reset filters</button>
          </div>
        )}

        <footer id="curriculum-boundary" className="curriculum-boundary">
          <strong>Education plan · not diagnosis or clinical training.</strong>
          <span>Only ten source-linked previews open today. All remain pending qualified medical review; the other forty are planning records, not health guidance.</span>
        </footer>
        </>
        )}
      </section>
    </div>,
    document.body,
  )
}
