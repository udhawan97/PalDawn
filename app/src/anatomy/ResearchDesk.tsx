import { useMemo, useState } from 'react'
import type { Atlas, Concept } from './anatomy'
import { ALL_CONDITIONS, ALL_RESEARCH_TOPICS, RESEARCH_TRACKS, SOURCE_CHECKED, exportReadingPlan, researchContext, searchReading, suggestedTracks, trackConcepts, type ReadingTopic } from './research'
import './research.css'

type Props = { atlas: Atlas | null; chosen: Concept | null; onChoose: (concept: Concept) => void; queue: string[]; onQueue: (queue: string[]) => void }
export default function ResearchDesk({ atlas, chosen, onChoose, queue, onQueue }: Props) {
  const suggested = useMemo(() => atlas && chosen ? suggestedTracks(atlas, chosen) : null, [atlas, chosen])
  const [manual, setManual] = useState('')
  const [view, setView] = useState<'function' | 'conditions' | 'queue'>('function')
  const [query, setQuery] = useState('')
  const [allAreas, setAllAreas] = useState(false)
  const [compact, setCompact] = useState(false)
  const [notice, setNotice] = useState('')
  const { track, scope } = researchContext(suggested, manual)
  const concepts = atlas ? trackConcepts(atlas, track) : []
  const functionTopic = { id: `function:${track.id}`, title: track.function.title, url: track.function.url }
  const topics = searchReading(view === 'queue' ? queue.flatMap(id => { const topic = ALL_RESEARCH_TOPICS.find(t => t.id === id); return topic ? [topic] : [] }) : allAreas ? ALL_CONDITIONS : track.conditions, query)
  const toggle = (topic: ReadingTopic) => {
    const exists = queue.includes(topic.id)
    onQueue(exists ? queue.filter(id => id !== topic.id) : [...queue, topic.id])
    setNotice(`${topic.title} ${exists ? 'removed from' : 'added to'} your reading queue.`)
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([exportReadingPlan(queue)], { type: 'text/markdown;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'paldawn-reading-plan.md'; a.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice('Reading plan exported.')
  }
  return <section className={`research-desk ${compact ? 'research-compact' : ''}`} aria-label="Body-part research desk">
    <div className="research-heading"><div><p className="study-kicker">YOUR RESEARCH DESK</p><h3>From structure to question.</h3></div><button aria-pressed={compact} onClick={() => setCompact(v => !v)} aria-label="Compact reading cards">↕</button></div>
    <label className="study-label" htmlFor="research-area">Explore a body area · {RESEARCH_TRACKS.length} study tracks</label>
    <select id="research-area" value={track.id} onChange={e => { setManual(e.target.value); setQuery(''); setNotice('') }}>{RESEARCH_TRACKS.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
    <div className="research-context"><p>{scope}</p>{manual && chosen ? <button onClick={() => { setManual(''); setQuery('') }}>Follow selection</button> : null}</div>
    {suggested && !manual && suggested.tracks.length > 1 ? <div className="research-related" aria-label="Related study areas">{suggested.tracks.map(t => <button key={t.id} aria-pressed={track.id === t.id} onClick={() => { setManual(t.id); setQuery('') }}>{t.title}</button>)}</div> : null}
    <div className="research-locate">{concepts.length ? concepts.map(c => <button key={c.id} onClick={() => onChoose(c)}>Locate {c.name} ↗</button>) : <p className="study-note">Reading is available. No specific organ locator is mapped in this reference.</p>}</div>
    <nav className="research-tabs" aria-label="Research view">{(['function', 'conditions', 'queue'] as const).map(v => <button key={v} aria-pressed={view === v} onClick={() => { setView(v); setQuery('') }}>{v === 'function' ? 'How it works' : v === 'conditions' ? `Conditions (${allAreas ? ALL_CONDITIONS.length : track.conditions.length})` : `Queue (${queue.length})`}</button>)}</nav>
    {view === 'function' ? <>
      <article className="research-question"><span>FUNCTION / {track.title.toUpperCase()}</span><h4>{track.function.title}</h4><p>{track.function.overview}</p><div className="research-prompt"><span>QUESTION TO INVESTIGATE</span><p>{track.prompt}</p></div><a href={track.function.url} target="_blank" rel="noreferrer">Read the foundation · {track.function.publisher} ↗</a><button aria-pressed={queue.includes(functionTopic.id)} onClick={() => toggle(functionTopic)}>{queue.includes(functionTopic.id) ? 'Remove question from queue' : 'Save this question'}</button></article>
      <div className="research-method"><h4>Build an explanation</h4><ol><li>Sketch the normal function.</li><li>Choose a condition and identify what changes.</li><li>Find evidence that tests your explanation.</li></ol><a href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(track.title + ' physiology review')}`} target="_blank" rel="noreferrer">Search physiology reviews on PubMed ↗</a></div>
      <button className="research-next" onClick={() => setView('conditions')}>Explore {track.conditions.length} related conditions →</button>
    </> : <>
      <div className="research-list-tools"><label className="study-label" htmlFor="research-query">{view === 'queue' ? 'Search your queue' : 'Find a condition'}</label><input id="research-query" type="search" placeholder={view === 'queue' ? 'Search saved titles…' : 'Filter this body area…'} value={query} onChange={e => setQuery(e.target.value)}/>{view === 'queue' ? <><p className="study-note">Kept for this session, across both references. Export before reloading.</p><button disabled={!queue.length} onClick={download}>Export reading plan ↓</button></> : <><label className="study-check research-all"><input type="checkbox" checked={allAreas} onChange={e => setAllAreas(e.target.checked)}/> Search all {ALL_CONDITIONS.length} conditions</label><p className="study-note">Study associations, not diagnoses or claims about the selected mesh. Source introductions open externally.</p></>}</div>
      <p className="study-note" role="status">{topics.length} {view === 'queue' ? 'saved readings' : 'condition topics'}</p>
      <div className="research-cards">{topics.map(topic => <article key={topic.id}><div><a href={topic.url} target="_blank" rel="noreferrer">{topic.title} ↗</a><button aria-label={`${queue.includes(topic.id) ? 'Remove' : 'Save'} ${topic.title}`} aria-pressed={queue.includes(topic.id)} onClick={() => toggle(topic)}>{queue.includes(topic.id) ? '−' : '+'}</button></div><a className="research-literature" href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(topic.title + ' review')}`} target="_blank" rel="noreferrer">Find review literature on PubMed ↗</a></article>)}</div>
      {!topics.length ? <div className="research-empty"><p>{query ? 'No titles match your search.' : 'Your reading queue is empty. Save a function question or condition to build your plan.'}</p>{query ? <button onClick={() => setQuery('')}>Clear search</button> : <button onClick={() => setView('conditions')}>Browse conditions</button>}</div> : null}
    </>}
    <p className="research-notice" role="status">{notice}</p>
    <p className="study-note research-source-note">Source links checked {SOURCE_CHECKED}. Explanations and questions are unreviewed educational synthesis. PubMed links are searches, not appraised evidence.</p>
  </section>
}
