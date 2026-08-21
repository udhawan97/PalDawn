import { copyText } from './downloads'

export interface SharePayload {
  title: string
  text: string
  url?: string
}

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'unavailable'

export async function shareOrCopy(payload: SharePayload): Promise<ShareOutcome> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(payload)
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      // A failed native share still gets the same user-triggered local copy fallback.
    }
  }

  const text = [payload.text, payload.url].filter(Boolean).join('\n\n')
  return await copyText(text) ? 'copied' : 'unavailable'
}
