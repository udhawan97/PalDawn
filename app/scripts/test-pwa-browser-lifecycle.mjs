import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url))
const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url))
const BASE_REVISION = '38294634d9f35778b2519bc9a33f95e9bbcfbc20'
const BASE_PATH = '/PalDawn/'
const TEST_TIMEOUT_MS = 150_000
const COMMAND_TIMEOUT_MS = 30_000
const PAGE_TIMEOUT_MS = 15_000
const LOAD_COUNT_KEY = 'paldawn:test:pwa-document-loads'
const CAPTURED_REQUEST_KEY = 'paldawn:test:pwa-request-id'
const COMMITTED_REQUEST_KEY = 'paldawn:test:pwa-committed-request-id'
const LEGACY_BLOCKED_KEY = 'paldawn:test:pwa-legacy-blocked'
const UPDATE_RELOAD_SESSION_KEY = 'paldawn:pwa-update-reload:v1'
const JOURNEY_KEY = 'paldawn:journey:v1'
const BOOKMARKS_KEY = 'paldawn:bookmarks:v1'
const SETTINGS_KEY = 'paldawn:settings:v1'
const WORKSPACE_KEY = 'paldawn:workspace:v1'

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
  children: new Set(),
  server: null,
  tempRoot: null,
}

const runCommand = (command, args, options) => new Promise((resolveCommand, rejectCommand) => {
  const child = spawn(command, args, {
    ...options,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  resources.children.add(child)
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
    resources.children.delete(child)
    rejectCommand(error)
  })
  child.once('exit', (code, signal) => {
    clearTimeout(timer)
    resources.children.delete(child)
    if (code === 0 && !timedOut) {
      resolveCommand(output)
      return
    }
    const reason = timedOut ? `timed out after ${COMMAND_TIMEOUT_MS}ms` : `exited ${code ?? signal}`
    rejectCommand(new Error(`${command} ${args.join(' ')} ${reason}\n${output}`))
  })
})

const archiveRevision = (revision, target) => new Promise((resolveArchive, rejectArchive) => {
  const archive = spawn('git', ['archive', '--format=tar', revision, 'app'], {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const extract = spawn('tar', ['-x', '-C', target], {
    stdio: ['pipe', 'ignore', 'pipe'],
  })
  resources.children.add(archive)
  resources.children.add(extract)
  archive.stdout.pipe(extract.stdin)
  let errors = ''
  archive.stderr.on('data', (chunk) => { errors = `${errors}${chunk}`.slice(-12_000) })
  extract.stderr.on('data', (chunk) => { errors = `${errors}${chunk}`.slice(-12_000) })
  let archiveCode = null
  let extractCode = null
  const timer = setTimeout(() => {
    archive.kill('SIGKILL')
    extract.kill('SIGKILL')
  }, COMMAND_TIMEOUT_MS)
  const finish = () => {
    if (archiveCode === null || extractCode === null) return
    clearTimeout(timer)
    resources.children.delete(archive)
    resources.children.delete(extract)
    if (archiveCode === 0 && extractCode === 0) resolveArchive()
    else rejectArchive(new Error(`git archive ${revision} failed (${archiveCode}/${extractCode})\n${errors}`))
  }
  archive.once('error', rejectArchive)
  extract.once('error', rejectArchive)
  archive.once('exit', (code) => { archiveCode = code; finish() })
  extract.once('exit', (code) => { extractCode = code; finish() })
})

const prepareSourceTrees = async (tempRoot) => {
  const baseSource = join(tempRoot, 'base-source')
  const candidateSource = join(tempRoot, 'candidate-source')
  await mkdir(baseSource, { recursive: true })
  await mkdir(candidateSource, { recursive: true })
  await archiveRevision(BASE_REVISION, baseSource)
  await cp(APP_ROOT, join(candidateSource, 'app'), {
    recursive: true,
    filter: (source) => !['node_modules', 'dist', 'test-results'].includes(source.split(sep).at(-1)),
  })
  for (const source of [baseSource, candidateSource]) {
    await symlink(join(APP_ROOT, 'node_modules'), join(source, 'app', 'node_modules'))
  }
  return {
    baseApp: join(baseSource, 'app'),
    candidateApp: join(candidateSource, 'app'),
  }
}

const buildInto = async (sourceApp, target, salt) => {
  await runCommand('npm', ['run', 'build'], {
    cwd: sourceApp,
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
  await cp(join(sourceApp, 'dist'), target, { recursive: true })
  const worker = await readFile(join(target, 'sw.js'), 'utf8')
  const buildId = worker.match(/const BUILD_ID = '([a-f0-9]{12})'/)?.[1]
  assert.ok(buildId, `service worker for ${salt} must contain a stamped build ID`)
  return buildId
}

const delayActivationCacheCleanup = async (root, delayMs) => {
  const workerPath = join(root, 'sw.js')
  const worker = await readFile(workerPath, 'utf8')
  const boundary = '// PALDAWN_ACTIVATION_CACHE_COMMIT: browser acceptance delays this boundary.'
  assert.equal(worker.split(boundary).length, 2, 'built worker must expose one committed activation boundary')
  await writeFile(workerPath, worker.replace(
    boundary,
    `${boundary}\n      await new Promise((resolveDelay) => setTimeout(resolveDelay, ${delayMs}))`,
  ))
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
  for (const child of resources.children) {
    if (child.exitCode === null) child.kill('SIGKILL')
  }
  resources.children.clear()
  if (resources.browser) await resources.browser.close().catch(() => {})
  resources.browser = null
  await closeServer(resources.server).catch(() => {})
  resources.server = null
  if (resources.tempRoot) {
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

const tabState = (page) => page.evaluate(({ capturedKey, committedKey, loadKey, markerKey }) => ({
  capturedRequestId: sessionStorage.getItem(capturedKey),
  committedRequestId: sessionStorage.getItem(committedKey),
  loadCount: Number(sessionStorage.getItem(loadKey) ?? '0'),
  updateMarker: sessionStorage.getItem(markerKey),
}), {
  capturedKey: CAPTURED_REQUEST_KEY,
  committedKey: COMMITTED_REQUEST_KEY,
  loadKey: LOAD_COUNT_KEY,
  markerKey: UPDATE_RELOAD_SESSION_KEY,
})

const revealUpdateAction = async (page) => {
  await page.bringToFront()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Check for app update' }).click()
  await page.getByText(/^(?:Update check complete\.|PalDawn checked for an app update\.)$/).waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Close panel' }).click()
  const noticeSummary = page.locator('.system-notice-summary')
  await noticeSummary.waitFor({ state: 'visible' })
  if (await noticeSummary.getAttribute('aria-expanded') !== 'true') await noticeSummary.click()
  const updateAction = page.getByRole('button', { name: 'Update and reload open tabs' })
    .or(page.getByRole('button', { name: 'Retry update and reload' }))
    .or(page.getByRole('button', { name: 'Update now' }))
    .or(page.getByRole('button', { name: 'Retry update' }))
  await updateAction.waitFor({ state: 'visible' })
  return updateAction
}

const runAcceptance = async () => {
  resources.tempRoot = await mkdtemp(join(tmpdir(), 'paldawn-pwa-browser-'))
  const { baseApp, candidateApp } = await prepareSourceTrees(resources.tempRoot)
  const baseRoot = join(resources.tempRoot, 'base-build')
  const candidateRoot = join(resources.tempRoot, 'candidate-build')
  const nextCandidateRoot = join(resources.tempRoot, 'next-candidate-build')
  const terminalCandidateRoot = join(resources.tempRoot, 'terminal-candidate-build')
  const baseBuildId = await buildInto(baseApp, baseRoot, 'pwa-browser-lifecycle-base')
  const candidateBuildId = await buildInto(candidateApp, candidateRoot, 'pwa-browser-lifecycle-candidate')
  const nextCandidateBuildId = await buildInto(candidateApp, nextCandidateRoot, 'pwa-browser-lifecycle-next')
  const terminalCandidateBuildId = await buildInto(candidateApp, terminalCandidateRoot, 'pwa-browser-lifecycle-terminal')
  assert.equal(new Set([baseBuildId, candidateBuildId, nextCandidateBuildId, terminalCandidateBuildId]).size, 4, 'builds must have distinct service workers')
  await delayActivationCacheCleanup(nextCandidateRoot, 8_000)
  await delayActivationCacheCleanup(terminalCandidateRoot, 8_000)

  const staticServer = createStaticServer(baseRoot)
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
  await context.addInitScript(({ blockedKey, capturedKey, committedKey, loadKey, markerType, origin: expectedOrigin, settingsKey }) => {
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
      if (event.data?.type === 'PALDAWN_UPDATE_COMMITTED' && typeof event.data.requestId === 'string') {
        sessionStorage.setItem(committedKey, event.data.requestId)
      }
      if (event.data?.type === 'PALDAWN_UPDATE_BLOCKED' && event.data.reason === 'legacy') {
        sessionStorage.setItem(blockedKey, event.data.requestId)
      }
    })
  }, {
    blockedKey: LEGACY_BLOCKED_KEY,
    capturedKey: CAPTURED_REQUEST_KEY,
    committedKey: COMMITTED_REQUEST_KEY,
    loadKey: LOAD_COUNT_KEY,
    markerType: 'PALDAWN_UPDATE_ACTIVATED',
    origin,
    settingsKey: SETTINGS_KEY,
  })

  const firstBaseTab = await context.newPage()
  const secondBaseTab = await context.newPage()
  for (const page of [firstBaseTab, secondBaseTab]) {
    page.on('pageerror', (error) => pageErrors.push(error.message))
  }
  await Promise.all([firstBaseTab.goto(appUrl), secondBaseTab.goto(appUrl)])
  await Promise.all([waitForController(firstBaseTab), waitForController(secondBaseTab)])
  await firstBaseTab.waitForTimeout(750)
  assert.deepEqual((await Promise.all([tabState(firstBaseTab), tabState(secondBaseTab)])).map(({ loadCount }) => loadCount), [1, 1], 'first install must not reload either base tab')

  await firstBaseTab.bringToFront()
  await firstBaseTab.getByRole('button', { name: 'Settings', exact: true }).click()
  await firstBaseTab.getByLabel('Quality tier').selectOption('low')
  await firstBaseTab.getByRole('button', { name: 'Close panel' }).click()
  await firstBaseTab.getByRole('button', { name: /^(?:Begin the voyage|Enter step mode)$/ }).click()
  const pauseAction = firstBaseTab.getByRole('button', { name: 'Pause' })
  if (await pauseAction.isVisible()) await pauseAction.click()
  await firstBaseTab.getByLabel('Journey position').fill('250')
  await firstBaseTab.getByRole('button', { name: 'Save stage', exact: true }).first().click()
  await firstBaseTab.waitForFunction((key) => {
    const value = localStorage.getItem(key)
    if (!value) return false
    try {
      return Math.abs(JSON.parse(value).progress - 0.25) < 0.001
    } catch {
      return false
    }
  }, JOURNEY_KEY, { timeout: 5_000 })
  const storedBefore = await firstBaseTab.evaluate(({ bookmarksKey, journeyKey, settingsKey }) => ({
    bookmarks: localStorage.getItem(bookmarksKey),
    journey: localStorage.getItem(journeyKey),
    settings: localStorage.getItem(settingsKey),
  }), { bookmarksKey: BOOKMARKS_KEY, journeyKey: JOURNEY_KEY, settingsKey: SETTINGS_KEY })
  assert.ok(storedBefore.bookmarks, 'saved-stage state must be durable before activation')
  assert.ok(storedBefore.journey, 'journey state must be durable before activation')
  assert.ok(storedBefore.settings, 'settings state must be durable before activation')

  staticServer.useRoot(candidateRoot)
  const firstLegacyAction = await revealUpdateAction(firstBaseTab)
  await firstLegacyAction.click()
  await firstBaseTab.waitForFunction((key) => Boolean(sessionStorage.getItem(key)), LEGACY_BLOCKED_KEY)

  const secondLegacyAction = await revealUpdateAction(secondBaseTab)
  await secondLegacyAction.click()
  await secondBaseTab.waitForFunction((key) => Boolean(sessionStorage.getItem(key)), LEGACY_BLOCKED_KEY)
  assert.deepEqual((await Promise.all([tabState(firstBaseTab), tabState(secondBaseTab)])).map(({ loadCount }) => loadCount), [1, 1], 'legacy bridge must preserve both base tabs without reload')

  const [firstLegacyRequestId, secondLegacyRequestId] = await Promise.all([
    firstBaseTab.evaluate((key) => sessionStorage.getItem(key), LEGACY_BLOCKED_KEY),
    secondBaseTab.evaluate((key) => sessionStorage.getItem(key), LEGACY_BLOCKED_KEY),
  ])
  assert.ok(firstLegacyRequestId && secondLegacyRequestId)
  assert.notEqual(firstLegacyRequestId, secondLegacyRequestId, 'each legacy veto must retain a distinct request ID')

  const firstCandidateTab = await context.newPage()
  const secondCandidateTab = await context.newPage()
  for (const page of [firstCandidateTab, secondCandidateTab]) {
    page.on('pageerror', (error) => pageErrors.push(error.message))
  }
  await Promise.all([
    firstCandidateTab.goto(`${appUrl}?paldawn-update-bridge=${encodeURIComponent(firstLegacyRequestId)}`),
    secondCandidateTab.goto(`${appUrl}?paldawn-update-bridge=${encodeURIComponent(secondLegacyRequestId)}`),
  ])

  await Promise.all([firstBaseTab.close(), secondBaseTab.close()])
  await firstCandidateTab.waitForTimeout(250)
  const updateAction = await revealUpdateAction(firstCandidateTab)
  const firstReload = firstCandidateTab.waitForEvent('load')
  const secondReload = secondCandidateTab.waitForEvent('load')
  await updateAction.click()
  await Promise.all([firstReload, secondReload])
  await Promise.all([waitForController(firstCandidateTab), waitForController(secondCandidateTab)])
  await firstCandidateTab.waitForTimeout(1_250)

  const [firstState, secondState] = await Promise.all([tabState(firstCandidateTab), tabState(secondCandidateTab)])
  assert.equal(firstState.loadCount, 2, 'requesting tab must reload exactly once')
  assert.equal(secondState.loadCount, 2, 'sibling tab must reload exactly once')
  assert.ok(firstState.updateMarker, 'requesting tab must retain the consumed request marker')
  assert.equal(firstState.updateMarker, secondState.updateMarker, 'both tabs must consume the same request ID')
  assert.equal(firstState.capturedRequestId, firstState.updateMarker, 'requesting tab must reload for its captured activation')
  assert.equal(secondState.capturedRequestId, firstState.updateMarker, 'sibling tab must reload for the same captured activation')

  const storedAfter = await firstCandidateTab.evaluate(({ bookmarksKey, journeyKey, settingsKey }) => ({
    bookmarks: localStorage.getItem(bookmarksKey),
    journey: localStorage.getItem(journeyKey),
    settings: localStorage.getItem(settingsKey),
  }), { bookmarksKey: BOOKMARKS_KEY, journeyKey: JOURNEY_KEY, settingsKey: SETTINGS_KEY })
  const beforeBookmarks = JSON.parse(storedBefore.bookmarks)
  const afterBookmarks = JSON.parse(storedAfter.bookmarks)
  const beforeJourney = JSON.parse(storedBefore.journey)
  const afterJourney = JSON.parse(storedAfter.journey)
  const beforeSettings = JSON.parse(storedBefore.settings)
  const afterSettings = JSON.parse(storedAfter.settings)
  assert.deepEqual(
    { progress: afterJourney.progress, narrationMode: afterJourney.narrationMode },
    { progress: beforeJourney.progress, narrationMode: beforeJourney.narrationMode },
    'local journey state must survive activation',
  )
  assert.deepEqual(afterSettings.state, beforeSettings.state, 'local settings state must survive activation')
  assert.deepEqual(afterBookmarks.stageIds, beforeBookmarks.stageIds, 'saved-stage state must survive activation')
  await firstCandidateTab.getByRole('button', { name: 'Settings', exact: true }).click()
  assert.equal(await firstCandidateTab.getByLabel('Quality tier').inputValue(), 'low', 'persisted settings must restore in the updated UI')
  await firstCandidateTab.getByRole('button', { name: 'Close panel' }).click()
  await firstCandidateTab.getByRole('button', { name: /Resume at/ }).waitFor({ state: 'visible' })

  const cacheNames = await firstCandidateTab.evaluate(() => caches.keys())
  assert.deepEqual(cacheNames, [`paldawn-foundation-${candidateBuildId}`], 'only the safely activated candidate cache may remain')

  staticServer.useRoot(nextCandidateRoot)
  await revealUpdateAction(firstCandidateTab)
  const watchdogRequestId = 'browser-watchdog-no-broadcast'
  await firstCandidateTab.evaluate(async (requestId) => {
    const waiting = (await navigator.serviceWorker.getRegistration())?.waiting
    if (!waiting) throw new Error('watchdog test requires an installed waiting worker')
    navigator.serviceWorker.dispatchEvent(new MessageEvent('message', {
      data: { type: 'PALDAWN_PREPARE_UPDATE', requestId },
      source: waiting,
    }))
  }, watchdogRequestId)
  await firstCandidateTab.waitForFunction(() => document.getElementById('root')?.inert === true)
  await firstCandidateTab.getByText(/Update did not finish, so PalDawn did not reload this tab/).waitFor({ state: 'visible', timeout: 10_000 })
  assert.equal(await firstCandidateTab.locator('#root').evaluate((element) => element.inert), false, 'the activation watchdog must restore a client when no outcome arrives')
  assert.equal(await firstCandidateTab.getByRole('button', { name: 'Retry update and reload' }).evaluate((button) => document.activeElement === button), true, 'an activation timeout must focus its retry action')
  const afterWatchdog = await tabState(firstCandidateTab)
  assert.equal(afterWatchdog.loadCount, 2, 'an activation timeout must not reload the prepared client')
  assert.equal(afterWatchdog.updateMarker, firstState.updateMarker, 'an activation timeout must not consume a new request marker')
  await firstCandidateTab.evaluate(async (requestId) => {
    const waiting = (await navigator.serviceWorker.getRegistration())?.waiting
    if (!waiting) throw new Error('late-message test requires the same waiting worker')
    navigator.serviceWorker.dispatchEvent(new MessageEvent('message', {
      data: { type: 'PALDAWN_UPDATE_ACTIVATED', requestId },
      source: waiting,
    }))
  }, watchdogRequestId)
  await firstCandidateTab.waitForTimeout(250)
  assert.equal((await tabState(firstCandidateTab)).loadCount, 2, 'a late outcome for an abandoned request must not reload the client')
  assert.equal(await firstCandidateTab.locator('#root').evaluate((element) => element.inert), false, 'a late abandoned outcome must not re-enter handoff mode')

  await secondCandidateTab.bringToFront()
  await secondCandidateTab.getByRole('button', { name: 'Study', exact: true }).click()
  const durableWorkspaceBefore = await secondCandidateTab.evaluate((workspaceKey) => {
    const originalSetItem = Storage.prototype.setItem
    Object.defineProperty(window, '__paldawnRestoreStorage', {
      configurable: true,
      value: () => { Storage.prototype.setItem = originalSetItem },
    })
    Storage.prototype.setItem = function (key, value) {
      if (key === workspaceKey) throw new DOMException('Injected workspace storage failure', 'QuotaExceededError')
      return originalSetItem.call(this, key, value)
    }
    return localStorage.getItem(workspaceKey)
  }, WORKSPACE_KEY)
  const privateNote = 'Memory-only checkpoint must survive a blocked update.'
  await secondCandidateTab.getByLabel(/^Private note for /).fill(privateNote)
  await secondCandidateTab.getByRole('button', { name: 'Mark personal checkpoint' }).click()
  await secondCandidateTab.getByText('Browser storage is unavailable.').waitFor({ state: 'visible' })

  const markerBeforeVeto = (await tabState(firstCandidateTab)).updateMarker
  const vetoAction = await revealUpdateAction(firstCandidateTab)
  await vetoAction.click()
  await firstCandidateTab.getByText(/Update paused because an open PalDawn tab could not verify/).waitFor({ state: 'visible' })
  await firstCandidateTab.waitForTimeout(500)
  assert.equal(await firstCandidateTab.locator('#root').evaluate((element) => element.inert), false, 'a blocked handoff must restore the requesting tab')
  assert.equal(await secondCandidateTab.locator('#root').evaluate((element) => element.inert), false, 'a blocked handoff must restore the sibling tab')
  assert.equal(await firstCandidateTab.getByRole('button', { name: 'Retry update and reload' }).evaluate((button) => document.activeElement === button), true, 'a blocked handoff must focus its retry action')

  const [firstAfterVeto, secondAfterVeto] = await Promise.all([tabState(firstCandidateTab), tabState(secondCandidateTab)])
  assert.equal(firstAfterVeto.loadCount, 2, 'requesting candidate tab must not reload after a sibling veto')
  assert.equal(secondAfterVeto.loadCount, 2, 'unpersistable sibling tab must remain open and unreloaded')
  assert.equal(firstAfterVeto.updateMarker, markerBeforeVeto, 'a veto must not commit a new activation marker')
  assert.equal(secondAfterVeto.updateMarker, markerBeforeVeto, 'a veto must not change the sibling activation marker')
  assert.equal(await secondCandidateTab.getByLabel(/^Private note for /).inputValue(), privateNote, 'memory-only private note must remain intact')
  assert.equal(await secondCandidateTab.getByRole('button', { name: 'Personal checkpoint complete' }).getAttribute('aria-pressed'), 'true')
  assert.equal(await secondCandidateTab.evaluate((workspaceKey) => localStorage.getItem(workspaceKey), WORKSPACE_KEY), durableWorkspaceBefore, 'failed persistence must not be mistaken for a durable flush')
  assert.equal(await firstCandidateTab.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state), 'installed', 'vetoed worker must remain waiting')

  await secondCandidateTab.bringToFront()
  await secondCandidateTab.evaluate(() => window.__paldawnRestoreStorage())
  await secondCandidateTab.getByRole('button', { name: 'Retry saving' }).click()
  await secondCandidateTab.getByText('Private workspace saved in this browser.').waitFor({ state: 'visible' })
  await secondCandidateTab.getByRole('button', { name: 'Close panel' }).click()

  await firstCandidateTab.bringToFront()
  const retryAction = firstCandidateTab.getByRole('button', { name: 'Retry update and reload' })
  await retryAction.waitFor({ state: 'visible' })
  await firstCandidateTab.evaluate(async () => {
    const waiting = (await navigator.serviceWorker.getRegistration())?.waiting
    if (!waiting) throw new Error('delayed activation test requires a waiting worker')
    window.__paldawnDelayedActivationWorker = waiting
  })
  const firstRetryReload = firstCandidateTab.waitForEvent('load')
  const secondRetryReload = secondCandidateTab.waitForEvent('load')
  await retryAction.click()
  await Promise.all([firstCandidateTab, secondCandidateTab].map((page) => page.waitForFunction(
    ({ committedKey, previousRequestId }) => {
      const requestId = sessionStorage.getItem(committedKey)
      return Boolean(requestId && requestId !== previousRequestId)
    },
    { committedKey: COMMITTED_REQUEST_KEY, previousRequestId: markerBeforeVeto },
  )))
  const committedRequestIds = await Promise.all([firstCandidateTab, secondCandidateTab].map((page) =>
    page.evaluate((key) => sessionStorage.getItem(key), COMMITTED_REQUEST_KEY)))
  assert.ok(committedRequestIds[0], 'the requesting tab must observe the irreversible commit')
  assert.equal(committedRequestIds[0], committedRequestIds[1], 'every prepared tab must observe the same commit')
  await firstCandidateTab.evaluate(({ requestId }) => {
    window.__paldawnDelayedActivationWorker.postMessage({
      type: 'PALDAWN_CANCEL_UPDATE',
      requestId,
    })
  }, { requestId: committedRequestIds[0] })
  await firstCandidateTab.waitForTimeout(6_500)
  assert.equal(await firstCandidateTab.locator('#root').evaluate((element) => element.inert), true, 'a committed requesting tab must remain inert beyond the pre-commit watchdog')
  assert.equal(await secondCandidateTab.locator('#root').evaluate((element) => element.inert), true, 'a committed sibling tab must remain inert beyond the pre-commit watchdog')
  assert.deepEqual((await Promise.all([tabState(firstCandidateTab), tabState(secondCandidateTab)])).map(({ loadCount }) => loadCount), [2, 2], 'a post-commit cancellation must not unlock or reload before scoped cache cleanup completes')
  await Promise.all([firstRetryReload, secondRetryReload])
  await Promise.all([waitForController(firstCandidateTab), waitForController(secondCandidateTab)])

  const [firstRecovered, secondRecovered] = await Promise.all([tabState(firstCandidateTab), tabState(secondCandidateTab)])
  assert.equal(firstRecovered.loadCount, 3, 'requesting tab must reload once after storage recovery')
  assert.equal(secondRecovered.loadCount, 3, 'recovered sibling must reload once after storage recovery')
  assert.notEqual(firstRecovered.updateMarker, markerBeforeVeto, 'successful retry must use a fresh activation request')
  assert.equal(firstRecovered.updateMarker, secondRecovered.updateMarker, 'successful retry must remain coherent across tabs')
  await secondCandidateTab.getByRole('button', { name: 'Study', exact: true }).click()
  assert.equal(await secondCandidateTab.getByLabel(/^Private note for /).inputValue(), privateNote, 'recovered note must restore after activation')
  assert.equal(await secondCandidateTab.getByRole('button', { name: 'Personal checkpoint complete' }).getAttribute('aria-pressed'), 'true')
  const recoveredCacheNames = await firstCandidateTab.evaluate(() => caches.keys())
  assert.deepEqual(recoveredCacheNames, [`paldawn-foundation-${nextCandidateBuildId}`], 'successful retry must leave only the current PalDawn cache')

  staticServer.useRoot(terminalCandidateRoot)
  const terminalAction = await revealUpdateAction(firstCandidateTab)
  const previousCommittedRequestId = firstRecovered.committedRequestId
  await terminalAction.click()
  await Promise.all([firstCandidateTab, secondCandidateTab].map((page) => page.waitForFunction(
    ({ committedKey, previousRequestId }) => {
      const requestId = sessionStorage.getItem(committedKey)
      return Boolean(requestId && requestId !== previousRequestId)
    },
    { committedKey: COMMITTED_REQUEST_KEY, previousRequestId: previousCommittedRequestId },
  )))

  await secondCandidateTab.close()
  const terminalPages = [firstCandidateTab]
  for (const [index, page] of terminalPages.entries()) {
    try {
      await page.getByRole('alertdialog', { name: 'Close and reopen PalDawn to finish the update' }).waitFor({ state: 'visible', timeout: 15_000 })
    } catch (error) {
      const state = await page.evaluate(() => ({
        bodyInert: document.body.inert,
        notice: document.getElementById('pwa-committed-recovery')?.textContent ?? null,
        rootInert: document.getElementById('root')?.inert ?? null,
        updateText: document.querySelector('.system-banner-update-ready')?.textContent ?? null,
      }))
      throw new Error(`terminal page ${index + 1} did not expose recovery: ${JSON.stringify(state)}`, { cause: error })
    }
  }
  for (const page of terminalPages) {
    assert.equal(await page.locator('#root').evaluate((element) => element.inert), true, 'a post-commit mismatch must keep the application frozen')
    assert.equal(await page.evaluate(() => document.body.inert), false, 'the terminal recovery instruction must stay outside the inert application root')
    assert.equal(await page.getByRole('alertdialog').evaluate((element) => document.activeElement === element), true, 'the terminal recovery instruction must receive focus')
    await page.getByText(/Close every PalDawn tab, then reopen PalDawn/).waitFor({ state: 'visible' })
    assert.equal(await page.locator('#pwa-update-action').count(), 0, 'post-commit containment must not offer an unusable retry action')
  }
  const terminalLoadCounts = (await Promise.all(terminalPages.map(tabState))).map(({ loadCount }) => loadCount)
  assert.deepEqual(terminalLoadCounts, [3], 'post-commit containment must not reload the remaining tab')
  const terminalCacheNames = (await firstCandidateTab.evaluate(() => caches.keys())).sort()
  assert.deepEqual(terminalCacheNames, [
    `paldawn-foundation-${nextCandidateBuildId}`,
    `paldawn-foundation-${terminalCandidateBuildId}`,
  ].sort(), 'post-commit containment must preserve the previous cache beside the installed candidate')
  assert.deepEqual(externalRequests, [], 'browser acceptance must not request external origins')
  assert.deepEqual(pageErrors, [], 'browser acceptance must not produce page errors')

  console.log(`pwa browser lifecycle: PASS · Chromium ${browserVersion}`)
  console.log(`builds: base ${BASE_REVISION.slice(0, 8)} / ${baseBuildId} -> candidate ${candidateBuildId}`)
  console.log(`legacy: 2 base tabs vetoed/preserved -> 2 manually reopened candidate tabs reloaded once · request ${firstState.updateMarker}`)
  console.log(`cache: ${cacheNames.join(', ')} · local journey/settings/saved stage preserved`)
  console.log(`watchdog: missing and late activation outcomes restored the client without reload`)
  console.log(`veto/retry: ${nextCandidateBuildId} waited without reload, then stayed inert through delayed committed cleanup and activated after the sibling saved · note/checkpoint restored`)
  console.log(`post-commit tab close: ${terminalCandidateBuildId} preserved both caches and focused a manual close/reopen instruction in the remaining frozen tab`)
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
