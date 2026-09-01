let registration: ServiceWorkerRegistration | null = null
let refreshing = false
let installPrompt: BeforeInstallPromptEvent | null = null

const UPDATE_REQUEST_MESSAGE = 'PALDAWN_REQUEST_UPDATE'
const UPDATE_PREPARE_MESSAGE = 'PALDAWN_PREPARE_UPDATE'
const UPDATE_PREPARED_MESSAGE = 'PALDAWN_UPDATE_PREPARED'
const UPDATE_CANCEL_MESSAGE = 'PALDAWN_CANCEL_UPDATE'
const UPDATE_RELOAD_MESSAGE = 'PALDAWN_REQUEST_RELOAD'
const UPDATE_ACTIVATED_MESSAGE = 'PALDAWN_UPDATE_ACTIVATED'
const UPDATE_BLOCKED_MESSAGE = 'PALDAWN_UPDATE_BLOCKED'
const UPDATE_RELOAD_SESSION_KEY = 'paldawn:pwa-update-reload:v1'
const ACTIVATION_WATCHDOG_MS = 6_000

const updatePreparations = new Set<() => boolean | Promise<boolean>>()
const abandonedUpdateRequests = new Set<string>()
let activeUpdateRequestId: string | null = null
let activationWatchdog: number | null = null

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type PwaInstallState = 'available' | 'installed' | 'instructions'
export type PwaUpdateCheckResult = 'checked' | 'unavailable' | 'failed'
export type PwaUpdateBlockReason = 'activation-timeout' | 'busy' | 'changed' | 'failed' | 'late' | 'legacy' | 'timeout' | 'unsaved'

export interface PwaUpdateBlockedDetail {
  requestId: string
  reason: PwaUpdateBlockReason
}

const isStandalone = (): boolean =>
  window.matchMedia?.('(display-mode: standalone)').matches === true ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

const dispatch = (name: 'update-ready' | 'offline-ready'): void => {
  window.dispatchEvent(new CustomEvent(`paldawn:${name}`))
}

const validRequestId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 128

const isScopedServiceWorker = (source: MessageEventSource | null): source is ServiceWorker => {
  if (!(source instanceof ServiceWorker)) return false
  try {
    const scriptUrl = new URL(source.scriptURL)
    const scopeUrl = new URL(import.meta.env.BASE_URL, window.location.href)
    return scriptUrl.origin === window.location.origin && scriptUrl.href.startsWith(scopeUrl.href)
  } catch {
    return false
  }
}

const setUpdateHandoff = (active: boolean): void => {
  document.body.inert = active
  if (active) document.documentElement.dataset.pwaUpdateHandoff = 'true'
  else delete document.documentElement.dataset.pwaUpdateHandoff
}

const clearActivationWatchdog = (): void => {
  if (activationWatchdog !== null) window.clearTimeout(activationWatchdog)
  activationWatchdog = null
}

const dispatchUpdateBlocked = (requestId: string, reason: PwaUpdateBlockReason): void => {
  clearActivationWatchdog()
  activeUpdateRequestId = null
  setUpdateHandoff(false)
  window.dispatchEvent(new CustomEvent<PwaUpdateBlockedDetail>('paldawn:update-blocked', {
    detail: { requestId, reason },
  }))
}

const beginUpdateHandoff = (requestId: string): void => {
  clearActivationWatchdog()
  activeUpdateRequestId = requestId
  setUpdateHandoff(true)
}

const watchForActivation = (worker: ServiceWorker, requestId: string): void => {
  clearActivationWatchdog()
  activationWatchdog = window.setTimeout(() => {
    if (activeUpdateRequestId !== requestId) return
    abandonedUpdateRequests.add(requestId)
    if (abandonedUpdateRequests.size > 8) {
      abandonedUpdateRequests.delete(abandonedUpdateRequests.values().next().value as string)
    }
    try {
      worker.postMessage({ type: UPDATE_CANCEL_MESSAGE, requestId })
    } catch {
      // The local watchdog still restores the page when the worker is no longer reachable.
    }
    dispatchUpdateBlocked(requestId, 'activation-timeout')
  }, ACTIVATION_WATCHDOG_MS)
}

const prepareUpdate = async (worker: ServiceWorker, requestId: string): Promise<void> => {
  beginUpdateHandoff(requestId)
  let ready = updatePreparations.size > 0
  for (const preparation of updatePreparations) {
    try {
      if (!await preparation()) ready = false
    } catch {
      ready = false
    }
  }
  try {
    worker.postMessage({ type: UPDATE_PREPARED_MESSAGE, requestId, ready })
    if (activeUpdateRequestId === requestId) watchForActivation(worker, requestId)
  } catch {
    if (activeUpdateRequestId === requestId) dispatchUpdateBlocked(requestId, 'failed')
  }
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
    const data = event.data
    if (!data || typeof data !== 'object') return
    const requestId = data.requestId
    if (!validRequestId(requestId)) return
    if (!isScopedServiceWorker(event.source)) return

    if (data.type === UPDATE_PREPARE_MESSAGE) {
      if (abandonedUpdateRequests.has(requestId)) return
      if (activeUpdateRequestId && activeUpdateRequestId !== requestId) {
        event.source.postMessage({ type: UPDATE_PREPARED_MESSAGE, requestId, ready: false })
        return
      }
      void prepareUpdate(event.source, requestId)
      return
    }
    if (data.type === UPDATE_BLOCKED_MESSAGE) {
      const reason = data.reason
      if (!['activation-timeout', 'busy', 'changed', 'failed', 'late', 'legacy', 'timeout', 'unsaved'].includes(reason)) return
      if (activeUpdateRequestId !== requestId) return
      dispatchUpdateBlocked(requestId, reason)
      return
    }
    if (data.type === UPDATE_ACTIVATED_MESSAGE) {
      if (abandonedUpdateRequests.has(requestId)) {
        abandonedUpdateRequests.delete(requestId)
        return
      }
      if (activeUpdateRequestId !== requestId) return
      clearActivationWatchdog()
      if (!consumeUpdateReload(requestId)) return
      window.location.reload()
    }
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
  const requestId = updateRequestId()
  const worker = waiting ?? navigator.serviceWorker.controller
  if (!worker) {
    dispatchUpdateBlocked(requestId, 'failed')
    return
  }
  activeUpdateRequestId = requestId
  window.dispatchEvent(new CustomEvent('paldawn:update-preparing', { detail: { requestId } }))
  try {
    worker.postMessage({
      type: waiting ? UPDATE_REQUEST_MESSAGE : UPDATE_RELOAD_MESSAGE,
      requestId,
    })
  } catch {
    dispatchUpdateBlocked(requestId, 'failed')
  }
}

export function registerPwaUpdatePreparation(
  preparation: () => boolean | Promise<boolean>,
): () => void {
  updatePreparations.add(preparation)
  return () => updatePreparations.delete(preparation)
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
