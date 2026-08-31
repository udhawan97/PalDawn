let registration: ServiceWorkerRegistration | null = null
let refreshing = false
let installPrompt: BeforeInstallPromptEvent | null = null

const UPDATE_REQUEST_MESSAGE = 'PALDAWN_REQUEST_UPDATE'
const UPDATE_ACTIVATED_MESSAGE = 'PALDAWN_UPDATE_ACTIVATED'
const UPDATE_RELOAD_SESSION_KEY = 'paldawn:pwa-update-reload:v1'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type PwaInstallState = 'available' | 'installed' | 'instructions'
export type PwaUpdateCheckResult = 'checked' | 'unavailable' | 'failed'

const isStandalone = (): boolean =>
  window.matchMedia?.('(display-mode: standalone)').matches === true ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

const dispatch = (name: 'update-ready' | 'offline-ready'): void => {
  window.dispatchEvent(new CustomEvent(`paldawn:${name}`))
}

const updateRequestId = (): string => {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }
}

const consumeUpdateReload = (requestId: string): boolean => {
  if (refreshing) return false
  try {
    if (window.sessionStorage.getItem(UPDATE_RELOAD_SESSION_KEY) === requestId) return false
    window.sessionStorage.setItem(UPDATE_RELOAD_SESSION_KEY, requestId)
  } catch {
    // The activation broadcast is one-shot; in-memory protection still prevents duplicates.
  }
  refreshing = true
  return true
}

export function registerPwa(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    installPrompt = event as BeforeInstallPromptEvent
    window.dispatchEvent(new CustomEvent('paldawn:install-ready'))
  })
  window.addEventListener('appinstalled', () => {
    installPrompt = null
    window.dispatchEvent(new CustomEvent('paldawn:app-installed'))
  })

  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== UPDATE_ACTIVATED_MESSAGE) return
    const requestId = event.data.requestId
    if (typeof requestId !== 'string' || requestId.length === 0 || requestId.length > 128) return
    if (!consumeUpdateReload(requestId)) return
    window.location.reload()
  })

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    }).then((nextRegistration) => {
      registration = nextRegistration
      if (registration.waiting) dispatch('update-ready')

      registration.addEventListener('updatefound', () => {
        const worker = registration?.installing
        worker?.addEventListener('statechange', () => {
          if (worker.state !== 'installed') return
          if (navigator.serviceWorker.controller) dispatch('update-ready')
          else dispatch('offline-ready')
        })
      })
    }).catch(() => {
      // The network remains the fallback; installation must never block the voyage.
    })
  }, { once: true })
}

export function getPwaInstallState(): PwaInstallState {
  if (isStandalone()) return 'installed'
  return installPrompt ? 'available' : 'instructions'
}

export async function requestPwaInstall(): Promise<'accepted' | 'dismissed' | 'instructions' | 'installed'> {
  if (isStandalone()) return 'installed'
  if (!installPrompt) return 'instructions'

  const prompt = installPrompt
  try {
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    installPrompt = null
    return outcome
  } catch {
    installPrompt = null
    return 'instructions'
  }
}

export function activatePwaUpdate(): void {
  const waiting = registration?.waiting
  if (!waiting) return
  waiting.postMessage({ type: UPDATE_REQUEST_MESSAGE, requestId: updateRequestId() })
}

export async function checkForPwaUpdate(): Promise<PwaUpdateCheckResult> {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return 'unavailable'

  try {
    const currentRegistration = registration ?? await navigator.serviceWorker.getRegistration(
      new URL(import.meta.env.BASE_URL, window.location.href).href,
    )
    if (!currentRegistration) return 'unavailable'
    registration = currentRegistration
    await currentRegistration.update()
    return 'checked'
  } catch {
    return 'failed'
  }
}
