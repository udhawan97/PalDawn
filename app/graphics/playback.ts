import { teachingTime } from './sceneFrame.ts'

export type Playback = { time: number; playing: boolean; inspecting: boolean; reduced: boolean; text: boolean; status: 'ready' | 'pending' | 'failed'; requestId: number; pendingTime: number | null }
export const INITIAL_PLAYBACK: Playback = { time: 0, playing: false, inspecting: false, reduced: false, text: false, status: 'ready', requestId: 0, pendingTime: null }
export type PlaybackEvent = { type: 'play' | 'pause' | 'inspect' | 'return' | 'hidden' | 'restart' } | { type: 'seek' | 'request'; time: number } | { type: 'tick'; delta: number } | { type: 'reduced' | 'text'; value: boolean } | { type: 'settled'; requestId: number; ok: boolean }
export function playback(state: Playback, event: PlaybackEvent): Playback {
  switch (event.type) {
    case 'play': return state.status === 'ready' && !state.inspecting && !state.reduced && !state.text && state.time < 12 ? { ...state, playing: true } : state
    case 'pause': case 'hidden': return { ...state, playing: false }
    case 'inspect': return { ...state, playing: false, inspecting: true }
    case 'return': return { ...state, playing: false, inspecting: false }
    case 'reduced': return { ...state, reduced: event.value, playing: event.value ? false : state.playing }
    case 'text': return { ...state, text: event.value, playing: false }
    case 'restart': return { ...state, time: 0, playing: false, inspecting: false, status: 'ready', requestId: state.requestId + 1, pendingTime: null }
    case 'seek': return { ...state, time: teachingTime(event.time), playing: false, inspecting: false, status: 'ready', requestId: state.requestId + 1, pendingTime: null }
    case 'request': return { ...state, playing: false, status: 'pending', requestId: state.requestId + 1, pendingTime: teachingTime(event.time) }
    case 'settled': return event.requestId !== state.requestId || state.status !== 'pending' ? state : event.ok ? { ...state, time: state.pendingTime!, status: 'ready', pendingTime: null, inspecting: false, playing: false } : { ...state, status: 'failed', playing: false }
    case 'tick': {
      if (!Number.isFinite(event.delta) || event.delta < 0) throw new Error('Invalid playback delta')
      if (!state.playing || state.status !== 'ready' || state.inspecting || state.reduced || state.text) return state
      const time = teachingTime(state.time + Math.min(.25, event.delta))
      return { ...state, time, playing: time < 12 }
    }
  }
}
