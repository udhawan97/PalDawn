import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_VISIBLE, SYSTEMS, type Atlas, type Concept, type SceneState, type SystemId, type View } from './anatomy'
import { relatedLessons, searchStructures, SYSTEM_READING } from './studyLinks'
import { registerAtlasTools } from './agent-tools'
import { useAtlas } from '../state/atlas'
import { useSettings } from '../state/settings'
import './study.css'
import ResearchDesk from './ResearchDesk'
const AnatomyScene = lazy(() => import('./scene'))
const initial = (): SceneState => ({ explode: 0, visible: [...DEFAULT_VISIBLE], selected: [], isolate: false, view: 'three-quarter', rotate: false, reset: 0 })
type StudySession = { state: SceneState; chosen: Concept | null; query: string; saved: string[] }
const sessions: Record<'male' | 'female', StudySession> = { male: { state: initial(), chosen: null, query: '', saved: [] }, female: { state: { ...initial(), visible: [...DEFAULT_VISIBLE, 'integumentary'] }, chosen: null, query: '', saved: [] } }
let readingQueue: string[] = []
let lastSex: 'male' | 'female' = 'male'
type Context = { systems: Record<string, string>; structures: Record<string, string>; femaleSystems?: Record<string, string>; femaleStructures?: Record<string, string>; femaleReading?: Context['reading']; reading?: Record<string, { source: string; checked: string; topics: { title: string; url: string }[] }> }
export default function AnatomyStudy({ onClose }: { onClose: () => void }) {
  const [sex, setSex] = useState<'male' | 'female'>(() => { const ref = new URL(window.location.href).searchParams.get('reference'); return ref === 'male' || ref === 'female' ? ref : lastSex })
  const session = sessions[sex]
  const [tour, setTour] = useState(false)
  const [tourStep, setTourStep] = useState(0)
  const [quality, setQuality] = useState<'standard' | 'high'>('high')
  const [atlas, setAtlas] = useState<Atlas | null>(null)
  const [context, setContext] = useState<Context | null>(null)
  const [error, setError] = useState('')
  const [sceneError, setSceneError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [progress, setProgress] = useState(0)
  const [state, setState] = useState(() => ({ ...session.state, rotate: false }))
  const [chosen, setChosen] = useState<Concept | null>(session.chosen)
  const [query, setQuery] = useState(session.query)
  const [filter, setFilter] = useState<SystemId | 'all'>('all')
  const [page, setPage] = useState(0)
  const [tab, setTab] = useState<'structures' | 'systems' | 'study'>(session.chosen ? 'study' : 'structures')
  const [quiz, setQuiz] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [saved, setSaved] = useState<string[]>(session.saved)
  const [savedOnly, setSavedOnly] = useState(false)
  const [textOnly, setTextOnly] = useState(false)
  const [conditionQuery, setConditionQuery] = useState('')
  const [queue, setQueue] = useState<string[]>(readingQueue)
  const [researchFocus, setResearchFocus] = useState(false)
  const title = useRef<HTMLHeadingElement>(null)
  const reducedMotion = useSettings(s => s.reducedMotion)
  const deferred = useDeferredValue(query)
  useEffect(() => { sessions[sex] = { state, chosen, query, saved }; lastSex = sex }, [sex, state, chosen, query, saved])
  useEffect(() => {
    const abort = new AbortController()
    setError('')
    Promise.all([sex === 'female' ? 'models/atlas-female.json' : 'models/atlas.json', 'context.json'].map(async path => {
      const response = await fetch(`${import.meta.env.BASE_URL}anatomy/${path}`, { signal: abort.signal })
      if (!response.ok) throw new Error('The local anatomy pack is unavailable. Retry after preparing the preview pack.')
      return response.json()
    })).then(([data, explanations]) => { if (!abort.signal.aborted) { setAtlas(data); setContext(explanations) } })
      .catch(e => { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Could not load anatomy.') })
    return () => abort.abort()
  }, [attempt, sex])
  const parts = useMemo(() => new Map(atlas?.parts.map(p => [p.id, p])), [atlas])
  const choose = useCallback((concept: Concept) => {
    setTour(false); setConditionQuery(''); setChosen(concept); setQuiz(false); setRevealed(false); setTab('study')
    setState(s => ({ ...s, selected: concept.elements, explode: 0, rotate: false }))
    requestAnimationFrame(() => title.current?.focus())
  }, [])
  useEffect(() => { if (atlas) return registerAtlasTools(atlas, choose) }, [atlas, choose])
  const choosePart = useCallback((id: string) => {
    const p = parts.get(id)
    if (p) choose({ id: p.conceptId, name: p.name, elements: [p.id] })
  }, [parts, choose])
  const results = useMemo(() => atlas ? searchStructures(atlas, deferred, filter, parts).filter(c => !savedOnly || saved.includes(c.id)) : [], [atlas, deferred, filter, parts, savedOnly, saved])
  const selectedParts = chosen?.elements.flatMap(id => { const part = parts.get(id); return part ? [part] : [] }) ?? []
  const selectedSystems = [...new Set(selectedParts.map(p => p.system))]
  const availableSystems = SYSTEMS.filter(system => atlas?.parts.some(p => p.system === system.id))
  const tourSystems = availableSystems.filter(s => s.id !== 'pregnancy' && s.id !== 'integumentary')
  const activeContext = sex === 'female' ? context?.femaleSystems : context?.systems
  const activeStructures = sex === 'female' ? { ...context?.structures, ...context?.femaleStructures } : context?.structures
  const activeReading = sex === 'female' ? context?.femaleReading : context?.reading
  const changeSex = (next: 'male' | 'female') => {
    if (next === sex) return
    const remembered = sessions[next]
    setTour(false); setTourStep(0); setQuiz(false); setSceneError(''); setProgress(0); setAtlas(null); setSex(next)
    const url = new URL(window.location.href); url.searchParams.set('reference', next); window.history.replaceState(window.history.state, '', url)
    setState({ ...remembered.state, rotate: false }); setChosen(remembered.chosen); setQuery(remembered.query); setSaved(remembered.saved); setFilter('all'); setPage(0); setConditionQuery(''); setTab('structures')
  }
  useEffect(() => {
    if (!tour || reducedMotion || !tourSystems.length) return
    const timer = window.setInterval(() => setTourStep(step => (step + 1) % tourSystems.length), 6000)
    return () => window.clearInterval(timer)
  }, [tour, reducedMotion, tourSystems.length])
  useEffect(() => {
    if (!tour || !tourSystems.length) return
    const system = tourSystems[tourStep % tourSystems.length]
    setState(s => ({ ...s, visible: [system.id], selected: [], isolate: false, explode: 0, cutaway: 0, rotate: !reducedMotion }))
  }, [tour, tourStep, reducedMotion, tourSystems.length])
  const lessons = useMemo(() => atlas && chosen ? relatedLessons(atlas, chosen) : [], [atlas, chosen])
  const readingTopics = [...new Map(selectedSystems.flatMap(id => activeReading?.[id]?.topics ?? []).map(topic => [topic.url, topic])).values()].filter(topic => topic.title.toLowerCase().includes(conditionQuery.toLowerCase().trim())).sort((a, b) => a.title.localeCompare(b.title))
  const concealed = quiz && !revealed
  const reset = () => { setTour(false); setState(s => ({ ...initial(), reset: s.reset + 1 })); setChosen(null); setQuiz(false); setTab('structures') }
  const preset = (visible: SystemId[]) => { setTour(false); setQuiz(false); setChosen(null); setState(s => ({ ...s, visible, selected: [], isolate: false, rotate: false, cutaway: 0 })) }
  const recall = () => {
    if (!atlas) return
    const pool = atlas.parts.filter(p => state.visible.includes(p.system))
    if (!pool.length) return
    const part = pool[Math.floor(Math.random() * pool.length)]
    setTour(false); setConditionQuery(''); setChosen({ id: part.conceptId, name: part.name, elements: [part.id] }); setQuiz(true); setRevealed(false); setTab('study')
    setState(s => ({ ...s, selected: [part.id], isolate: true, explode: 0, cutaway: 0, rotate: false }))
  }
  return <main className="anatomy-study">
    <header className="study-header"><div><p className="study-kicker">PALDAWN / ANATOMY LAB</p><h1>Know the body.<br className="mobile-break"/> Follow the connections.</h1></div><div className="study-header-controls"><div className="study-reference-switch" role="group" aria-label="Reference anatomy"><button aria-pressed={sex === 'male'} onClick={() => changeSex('male')}>Male reference</button><button aria-pressed={sex === 'female'} onClick={() => changeSex('female')}>Female reference</button></div><button className="study-layout-toggle" aria-pressed={researchFocus} onClick={() => setResearchFocus(v => !v)}>{researchFocus ? 'Show library' : 'Focus on research'}</button><button onClick={onClose}>Back to PalDawn ↗</button></div></header>
    <div className="study-scope">Local study candidate · Qualified anatomy and clinical review pending · {sex === 'male' ? 'BodyParts3D adult male reference · Anatomical variations are not fully represented.' : 'HRA female reference assembly · Skeleton and muscle coverage are partial; pregnancy structures are optional.'}</div>
    <div className={`study-workspace ${researchFocus ? 'research-focus' : ''}`}>
      <aside className={`study-library ${tab === 'study' ? 'mobile-hidden' : ''}`} aria-label="Anatomy library">
        <nav className="study-tabs" aria-label="Library view"><button aria-pressed={tab !== 'systems'} onClick={() => setTab('structures')}>Structures</button><button aria-pressed={tab === 'systems'} onClick={() => setTab('systems')}>System layers</button></nav>
        {tab === 'systems' ? <><p className="study-kicker">{availableSystems.length} SYSTEMS / INDIVIDUAL LAYERS</p><div className="study-presets"><button onClick={() => preset(['skeletal'])}>Skeleton</button><button onClick={() => preset(['cardiac', 'respiratory', 'digestive', 'urinary', 'reproductive', 'endocrine', 'lymphatic', 'sensory'])}>Organs</button><button onClick={() => preset(availableSystems.filter(x => x.id !== 'pregnancy').map(x => x.id))}>All</button><button onClick={() => preset([])}>Hide all</button></div>
          <details className="study-dissection"><summary>Dissection controls</summary><label className="study-label">Cutaway depth <output>{Math.round((state.cutaway ?? 0) * 100)}%</output><input aria-label="Cutaway depth" type="range" min="0" max="100" value={(state.cutaway ?? 0) * 100} onChange={e => { setTour(false); setState(s => ({ ...s, cutaway: Number(e.target.value) / 100, explode: 0, rotate: false })) }}/></label><label className="study-label">Body surface opacity<input aria-label="Body surface opacity" type="range" min="0" max="100" value={(state.surfaceOpacity ?? .1) * 100} onChange={e => setState(s => ({ ...s, surfaceOpacity: Number(e.target.value) / 100 }))}/></label><p className="study-note">Visual cutaway only. Cut surfaces are open; this is not a histology section.</p></details>
          {availableSystems.map(sys => <label className="study-system" key={sys.id}><input type="checkbox" checked={state.visible.includes(sys.id)} onChange={() => { setTour(false); setState(s => ({ ...s, rotate: false, isolate: false, selected: [], visible: s.visible.includes(sys.id) ? s.visible.filter(id => id !== sys.id) : [...s.visible, sys.id] })) }}/><i style={{ background: sys.color }}/><span>{sys.name}</span><small>{atlas?.parts.filter(p => p.system === sys.id).length ?? '—'}</small></label>)}</> : <>
          <label className="study-label" htmlFor="structure-search">Find a structure</label><input id="structure-search" type="search" placeholder="Try femur, heart, FMA7088…" value={query} onChange={e => { setQuery(e.target.value); setPage(0) }}/>
          <label className="study-label" htmlFor="structure-system">Browse system</label><select id="structure-system" value={filter} onChange={e => { setFilter(e.target.value as SystemId | 'all'); setPage(0) }}><option value="all">All available systems</option>{availableSystems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <label className="study-check"><input type="checkbox" checked={savedOnly} onChange={e => { setSavedOnly(e.target.checked); setPage(0) }}/> This session’s study list ({saved.length})</label>
          <p role="status" className="study-count">{results.length.toLocaleString()} concepts · {atlas?.parts.length.toLocaleString() ?? '…'} source meshes</p>
          <div className="study-results">{results.slice(page * 40, (page + 1) * 40).map(c => <button key={c.id} aria-pressed={chosen?.id === c.id} onClick={() => choose(c)}><strong>{c.name}</strong><span>{c.id} · {c.elements.length} {c.elements.length === 1 ? 'piece' : 'pieces'} <b>↗</b></span></button>)}{atlas && results.length === 0 ? <p>No structures match. Try another name, source ID, or system.</p> : null}</div>
          <div className="study-pagination"><button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button><span>{results.length ? page + 1 : 0} / {Math.ceil(results.length / 40)}</span><button disabled={(page + 1) * 40 >= results.length} onClick={() => setPage(p => p + 1)}>Next</button></div>
        </>}
      </aside>
      <section className="study-stage" aria-label="Anatomy viewer">
        {atlas && !textOnly && !sceneError ? <Suspense fallback={<p className="study-loading">Starting viewer…</p>}><AnatomyScene key={attempt} atlas={atlas} state={{ ...state, quality, rotate: state.rotate && !reducedMotion, reducedMotion, inspectorOpen: false, concealNames: concealed }} onSelect={choosePart} onProgress={setProgress} onError={setSceneError}/></Suspense> : null}
        <div className="study-stage-top"><span>{atlas?.parts.length.toLocaleString() ?? '…'} MESHES / {sex.toUpperCase()} / {state.isolate ? 'ISOLATED' : 'REFERENCE ANATOMY'}</span><button onClick={() => { setTour(false); setTextOnly(v => !v) }}>{textOnly ? 'Enable 3D' : 'Text study'}</button></div>
        {textOnly ? <div className="study-empty"><h2>Study without 3D</h2><p>Search every named concept, explore its pieces, and follow source-linked reading in the study panel.</p></div> : null}
        {error || sceneError ? <div role="alert" className="study-empty"><h2>Let’s recover the atlas.</h2><p>{error || sceneError}</p><button onClick={() => { setSceneError(''); setProgress(0); setAttempt(a => a + 1) }}>Retry loading</button><button onClick={() => { setSceneError(''); setTextOnly(true) }}>Continue with text</button></div> : null}
        {!textOnly && !error && !sceneError && progress < 100 ? <p className="study-loading" role="status">Loading reference anatomy · {progress}%</p> : null}
        {tour ? <div className="study-tour-caption" role="status"><span>GUIDED SYSTEM TOUR / {tourStep + 1} OF {tourSystems.length}</span><h2>{tourSystems[tourStep % tourSystems.length]?.name}</h2><p>{activeContext?.[tourSystems[tourStep % tourSystems.length]?.id]}</p></div> : null}
        <div className="study-stage-bottom"><div className="study-render-controls"><button aria-pressed={tour} disabled={!atlas || progress < 100 || textOnly} onClick={() => { setTour(v => !v); setTourStep(0); setChosen(null); setState(s => ({ ...s, rotate: false })) }}>{tour ? 'Stop tour' : 'Guided tour'}</button>{tour ? <button onClick={() => setTourStep(step => (step + 1) % tourSystems.length)}>Next system</button> : null}<button aria-pressed={quality === 'high'} onClick={() => setQuality(q => q === 'high' ? 'standard' : 'high')}>{quality === 'high' ? 'High detail' : 'Standard detail'}</button></div><nav aria-label="Anatomy camera">{(['three-quarter', 'front', 'back', 'side'] as View[]).map(view => <button key={view} aria-pressed={state.view === view} onClick={() => setState(s => ({ ...s, view, reset: s.reset + 1 }))}>{view === 'three-quarter' ? '3/4' : view}</button>)}<button disabled={reducedMotion || state.explode >= .4} aria-pressed={state.rotate} onClick={() => setState(s => ({ ...s, rotate: !s.rotate }))}>{state.rotate ? 'Pause' : 'Rotate'}</button><button onClick={reset}>Reset</button></nav>
          <label className="study-explode">Separate the anatomy <output>{Math.round(state.explode * 100)}%</output><input aria-label="Explode anatomy" type="range" min="0" max="100" value={state.explode * 100} onChange={e => { setTour(false); setState(s => ({ ...s, explode: Number(e.target.value) / 100, cutaway: 0, isolate: false, rotate: false })) }}/><span>Assembled <b>Every visible piece</b></span></label><p>Drag to {state.explode > .8 ? 'pan' : 'orbit'} · Scroll or pinch to zoom · Select to study</p>
        </div>
      </section>
      <aside className={`study-inspector ${tab !== 'study' ? 'mobile-hidden' : ''}`} aria-label="Structure study">
        <p className="study-kicker">STRUCTURE → SYSTEM → CONDITION</p>
        <h2 ref={title} tabIndex={-1}>{concealed ? 'Name this structure' : chosen?.name ?? 'Start with one structure.'}</h2>
        {chosen ? <>
          {concealed ? <><p>Use its shape and position to recall its name.</p><button onClick={() => setRevealed(true)}>Reveal answer</button></> : <>
            <p className="study-meta">{chosen.id} · {selectedParts.length} source {selectedParts.length === 1 ? 'mesh' : 'meshes'}</p>
            <div className="study-actions"><button aria-pressed={state.isolate} onClick={() => setState(s => ({ ...s, isolate: !s.isolate, selected: chosen.elements, explode: 0 }))}>{state.isolate ? 'Show surroundings' : 'Isolate structure'}</button><button aria-pressed={saved.includes(chosen.id)} onClick={() => setSaved(s => s.includes(chosen.id) ? s.filter(id => id !== chosen.id) : [...s, chosen.id])}>{saved.includes(chosen.id) ? 'Remove from study list' : 'Add to study list'}</button><button onClick={() => { setChosen(null); setQuiz(false); setState(s => ({ ...s, selected: [], isolate: false })) }}>Clear selection</button></div>
            <details><summary>Structure overview & system context</summary><h3>{activeStructures?.[chosen.name.toLowerCase()] ? 'Structure overview' : 'System context'}</h3>
            <p>{activeStructures?.[chosen.name.toLowerCase()] ?? selectedSystems.map(id => activeContext?.[id]).filter(Boolean).join(' ')}</p><p className="study-note">Adapted Human Atlas context · Unreviewed. A system overview does not describe every individual structure.</p>
            </details><ResearchDesk atlas={atlas} chosen={chosen} onChoose={choose} queue={queue} onQueue={next => { readingQueue = next; setQueue(next) }}/>
            <details><summary>Existing PalDawn disease pathways ({lessons.length})</summary><h3>Linked ailment pathways</h3><p className="study-note">Organ-level learning connections from existing PalDawn lessons. They do not establish disease involvement of this exact mesh.</p>
            {lessons.length ? lessons.map(({ disease, stepIndex, bodyPart, sources }) => <article className="study-lesson" key={disease.id}><button onClick={() => { useAtlas.getState().openDisease(disease.id); useAtlas.getState().setTarget(disease.id, stepIndex, bodyPart); onClose() }}>{disease.title} ↗<small>{disease.steps[stepIndex].label}</small></button>{sources.map(source => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.organization} · {source.title} ↗</a>)}</article>) : <p>No organ-level PalDawn pathway is mapped here yet. Explore the system reading below.</p>}
            </details><details><summary>Full system reading directory</summary><h3>Conditions & further reading</h3><p className="study-note">System-level reading directories, not a complete list of ailments for this structure.</p>
            <label className="study-label" htmlFor="condition-search">Find a reading topic</label><input id="condition-search" type="search" placeholder="Search conditions and topics…" value={conditionQuery} onChange={e => setConditionQuery(e.target.value)}/><p className="study-note" role="status">{readingTopics.length} source-linked topics for these systems</p><div className="study-topic-list">{readingTopics.map(topic => <a key={topic.url} href={topic.url} target="_blank" rel="noreferrer">{topic.title} ↗</a>)}</div>
            {selectedSystems.map(id => <a className="study-reading" key={id} href={`https://medlineplus.gov/${sex === 'female' && id === 'reproductive' ? 'femalereproductivesystem.html' : SYSTEM_READING[id].path}`} target="_blank" rel="noreferrer">{sex === 'female' && id === 'reproductive' ? 'Female reproductive health' : SYSTEM_READING[id].title} ↗</a>)}
            <a className="study-reading" href={`https://medlineplus.gov/search/?query=${encodeURIComponent(chosen.name + ' disorders')}`} target="_blank" rel="noreferrer">Search MedlinePlus for {chosen.name} ↗</a>
            <p className="study-note">Source: MedlinePlus, National Library of Medicine. Reading links open externally.</p>
            </details><details><summary>Included source pieces ({selectedParts.length})</summary><div className="study-members">{selectedParts.map(p => <button key={p.id} onClick={() => choosePart(p.id)}>{p.name}<small>{p.id}</small></button>)}</div></details>
          </>}
          {quiz && revealed ? <button onClick={recall}>Next recall card</button> : null}
        </> : <p>Select any part of the model or search the full inventory. Then move from its source identity to organ-level pathways and further reading.</p>}
        {!chosen ? <ResearchDesk atlas={atlas} chosen={null} onChoose={choose} queue={queue} onQueue={next => { readingQueue = next; setQueue(next) }}/> : null}
        <div className="study-recall"><h3>Practice recall</h3><p>Identify one visible structure, then reveal its source name. This is self-study, not an assessed exam.</p><button disabled={!atlas || !state.visible.length || textOnly || Boolean(sceneError) || progress < 100} onClick={recall}>Identify a structure</button></div>
        <details className="study-credits"><summary>Coverage, sources & credits</summary><p>{atlas?.concepts.length.toLocaleString() ?? '…'} named concepts can group multiple meshes. {sex === 'male' ? 'The adult male reference does not cover female-specific anatomy.' : 'The female reference assembly has partial skeleton and muscle coverage. Eight pregnancy reference meshes are hidden by default.'} Developmental stages and many variations remain outside these datasets. Ailment coverage is incomplete.</p><p>Viewer adapted from <a href="https://github.com/ashemag/human-atlas" target="_blank" rel="noreferrer">Human Atlas by ashemag</a> (MIT). BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International. Female reference: Kristen Browne and Heidi Schlehlein, Human Reference Atlas / HuBMAP, 3D Reference Organ Set for Female v1.5 (2023), CC BY 4.0.</p><a href={`${import.meta.env.BASE_URL}anatomy/ATTRIBUTION.md`} target="_blank" rel="noreferrer">Full anatomy attribution and adaptations</a><p>PalDawn adds its own study interface, recall practice, session list and disease-pathway navigation. Education only; not diagnosis or clinical guidance.</p></details>
      </aside>
    </div>
    <nav className="study-mobile-nav" aria-label="Study panels"><button aria-pressed={tab === 'structures'} onClick={() => setTab('structures')}>Search</button><button aria-pressed={tab === 'systems'} onClick={() => setTab('systems')}>Systems</button><button aria-pressed={tab === 'study'} onClick={() => setTab('study')}>Study</button></nav>
  </main>
}
