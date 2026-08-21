let registration: ServiceWorkerRegistration | null = null
let refreshing = false

const dispatch = (name: 'update-ready' | 'offline-ready'): void => {
  window.dispatchEvent(new CustomEvent(`paldawn:${name}`))
}

export function registerPwa(): void {
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
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}

export function activatePwaUpdate(): void {
  registration?.waiting?.postMessage({ type: 'SKIP_WAITING' })
}

export function checkForPwaUpdate(): Promise<void> {
  return registration?.update().then(() => undefined) ?? Promise.resolve()
}
