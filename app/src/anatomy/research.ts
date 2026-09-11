import catalog from './researchCatalog.json'
import type { Atlas, Concept, SystemId } from './anatomy'

export type ReadingTopic = { id: string; title: string; url: string }
export const RESEARCH_TRACKS = catalog.tracks
export type ResearchTrack = typeof RESEARCH_TRACKS[number]
export const SOURCE_CHECKED = catalog.checked

// IDs identify source concepts only. Membership offers reading context, never a disease assertion.
export function trackConcepts(atlas: Atlas, track: ResearchTrack): Concept[] {
  return atlas.concepts.filter(c => track.anchors.includes(c.id))
}
export function suggestedTracks(atlas: Atlas, selected: Concept) {
  const elements = new Set(selected.elements)
  const exact = RESEARCH_TRACKS.filter(track => trackConcepts(atlas, track).some(c => c.elements.some(id => elements.has(id))))
  if (exact.length) return { tracks: exact, scope: 'Organ-level study connection' }
  const systems = new Set(atlas.parts.filter(p => elements.has(p.id)).map(p => p.system))
  return { tracks: RESEARCH_TRACKS.filter(t => t.systems.some(s => systems.has(s as SystemId))), scope: 'Broader system reading · no exact organ mapping' }
}
export function researchContext(suggested: ReturnType<typeof suggestedTracks> | null, manual: string) {
  const chosenArea = RESEARCH_TRACKS.find(t => t.id === manual)
  return {
    track: chosenArea ?? suggested?.tracks[0] ?? RESEARCH_TRACKS[0],
    scope: chosenArea ? 'Your chosen reading area' : suggested?.tracks.length ? suggested.scope : suggested ? 'Browse independently · no study connection mapped' : 'Choose a body area to begin',
  }
}
export function searchReading(topics: ReadingTopic[], query: string) {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean)
  return topics.filter(topic => terms.every(term => topic.title.toLocaleLowerCase().includes(term)))
}
export const ALL_RESEARCH_TOPICS: ReadingTopic[] = [...new Map(RESEARCH_TRACKS.flatMap(track => [
  { id: `function:${track.id}`, title: track.function.title, url: track.function.url }, ...track.conditions,
]).map(topic => [topic.id, topic])).values()]

export const ALL_CONDITIONS = ALL_RESEARCH_TOPICS.filter(t => !t.id.startsWith('function:'))

export function exportReadingPlan(ids: string[]) {
  const topics = ids.flatMap(id => { const topic = ALL_RESEARCH_TOPICS.find(t => t.id === id); return topic ? [topic] : [] })
  return ['# PalDawn reading plan', '', 'Personal study prompts and external reading. Unreviewed; not clinical guidance.', '',
    ...topics.flatMap(topic => [`## ${topic.title}`, '', `Source: ${topic.url}`, '',
      ...(topic.id.startsWith('function:') ? [RESEARCH_TRACKS.find(t => `function:${t.id}` === topic.id)!.prompt, ''] : []),
      '- What is the normal function?', '- What mechanism changes?', '- What does the evidence support, and what remains uncertain?', '']),
  ].join('\n')
}
