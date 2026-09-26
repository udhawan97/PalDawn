import { useMemo, useState } from 'react'
import type { Atlas, Concept } from './anatomy'
import { ALL_CONDITIONS, ALL_RESEARCH_TOPICS, RESEARCH_TRACKS, SOURCE_CHECKED, exportReadingPlan, researchContext, searchReading, suggestedTracks, trackConcepts, type ReadingTopic } from './research'
import type { AnatomyReadingItem } from './studyStorage'
import './research.css'

type Props = { atlas: Atlas | null; chosen: Concept | null; onChoose: (concept: Concept) => void; queue: AnatomyReadingItem[]; onQueue: (queue: AnatomyReadingItem[]) => boolean }
export default function ResearchDesk({ atlas, chosen, onChoose, queue, onQueue }: Props) {
  const suggested = useMemo(() => atlas && chosen ? suggestedTracks(atlas, chosen) : null, [atlas, chosen])
  const [manual, setManual] = useState('')
  const [view, setView] = useState<'function' | 'conditions' | 'queue'>('function')
  const [query, setQuery] = useState('')
  const [allAreas, setAllAreas] = useState(false)
  const [compact, setCompact] = useState(false)
  const [queueFilter, setQueueFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [notice, setNotice] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const { track, scope } = researchContext(suggested, manual)
  const concepts = atlas ? trackConcepts(atlas, track) : []
  const functionTopic = { id: `function:${track.id}`, title: track.function.title, url: track.function.url }
  const normalizedQuery = query.toLowerCase().trim()
  const queueEntries = queue.flatMap(item => {
    const topic = ALL_RESEARCH_TOPICS.find(candidate => candidate.id === item.id) ?? null
    const searchable = topic?.title ?? item.id
    const matchesRead = queueFilter === 'all' || (queueFilter === 'read' ? item.read : !item.read)
    return matchesRead && searchable.toLowerCase().includes(normalizedQuery) ? [{ item, topic }] : []
  })
  const readCount = queue.filter(item => item.read).length
  const unreadCount = queue.length - readCount
  const nextUnread = queue.flatMap(item => {
    if (item.read) return []
    const topic = ALL_RESEARCH_TOPICS.find(candidate => candidate.id === item.id)
    return topic ? [topic] : []
  })[0]
  const unavailableQueueCount = queue.filter(item => !ALL_RESEARCH_TOPICS.some(topic => topic.id === item.id)).length
  const topics = searchReading(allAreas ? ALL_CONDITIONS : track.conditions, query)
  const toggle = (topic: ReadingTopic) => {
    const exists = queue.some(item => item.id === topic.id)
    if (!onQueue(exists ? queue.filter(item => item.id !== topic.id) : [...queue, { id: topic.id, read: false }])) {
      setNotice('Reading was not added. Remove a saved reading to make room.')
      return
    }
    setNotice(`${topic.title} ${exists ? 'removed from' : 'added to'} your reading queue.`)
  }
  const updateQueueItem = (id: string, update: (item: AnatomyReadingItem, index: number) => AnatomyReadingItem[] | AnatomyReadingItem) => {
    const index = queue.findIndex(item => item.id === id)
    if (index < 0) return
    const next = [...queue]
    const result = update(next[index], index)
    if (Array.isArray(result)) onQueue(result)
    else { next[index] = result; onQueue(next) }
  }
  const moveQueueItem = (id: string, direction: -1 | 1) => updateQueueItem(id, (_item, index) => {
    const target = index + direction
    if (target < 0 || target >= queue.length) return queue
    const next = [...queue]
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  })
  const download = () => {
    const url = URL.createObjectURL(new Blob([exportReadingPlan(queue.map(item => item.id))], { type: 'text/markdown;charset=utf-8' }))
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
    <nav className="research-tabs" aria-label="Research view">{(['function', 'conditions', 'queue'] as const).map(v => <button key={v} aria-pressed={view === v} onClick={() => { setView(v); setQuery(''); setConfirmClear(false) }}>{v === 'function' ? 'How it works' : v === 'conditions' ? `Conditions (${allAreas ? ALL_CONDITIONS.length : track.conditions.length})` : `Queue (${queue.length})`}</button>)}</nav>
    {view === 'function' ? <>
      <article className="research-question"><span>FUNCTION / {track.title.toUpperCase()}</span><h4>{track.function.title}</h4><p>{track.function.overview}</p><div className="research-prompt"><span>QUESTION TO INVESTIGATE</span><p>{track.prompt}</p></div><a href={track.function.url} target="_blank" rel="noreferrer">Read the foundation · {track.function.publisher} ↗</a><button aria-pressed={queue.some(item => item.id === functionTopic.id)} onClick={() => toggle(functionTopic)}>{queue.some(item => item.id === functionTopic.id) ? 'Remove question from queue' : 'Save this question'}</button></article>
      <div className="research-method"><h4>Build an explanation</h4><ol><li>Sketch the normal function.</li><li>Choose a condition and identify what changes.</li><li>Find evidence that tests your explanation.</li></ol><a href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(track.title + ' physiology review')}`} target="_blank" rel="noreferrer">Search physiology reviews on PubMed ↗</a></div>
      <button className="research-next" onClick={() => setView('conditions')}>Explore {track.conditions.length} related conditions →</button>
    </> : <>
      <div className="research-list-tools"><label className="study-label" htmlFor="research-query">{view === 'queue' ? 'Search your queue' : 'Find a condition'}</label><input id="research-query" type="search" placeholder={view === 'queue' ? 'Search saved titles…' : 'Filter this body area…'} value={query} onChange={e => setQuery(e.target.value)}/>{view === 'queue' ? <><p className="study-note">Saved locally across both references. Read marks are personal study markers, not assessment.</p><div className="research-queue-summary" aria-label="Reading queue progress"><strong>{readCount} read</strong><span>{unreadCount} unread</span></div><div className="research-queue-filters" role="group" aria-label="Filter reading queue">{(['all', 'unread', 'read'] as const).map(value => <button key={value} aria-pressed={queueFilter === value} onClick={() => setQueueFilter(value)}>{value === 'all' ? `All ${queue.length}` : value === 'unread' ? `Unread ${unreadCount}` : `Read ${readCount}`}</button>)}</div>{nextUnread ? <a className="research-next-unread" href={nextUnread.url} target="_blank" rel="noreferrer">Continue next unread · {nextUnread.title} ↗</a> : null}<button disabled={!queue.length} onClick={download}>Export reading plan ↓</button>{confirmClear ? <><button onClick={() => { onQueue([]); setConfirmClear(false); setNotice('Reading queue cleared from this browser.') }}>Confirm clear queue</button><button onClick={() => setConfirmClear(false)}>Cancel</button></> : <button disabled={!queue.length} onClick={() => setConfirmClear(true)}>Clear reading queue</button>}</> : <><label className="study-check research-all"><input type="checkbox" checked={allAreas} onChange={e => setAllAreas(e.target.checked)}/> Search all {ALL_CONDITIONS.length} conditions</label><p className="study-note">Study associations, not diagnoses or claims about the selected mesh. Source introductions open externally.</p></>}</div>
      <p className="study-note" role="status">{view === 'queue' ? `${queueEntries.length} saved readings${unavailableQueueCount ? ` · ${unavailableQueueCount} unavailable preserved` : ''}` : `${topics.length} condition topics`}</p>
      {view === 'queue' ? <div className="research-cards research-queue">{queueEntries.map(({ item, topic }) => { const queueIndex = queue.findIndex(candidate => candidate.id === item.id); return topic ? <article key={topic.id} data-read={item.read}><div><a href={topic.url} target="_blank" rel="noreferrer">{topic.title} ↗</a><button aria-label={`Remove ${topic.title}`} onClick={() => onQueue(queue.filter(candidate => candidate.id !== item.id))}>−</button></div><div className="research-queue-actions"><button aria-pressed={item.read} onClick={() => updateQueueItem(item.id, current => ({ ...current, read: !current.read }))}>{item.read ? 'Read ✓' : 'Mark read'}</button><button disabled={queueIndex === 0} onClick={() => moveQueueItem(item.id, -1)}>Move up</button><button disabled={queueIndex === queue.length - 1} onClick={() => moveQueueItem(item.id, 1)}>Move down</button></div><a className="research-literature" href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(topic.title + ' review')}`} target="_blank" rel="noreferrer">Find review literature on PubMed ↗</a></article> : <article className="research-unavailable" key={item.id} data-read={item.read}><div><strong>Unavailable saved reading</strong><button aria-label={`Remove unavailable ${item.id}`} onClick={() => onQueue(queue.filter(candidate => candidate.id !== item.id))}>−</button></div><p>{item.id}</p><div className="research-queue-actions"><button aria-pressed={item.read} onClick={() => updateQueueItem(item.id, current => ({ ...current, read: !current.read }))}>{item.read ? 'Read ✓' : 'Mark read'}</button><button disabled={queueIndex === 0} onClick={() => moveQueueItem(item.id, -1)}>Move up</button><button disabled={queueIndex === queue.length - 1} onClick={() => moveQueueItem(item.id, 1)}>Move down</button></div><p className="study-note">Preserved for backup recovery; no current topic was substituted.</p></article>})}</div> : <div className="research-cards">{topics.map(topic => <article key={topic.id}><div><a href={topic.url} target="_blank" rel="noreferrer">{topic.title} ↗</a><button aria-label={`${queue.some(item => item.id === topic.id) ? 'Remove' : 'Save'} ${topic.title}`} aria-pressed={queue.some(item => item.id === topic.id)} onClick={() => toggle(topic)}>{queue.some(item => item.id === topic.id) ? '−' : '+'}</button></div><a className="research-literature" href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(topic.title + ' review')}`} target="_blank" rel="noreferrer">Find review literature on PubMed ↗</a></article>)}</div>}
      {(view === 'queue' ? queueEntries.length : topics.length) === 0 ? <div className="research-empty"><p>{query ? 'No titles match your search.' : 'Your reading queue is empty. Save a function question or condition to build your plan.'}</p>{query ? <button onClick={() => setQuery('')}>Clear search</button> : <button onClick={() => setView('conditions')}>Browse conditions</button>}</div> : null}
    </>}
    <p className="research-notice" role="status">{notice}</p>
    <p className="study-note research-source-note">Source links checked {SOURCE_CHECKED}. Explanations and questions are unreviewed educational synthesis. PubMed links are searches, not appraised evidence.</p>
  </section>
}
