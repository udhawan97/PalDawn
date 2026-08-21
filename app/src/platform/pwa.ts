let registration: ServiceWorkerRegistration | null = null
let refreshing = false
let updateActivationRequested = false
let installPrompt: BeforeInstallPromptEvent | null = null

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type PwaInstallState = 'available' | 'installed' | 'instructions'

const isStandalone = (): boolean =>
  window.matchMedia?.('(display-mode: standalone)').matches === true ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

const dispatch = (name: 'update-ready' | 'offline-ready'): void => {
  window.dispatchEvent(new CustomEvent(`paldawn:${name}`))
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

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updateActivationRequested || refreshing) return
    refreshing = true
    window.location.reload()
  })
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
  updateActivationRequested = true
  waiting.postMessage({ type: 'SKIP_WAITING' })
}

export function checkForPwaUpdate(): Promise<void> {
  return registration?.update().then(() => undefined) ?? Promise.resolve()
}
