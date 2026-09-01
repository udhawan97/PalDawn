import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { cp, mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIST_ROOT = join(APP_ROOT, 'dist')
const BASE_PATH = '/PalDawn/'
const TEST_TIMEOUT_MS = 90_000
const COMMAND_TIMEOUT_MS = 30_000
const PAGE_TIMEOUT_MS = 15_000
const LOAD_COUNT_KEY = 'paldawn:test:pwa-document-loads'
const CAPTURED_REQUEST_KEY = 'paldawn:test:pwa-request-id'
const UPDATE_RELOAD_SESSION_KEY = 'paldawn:pwa-update-reload:v1'
const JOURNEY_KEY = 'paldawn:journey:v1'
const SETTINGS_KEY = 'paldawn:settings:v1'

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
])

const resources = {
  browser: null,
  child: null,
  server: null,
  tempRoot: null,
  distBackup: null,
  hadDist: false,
}

const exists = async (path) => {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

const runCommand = (command, args, options) => new Promise((resolveCommand, rejectCommand) => {
  const child = spawn(command, args, {
    ...options,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  resources.child = child
  let output = ''
  let timedOut = false
  const append = (chunk) => {
    output = `${output}${chunk}`.slice(-24_000)
  }
  child.stdout.on('data', append)
  child.stderr.on('data', append)
  const timer = setTimeout(() => {
    timedOut = true
    child.kill('SIGKILL')
  }, COMMAND_TIMEOUT_MS)
  child.once('error', (error) => {
    clearTimeout(timer)
    resources.child = null
    rejectCommand(error)
  })
  child.once('exit', (code, signal) => {
    clearTimeout(timer)
    resources.child = null
    if (code === 0 && !timedOut) {
      resolveCommand(output)
      return
    }
    const reason = timedOut ? `timed out after ${COMMAND_TIMEOUT_MS}ms` : `exited ${code ?? signal}`
    rejectCommand(new Error(`${command} ${args.join(' ')} ${reason}\n${output}`))
  })
})

const buildInto = async (target, salt) => {
  await runCommand('npm', ['run', 'build'], {
    cwd: APP_ROOT,
    env: {
      ...process.env,
      ALL_PROXY: 'http://127.0.0.1:9',
      HTTP_PROXY: 'http://127.0.0.1:9',
      HTTPS_PROXY: 'http://127.0.0.1:9',
      NO_PROXY: '127.0.0.1,localhost',
      PALDAWN_BUILD_SALT: salt,
      VITE_BASE_PATH: BASE_PATH,
      npm_config_audit: 'false',
      npm_config_fund: 'false',
      npm_config_offline: 'true',
      npm_config_update_notifier: 'false',
    },
  })
  await cp(DIST_ROOT, target, { recursive: true })
  const worker = await readFile(join(target, 'sw.js'), 'utf8')
  const buildId = worker.match(/const BUILD_ID = '([a-f0-9]{12})'/)?.[1]
  assert.ok(buildId, `service worker for ${salt} must contain a stamped build ID`)
  return buildId
}

const createStaticServer = (initialRoot) => {
  let activeRoot = initialRoot
  const server = createServer(async (request, response) => {
    try {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405).end()
        return
      }
      const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1')
      if (requestUrl.pathname === BASE_PATH.slice(0, -1)) {
        response.writeHead(308, { location: BASE_PATH }).end()
        return
      }
      if (!requestUrl.pathname.startsWith(BASE_PATH)) {
        response.writeHead(404).end()
        return
      }
      const relativePath = decodeURIComponent(requestUrl.pathname.slice(BASE_PATH.length)) || 'index.html'
      const candidate = resolve(activeRoot, relativePath)
      if (candidate !== activeRoot && !candidate.startsWith(`${activeRoot}${sep}`)) {
        response.writeHead(400).end()
        return
      }
      let filePath = candidate
      try {
        if ((await stat(filePath)).isDirectory()) filePath = join(filePath, 'index.html')
      } catch {
        if (request.headers.accept?.includes('text/html')) filePath = join(activeRoot, 'index.html')
        else {
          response.writeHead(404).end()
          return
        }
      }
      const body = await readFile(filePath)
      response.writeHead(200, {
        'cache-control': 'no-store',
        'content-length': body.byteLength,
        'content-type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream',
        ...(filePath.endsWith(`${sep}sw.js`) ? { 'service-worker-allowed': BASE_PATH } : {}),
      })
      response.end(request.method === 'HEAD' ? undefined : body)
    } catch (error) {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
      response.end(error instanceof Error ? error.message : 'Static server failure')
    }
  })
  return {
    server,
    useRoot: (root) => { activeRoot = root },
  }
}

const listen = (server) => new Promise((resolveListen, rejectListen) => {
  server.once('error', rejectListen)
  server.listen(0, '127.0.0.1', () => {
    server.off('error', rejectListen)
    const address = server.address()
    assert.ok(address && typeof address === 'object')
    resolveListen(address.port)
  })
})

const closeServer = async (server) => {
  if (!server) return
  server.closeAllConnections?.()
  if (!server.listening) return
  await new Promise((resolveClose) => server.close(() => resolveClose()))
}

const cleanup = async () => {
  if (resources.child && resources.child.exitCode === null) resources.child.kill('SIGKILL')
  resources.child = null
  if (resources.browser) await resources.browser.close().catch(() => {})
  resources.browser = null
  await closeServer(resources.server).catch(() => {})
  resources.server = null
  if (resources.tempRoot) {
    await rm(DIST_ROOT, { force: true, recursive: true })
    if (resources.hadDist && resources.distBackup && await exists(resources.distBackup)) {
      await cp(resources.distBackup, DIST_ROOT, { recursive: true })
    }
    await rm(resources.tempRoot, { force: true, recursive: true })
  }
  resources.tempRoot = null
}

const waitForController = async (page) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (navigator.serviceWorker.controller) return
    await new Promise((resolveController, rejectController) => {
      const timer = setTimeout(() => rejectController(new Error('service worker controller timeout')), 10_000)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        clearTimeout(timer)
        resolveController()
      }, { once: true })
    })
  })
}

const tabState = (page) => page.evaluate(({ capturedKey, loadKey, markerKey }) => ({
  capturedRequestId: sessionStorage.getItem(capturedKey),
  loadCount: Number(sessionStorage.getItem(loadKey) ?? '0'),
  updateMarker: sessionStorage.getItem(markerKey),
}), {
  capturedKey: CAPTURED_REQUEST_KEY,
  loadKey: LOAD_COUNT_KEY,
  markerKey: UPDATE_RELOAD_SESSION_KEY,
})

const runAcceptance = async () => {
  resources.tempRoot = await mkdtemp(join(tmpdir(), 'paldawn-pwa-browser-'))
  resources.hadDist = await exists(DIST_ROOT)
  if (resources.hadDist) {
    resources.distBackup = join(resources.tempRoot, 'dist-backup')
    await cp(DIST_ROOT, resources.distBackup, { recursive: true })
  }

  const v1Root = join(resources.tempRoot, 'v1')
  const v2Root = join(resources.tempRoot, 'v2')
  const v1BuildId = await buildInto(v1Root, 'pwa-browser-lifecycle-v1')
  const v2BuildId = await buildInto(v2Root, 'pwa-browser-lifecycle-v2')
  assert.notEqual(v1BuildId, v2BuildId, 'build salts must create distinct service workers')

  const staticServer = createStaticServer(v1Root)
  resources.server = staticServer.server
  const port = await listen(resources.server)
  const origin = `http://127.0.0.1:${port}`
  const appUrl = `${origin}${BASE_PATH}`
  const externalRequests = []
  const pageErrors = []

  resources.browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-sync',
      '--no-default-browser-check',
    ],
  })
  const browserVersion = resources.browser.version()
  const context = await resources.browser.newContext({
    reducedMotion: 'reduce',
    serviceWorkers: 'allow',
  })
  context.setDefaultTimeout(PAGE_TIMEOUT_MS)
  context.setDefaultNavigationTimeout(PAGE_TIMEOUT_MS)
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.origin === origin || url.protocol === 'blob:' || url.protocol === 'data:') {
      await route.continue()
      return
    }
    externalRequests.push(url.href)
    await route.abort('blockedbyclient')
  })
  await context.addInitScript(({ capturedKey, loadKey, markerType, origin: expectedOrigin, settingsKey }) => {
    if (location.origin !== expectedOrigin) return
    if (!localStorage.getItem(settingsKey)) {
      localStorage.setItem(settingsKey, JSON.stringify({
        state: { reducedMotion: true, textVoyagePreferred: true },
        version: 1,
      }))
    }
    const currentLoads = Number(sessionStorage.getItem(loadKey) ?? '0')
    sessionStorage.setItem(loadKey, String(currentLoads + 1))
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data?.type === markerType && typeof event.data.requestId === 'string') {
        sessionStorage.setItem(capturedKey, event.data.requestId)
      }
    })
  }, {
    capturedKey: CAPTURED_REQUEST_KEY,
    loadKey: LOAD_COUNT_KEY,
    markerType: 'PALDAWN_UPDATE_ACTIVATED',
    origin,
    settingsKey: SETTINGS_KEY,
  })

  const firstTab = await context.newPage()
  const secondTab = await context.newPage()
  for (const page of [firstTab, secondTab]) {
    page.on('pageerror', (error) => pageErrors.push(error.message))
  }
  await Promise.all([firstTab.goto(appUrl), secondTab.goto(appUrl)])
  await Promise.all([waitForController(firstTab), waitForController(secondTab)])
  await firstTab.waitForTimeout(750)
  assert.deepEqual((await Promise.all([tabState(firstTab), tabState(secondTab)])).map(({ loadCount }) => loadCount), [1, 1], 'first install must not reload either tab')

  await firstTab.bringToFront()
  await firstTab.getByRole('button', { name: 'Settings', exact: true }).click()
  await firstTab.getByLabel('Quality tier').selectOption('low')
  await firstTab.getByRole('button', { name: 'Close panel' }).click()
  await firstTab.getByRole('button', { name: /^(?:Begin the voyage|Enter step mode)$/ }).click()
  const pauseAction = firstTab.getByRole('button', { name: 'Pause' })
  if (await pauseAction.isVisible()) await pauseAction.click()
  await firstTab.getByLabel('Journey position').fill('250')
  await firstTab.waitForFunction((key) => {
    const value = localStorage.getItem(key)
    if (!value) return false
    try {
      return Math.abs(JSON.parse(value).progress - 0.25) < 0.001
    } catch {
      return false
    }
  }, JOURNEY_KEY, { timeout: 5_000 })
  const storedBefore = await firstTab.evaluate(({ journeyKey, settingsKey }) => ({
    journey: localStorage.getItem(journeyKey),
    settings: localStorage.getItem(settingsKey),
  }), { journeyKey: JOURNEY_KEY, settingsKey: SETTINGS_KEY })
  assert.ok(storedBefore.journey, 'journey state must be durable before activation')
  assert.ok(storedBefore.settings, 'settings state must be durable before activation')

  staticServer.useRoot(v2Root)
  await firstTab.getByRole('button', { name: 'Settings', exact: true }).click()
  await firstTab.getByRole('button', { name: 'Check for app update' }).click()
  await firstTab.getByText(/^(?:Update check complete\.|PalDawn checked for an app update\.)$/).waitFor({ state: 'visible' })
  await firstTab.getByRole('button', { name: 'Close panel' }).click()
  const noticeSummary = firstTab.locator('.system-notice-summary')
  await noticeSummary.waitFor({ state: 'visible' })
  await noticeSummary.click()
  const updateAction = firstTab.getByRole('button', { name: 'Update now' })
  await updateAction.waitFor({ state: 'visible' })

  const firstReload = firstTab.waitForEvent('load')
  const secondReload = secondTab.waitForEvent('load')
  await updateAction.click()
  await Promise.all([firstReload, secondReload])
  await Promise.all([waitForController(firstTab), waitForController(secondTab)])
  await firstTab.waitForTimeout(1_250)

  const [firstState, secondState] = await Promise.all([tabState(firstTab), tabState(secondTab)])
  assert.equal(firstState.loadCount, 2, 'requesting tab must reload exactly once')
  assert.equal(secondState.loadCount, 2, 'sibling tab must reload exactly once')
  assert.ok(firstState.updateMarker, 'requesting tab must retain the consumed request marker')
  assert.equal(firstState.updateMarker, secondState.updateMarker, 'both tabs must consume the same request ID')
  assert.equal(firstState.capturedRequestId, firstState.updateMarker, 'requesting tab must reload for its captured activation')
  assert.equal(secondState.capturedRequestId, firstState.updateMarker, 'sibling tab must reload for the same captured activation')

  const storedAfter = await firstTab.evaluate(({ journeyKey, settingsKey }) => ({
    journey: localStorage.getItem(journeyKey),
    settings: localStorage.getItem(settingsKey),
  }), { journeyKey: JOURNEY_KEY, settingsKey: SETTINGS_KEY })
  assert.deepEqual(storedAfter, storedBefore, 'local journey and settings data must survive activation')
  await firstTab.getByRole('button', { name: 'Settings', exact: true }).click()
  assert.equal(await firstTab.getByLabel('Quality tier').inputValue(), 'low', 'persisted settings must restore in the updated UI')
  await firstTab.getByRole('button', { name: 'Close panel' }).click()
  await firstTab.getByRole('button', { name: /Resume at/ }).waitFor({ state: 'visible' })

  const cacheNames = await firstTab.evaluate(() => caches.keys())
  assert.deepEqual(cacheNames, [`paldawn-foundation-${v2BuildId}`], 'only the new bounded PalDawn cache may remain')
  assert.deepEqual(externalRequests, [], 'browser acceptance must not request external origins')
  assert.deepEqual(pageErrors, [], 'browser acceptance must not produce page errors')

  console.log(`pwa browser lifecycle: PASS · Chromium ${browserVersion}`)
  console.log(`builds: ${v1BuildId} -> ${v2BuildId}`)
  console.log(`tabs: 1 -> ${firstState.loadCount} loads each · request ${firstState.updateMarker}`)
  console.log(`cache: ${cacheNames.join(', ')} · local journey/settings preserved`)
}

let timeout
try {
  await Promise.race([
    runAcceptance(),
    new Promise((_, rejectTimeout) => {
      timeout = setTimeout(() => rejectTimeout(new Error(`PWA browser acceptance exceeded ${TEST_TIMEOUT_MS}ms`)), TEST_TIMEOUT_MS)
    }),
  ])
} finally {
  clearTimeout(timeout)
  await cleanup()
}
