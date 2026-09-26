import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { buildAtlasSystemGroups } from '../data/atlasDiscovery'
import { ATLAS_EVIDENCE_STATUS, buildAtlasEvidenceLibrary } from '../data/atlasEvidence'
import {
  buildAtlasStudyIndex,
  countAtlasStudy,
  filterAtlasStudy,
  nextOpenSavedAtlasStep,
  type AtlasStudyFilter,
} from '../data/atlasStudyIndex'
import { DISEASES, diseaseById, type BodyPartId } from '../data/diseases'
import { downloadText } from '../platform/downloads'
import { atlasStudyMarkdown } from '../platform/study'
import { useAtlas } from '../state/atlas'
import { useAtlasStudy } from '../state/atlasStudy'

type DeskTab = 'study' | 'systems' | 'evidence'

export function AtlasStudyDesk({
  onClose,
  returnFocusTo,
}: {
  onClose: () => void
  returnFocusTo: RefObject<HTMLButtonElement | null>
}) {
  const dialogRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const restoreFocusOnClose = useRef(true)
  const [tab, setTab] = useState<DeskTab>('study')
  const [studyFilter, setStudyFilter] = useState<AtlasStudyFilter>('all')
  const [studyQuery, setStudyQuery] = useState('')
  const [includeNotes, setIncludeNotes] = useState(false)
  const [systemId, setSystemId] = useState<BodyPartId | null>(null)
  const [evidenceQuery, setEvidenceQuery] = useState('')
  const study = useAtlasStudy()

  const studyEntries = useMemo(() => buildAtlasStudyIndex(study), [study.records])
  const studyCounts = useMemo(() => countAtlasStudy(studyEntries), [studyEntries])
  const filteredStudy = useMemo(
    () => filterAtlasStudy(studyEntries, studyFilter, studyQuery),
    [studyEntries, studyFilter, studyQuery],
  )
  const nextOpen = useMemo(() => nextOpenSavedAtlasStep(studyEntries), [studyEntries])
  const systemGroups = useMemo(buildAtlasSystemGroups, [])
  const selectedSystem = systemGroups.find((group) => group.bodyPartId === systemId) ?? null
  const evidence = useMemo(() => buildAtlasEvidenceLibrary(DISEASES), [])
  const evidenceTerms = evidenceQuery.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean)
  const filteredEvidence = evidence.filter((entry) => {
    const searchable = `${entry.source.organization} ${entry.source.title} ${entry.diseaseTitle}`.toLocaleLowerCase()
    return evidenceTerms.every((term) => searchable.includes(term))
  })

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const returnTarget = returnFocusTo.current
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )]
      if (!focusable.length) return
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
      if (restoreFocusOnClose.current) window.requestAnimationFrame(() => returnTarget?.focus())
    }
  }, [onClose, returnFocusTo])

  const openStep = (diseaseId: string, stepIndex: number, bodyPartId?: BodyPartId) => {
    restoreFocusOnClose.current = false
    useAtlas.getState().openDisease(diseaseId, '[data-atlas-opener="study-desk"]')
    useAtlas.getState().setTarget(diseaseId, stepIndex, bodyPartId)
    onClose()
  }

  return createPortal(
    <div className="atlas-desk-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section ref={dialogRef} className="atlas-desk" role="dialog" aria-modal="true" aria-labelledby="atlas-desk-title" data-include-notes={includeNotes || undefined}>
        <header className="atlas-desk-header">
          <div>
            <p className="eyebrow">Local study · authored routes · exact sources</p>
            <h2 id="atlas-desk-title">Your Atlas study desk</h2>
          </div>
          <button ref={closeRef} className="atlas-desk-close" type="button" aria-label="Close Atlas study desk" onClick={onClose}>×</button>
        </header>

        <nav className="atlas-desk-tabs" aria-label="Atlas study desk views">
          <button type="button" aria-pressed={tab === 'study'} onClick={() => setTab('study')}>Study</button>
          <button type="button" aria-pressed={tab === 'systems'} onClick={() => setTab('systems')}>Body systems</button>
          <button type="button" aria-pressed={tab === 'evidence'} onClick={() => setTab('evidence')}>Evidence library</button>
        </nav>

        {tab === 'study' ? <div className="atlas-desk-body atlas-desk-study">
          <section className="atlas-desk-summary" aria-label="Atlas study summary">
            {([
              ['active', 'Active', studyCounts.active],
              ['saved', 'Saved', studyCounts.saved],
              ['open', 'Open', studyCounts.open],
              ['studied', 'Studied', studyCounts.studied],
              ['notes', 'Notes', studyCounts.notes],
              ['unavailable', 'Unavailable', studyCounts.unavailable],
            ] as const).map(([key, label, count]) => <button key={key} type="button" aria-pressed={studyFilter === (key === 'active' ? 'all' : key)} onClick={() => setStudyFilter(key === 'active' ? 'all' : key)}><strong>{count}</strong><span>{label}</span></button>)}
          </section>

          <div className="atlas-desk-tools">
            <label>Find a saved step or private note<input type="search" value={studyQuery} placeholder="Condition, phase, or note…" onChange={(event) => setStudyQuery(event.target.value)} /></label>
            <div className="atlas-desk-actions">
              <button type="button" disabled={!nextOpen} onClick={() => nextOpen?.diseaseId && nextOpen.stepIndex !== null && openStep(nextOpen.diseaseId, nextOpen.stepIndex)}>Continue next open</button>
              <label><input type="checkbox" checked={includeNotes} onChange={(event) => setIncludeNotes(event.target.checked)} /> Include private notes in download and print</label>
              <button type="button" onClick={() => downloadText('paldawn-atlas-study.md', atlasStudyMarkdown(study, { includeNotes }), 'text/markdown;charset=utf-8')}>Download complete study</button>
              <button type="button" onClick={() => window.print()}>Print this view</button>
            </div>
          </div>

          <p className="atlas-desk-boundary">Study marks are personal organization, not assessment or proof of mastery. Private notes remain local and are excluded from export unless selected.</p>
          <p className="atlas-desk-result" role="status">{filteredStudy.length} matching study {filteredStudy.length === 1 ? 'record' : 'records'}{studyCounts.unavailable ? ` · ${studyCounts.unavailable} unavailable preserved` : ''}</p>
          {filteredStudy.length ? <ol className="atlas-desk-list">
            {filteredStudy.map((entry) => <li key={entry.id} data-unavailable={entry.unavailable || undefined}>
              <div><span>{entry.diseaseShortTitle} · {entry.phase}</span><h3>{entry.stepLabel}</h3></div>
              <ul aria-label="Personal study state">
                {entry.record.saved ? <li>Saved</li> : null}
                {entry.record.studied ? <li>Studied</li> : <li>Open</li>}
                {entry.record.note.trim() ? <li>Has note</li> : null}
              </ul>
              {entry.record.note.trim() ? <p>{entry.record.note}</p> : null}
              {entry.diseaseId && entry.stepIndex !== null ? <button type="button" onClick={() => openStep(entry.diseaseId!, entry.stepIndex!)}>Open exact step →</button> : <p className="atlas-desk-recovery">Preserved for backup and full-study export; no current record was substituted.</p>}
            </li>)}
          </ol> : <div className="atlas-desk-empty"><p>{studyQuery ? 'No study record matches that search.' : 'No study records match this filter yet.'}</p>{studyQuery ? <button type="button" onClick={() => setStudyQuery('')}>Clear search</button> : null}</div>}
        </div> : null}

        {tab === 'systems' ? <div className="atlas-desk-body atlas-desk-systems">
          <div className="atlas-system-picker" role="list" aria-label="Authored body-system pathway groups">
            {systemGroups.map((group) => <button key={group.bodyPartId} type="button" aria-pressed={systemId === group.bodyPartId} onClick={() => setSystemId(group.bodyPartId)}><span>{group.label}</span><strong>{group.pathways.length}</strong></button>)}
          </div>
          <section className="atlas-system-results" aria-live="polite">
            {selectedSystem ? <><header><p className="eyebrow">Explicitly authored structure links</p><h3>{selectedSystem.label}</h3><p>{selectedSystem.pathways.length} pathway steps name this structure.</p></header><ol>{selectedSystem.pathways.map((pathway) => <li key={`${pathway.diseaseId}:${pathway.stepId}`}><span style={{ color: pathway.accent }}>WHO #{pathway.diseaseRank} · {pathway.diseaseShortTitle}</span><h4>{pathway.stepLabel}</h4><p>{pathway.phase}</p><button type="button" onClick={() => openStep(pathway.diseaseId, pathway.stepIndex, pathway.bodyPartId)}>Open exact step →</button></li>)}</ol></> : <div className="atlas-desk-empty"><p>Choose a structure to see only the existing pathway steps that explicitly name it.</p></div>}
          </section>
          <p className="atlas-desk-boundary">These links come directly from authored step metadata. They do not infer that every disease affects every part of a structure.</p>
        </div> : null}

        {tab === 'evidence' ? <div className="atlas-desk-body atlas-desk-evidence">
          <div className="atlas-desk-tools"><label>Find a source, organization, or condition<input type="search" value={evidenceQuery} placeholder="WHO, NIDDK, diabetes…" onChange={(event) => setEvidenceQuery(event.target.value)} /></label></div>
          <p className="atlas-desk-boundary">Sources checked {ATLAS_EVIDENCE_STATUS.sourcesCheckedLabel}. Citations expose the basis of each authored step; {ATLAS_EVIDENCE_STATUS.reviewLabel.toLocaleLowerCase()}.</p>
          <p className="atlas-desk-result" role="status">{filteredEvidence.length} matching source {filteredEvidence.length === 1 ? 'record' : 'records'}</p>
          <ol className="atlas-evidence-library">
            {filteredEvidence.map((entry) => {
              const disease = diseaseById(entry.diseaseId)
              return <li key={`${entry.diseaseId}:${entry.source.id}`}>
                <span>WHO #{entry.diseaseRank} · {entry.diseaseShortTitle}</span>
                <h3>{entry.source.title}</h3>
                <p>{entry.source.organization}</p>
                <a href={entry.source.url} target="_blank" rel="noreferrer">Open source ↗</a>
                {entry.stepIndexes.length ? <div><strong>Linked authored steps</strong>{entry.stepIndexes.map((stepIndex) => <button key={disease.steps[stepIndex].id} type="button" onClick={() => openStep(entry.diseaseId, stepIndex)}>{disease.steps[stepIndex].label} →</button>)}</div> : <p className="atlas-context-source">Ranking context only · not presented as evidence for a mechanism step.</p>}
              </li>
            })}
          </ol>
        </div> : null}
      </section>
    </div>,
    document.body,
  )
}
