import { expect, test } from '@playwright/test'
import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

test.use({ serviceWorkers: 'allow', reducedMotion: 'reduce' })
test.describe.configure({ timeout: 60_000 })

const dist = resolve(fileURLToPath(new URL('../dist/', import.meta.url)))
const base = process.env.VITE_BASE_PATH ?? '/'
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' }
const recoveryTitle = 'Close and reopen PalDawn to finish the update'

async function serveBuild(failure = null) {
  const worker = await readFile(resolve(dist, 'sw.js'), 'utf8')
  const boundary = '// PALDAWN_ACTIVATION_CACHE_COMMIT: browser acceptance delays this boundary.'
  expect(worker.split(boundary)).toHaveLength(2)
  const candidateBuildId = createHash('sha256').update(worker).update(failure ?? 'healthy').digest('hex').slice(0, 12)
  let candidateWorker = worker.replace(/const BUILD_ID = '[a-f0-9]{12}'/, `const BUILD_ID = '${candidateBuildId}'`)
  if (failure) candidateWorker = candidateWorker.replace(boundary, `${boundary}\n      caches.${failure} = async () => { throw new Error('Injected committed cache cleanup failure') }`)
  let updateOffered = false
  const server = createServer(async (request, response) => {
    try {
      const path = new URL(request.url, 'http://127.0.0.1').pathname
      if (!path.startsWith(base)) { response.writeHead(404).end(); return }
      const file = resolve(dist, decodeURIComponent(path.slice(base.length)) || 'index.html')
      if (!file.startsWith(`${dist}${sep}`)) { response.writeHead(400).end(); return }
      const target = (await stat(file)).isDirectory() ? resolve(file, 'index.html') : file
      const body = target === resolve(dist, 'sw.js') ? updateOffered ? candidateWorker : worker : await readFile(target)
      response.writeHead(200, { 'content-type': types[extname(target)] ?? 'application/octet-stream', 'cache-control': 'no-store', 'service-worker-allowed': base })
      response.end(body)
    } catch { response.writeHead(404).end() }
  })
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done) })
  const url = `http://127.0.0.1:${server.address().port}${base}`
  return {
    url, candidateBuildId,
    offerUpdate: () => { updateOffered = true },
    close: async () => { server.closeAllConnections(); await new Promise(done => server.close(done)) },
  }
}

async function waitForController(page) {
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null && navigator.serviceWorker?.controller !== undefined)
}

async function observeUpdates(context, url) {
  const errors = [], external = []
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === new URL(url).origin) return route.continue()
    external.push(route.request().url())
    return route.abort('blockedbyclient')
  })
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)))
  for (const page of context.pages()) page.on('pageerror', error => errors.push(error.message))
  await context.addInitScript((expectedOrigin) => {
    if (location.origin !== expectedOrigin) return
    if (!localStorage.getItem('paldawn:settings:v1')) localStorage.setItem('paldawn:settings:v1', JSON.stringify({ version: 1, state: { reducedMotion: true, textVoyagePreferred: true } }))
    sessionStorage.setItem('cleanup-loads', String(Number(sessionStorage.getItem('cleanup-loads') ?? '0') + 1))
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'PALDAWN_UPDATE_COMMITTED') {
        window.cleanupCommittedBytes = Object.fromEntries(Object.entries(localStorage))
        sessionStorage.setItem('cleanup-committed-bytes', JSON.stringify(window.cleanupCommittedBytes))
      }
      if (event.data?.type === 'PALDAWN_UPDATE_ACTIVATED') {
        window.cleanupActivated = true
        sessionStorage.setItem('cleanup-activations', String(Number(sessionStorage.getItem('cleanup-activations') ?? '0') + 1))
      }
      if (event.data?.type === 'PALDAWN_UPDATE_BLOCKED') window.cleanupBlocked = event.data
    })
  }, new URL(url).origin)
  return { errors, external }
}

async function saveStudy(page, note) {
  await page.getByRole('button', { name: 'Enter step mode', exact: true }).click()
  await page.getByRole('button', { name: 'Save stage', exact: true }).click()
  await page.getByRole('button', { name: 'Private note', exact: true }).click()
  await page.getByLabel('Private note for Approach').fill(note)
  await page.getByRole('button', { name: 'Mark personal checkpoint', exact: true }).click()
  await page.getByRole('button', { name: 'Close panel', exact: true }).click()
}

async function offerUpdate(page, server) {
  server.offerUpdate()
  await page.bringToFront()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Check for app update', exact: true }).click()
  await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state === 'installed')
  await page.getByRole('button', { name: 'Close panel', exact: true }).click()
  const summary = page.locator('.system-notice-summary')
  if (await summary.getAttribute('aria-expanded') !== 'true') await summary.click()
  return page.getByRole('button', { name: 'Update and reload open tabs', exact: true })
}

for (const failure of ['keys', 'delete']) {
  test(`committed ${failure} failure preserves two real worker clients with recovery`, async ({ page, context }) => {
    const server = await serveBuild(failure)
    const { errors, external } = await observeUpdates(context, server.url)
    const sibling = await context.newPage()
    const pages = [page, sibling]
    try {
      await Promise.all(pages.map(tab => tab.goto(server.url)))
      await Promise.all(pages.map(waitForController))
      await saveStudy(page, 'Fictional note survives committed cleanup failure')
      await (await offerUpdate(page, server)).click()

      for (const tab of pages) {
        const recovery = tab.getByRole('alertdialog', { name: recoveryTitle })
        await expect(recovery).toBeVisible()
        await expect(recovery).toBeFocused()
        await expect(recovery).toContainText('The update committed, but it could not finish safely.')
        expect(await tab.locator('#root').evaluate(element => element.inert)).toBe(true)
        expect(await tab.evaluate(() => document.body.inert)).toBe(false)
        await expect(tab.locator('#pwa-update-action')).toHaveCount(0)
        expect(await tab.evaluate(() => window.cleanupBlocked.reason)).toBe('failed')
        expect(await tab.evaluate(() => window.cleanupActivated === true)).toBe(false)
        expect(await tab.evaluate(() => sessionStorage.getItem('cleanup-loads'))).toBe('1')
        const committedBytes = await tab.evaluate(() => window.cleanupCommittedBytes)
        expect(JSON.stringify(committedBytes)).toContain('Fictional note survives committed cleanup failure')
        expect(await tab.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(committedBytes)
        const before = await tab.evaluate(() => ({ hash: location.hash, bytes: Object.fromEntries(Object.entries(localStorage)) }))
        for (const key of ['Space', 'ArrowRight', 'ArrowLeft', 'b', 'Home', 'End']) await tab.keyboard.press(key)
        expect(await tab.evaluate(() => ({ hash: location.hash, bytes: Object.fromEntries(Object.entries(localStorage)) }))).toEqual(before)
      }
      const cachesAfter = await page.evaluate(async id => ({
        names: await caches.keys(),
        marker: Boolean(await (await caches.open(`paldawn-foundation-${id}`)).match(new URL('.paldawn-update-request', location.href))),
      }), server.candidateBuildId)
      expect(cachesAfter.names).toHaveLength(2)
      expect(cachesAfter.marker).toBe(true)
      expect(errors).toEqual([])
      expect(external).toEqual([])
    } finally {
      await Promise.all(pages.map(tab => tab.close()))
      await server.close()
    }
  })
}

test('healthy real-worker update reloads both tabs exactly once and retains study bytes', async ({ page, context }) => {
  const server = await serveBuild()
  const { errors, external } = await observeUpdates(context, server.url)
  const sibling = await context.newPage(), pages = [page, sibling]
  try {
    await Promise.all(pages.map(tab => tab.goto(server.url)))
    await Promise.all(pages.map(waitForController))
    await saveStudy(page, 'Fictional saved note survives a healthy update')
    const action = await offerUpdate(page, server)
    const reloaded = pages.map(tab => tab.waitForEvent('load'))
    await action.click()
    await Promise.all(reloaded)
    await Promise.all(pages.map(waitForController))
    for (const tab of pages) {
      await expect(tab.getByRole('button', { name: 'My study', exact: true })).toBeVisible()
      const receipt = await tab.evaluate(() => ({
        loads: sessionStorage.getItem('cleanup-loads'), activations: sessionStorage.getItem('cleanup-activations'),
        committed: JSON.parse(sessionStorage.getItem('cleanup-committed-bytes')), bytes: Object.fromEntries(Object.entries(localStorage)),
        rootInert: document.getElementById('root').inert, request: sessionStorage.getItem('paldawn:pwa-update-reload:v1'),
      }))
      expect(receipt.loads).toBe('2')
      expect(receipt.activations).toBe('1')
      expect(receipt.rootInert).toBe(false)
      expect(receipt.request).toBeTruthy()
      expect(JSON.stringify(receipt.committed)).toContain('Fictional saved note survives a healthy update')
      expect(receipt.bytes).toEqual(receipt.committed)
      await tab.getByRole('button', { name: 'My study', exact: true }).click()
      await expect(tab.getByLabel('Private note for Approach')).toHaveValue('Fictional saved note survives a healthy update')
      await expect(tab.getByRole('button', { name: 'Personal checkpoint complete', exact: true })).toHaveAttribute('aria-pressed', 'true')
    }
    expect(await page.evaluate(() => sessionStorage.getItem('paldawn:pwa-update-reload:v1'))).toBe(await sibling.evaluate(() => sessionStorage.getItem('paldawn:pwa-update-reload:v1')))
    await page.waitForTimeout(500)
    for (const tab of pages) expect(await tab.evaluate(() => sessionStorage.getItem('cleanup-loads'))).toBe('2')
    expect(await page.evaluate(() => caches.keys())).toEqual([`paldawn-foundation-${server.candidateBuildId}`])
    expect(errors).toEqual([])
    expect(external).toEqual([])
  } finally { await Promise.all(pages.map(tab => tab.close())); await server.close() }
})

test('unsaved sibling note vetoes a real-worker update without reload or draft loss', async ({ page, context }) => {
  const server = await serveBuild()
  const { errors, external } = await observeUpdates(context, server.url)
  const sibling = await context.newPage(), pages = [page, sibling]
  try {
    await Promise.all(pages.map(tab => tab.goto(server.url)))
    await Promise.all(pages.map(waitForController))
    await saveStudy(page, 'Fictional durable note before the sibling draft')
    await sibling.getByRole('button', { name: 'My study', exact: true }).click()
    await expect(sibling.getByLabel('Private note for Approach')).toHaveValue('Fictional durable note before the sibling draft')
    const durableWorkspace = await sibling.evaluate(() => {
      const setItem = Storage.prototype.setItem
      Storage.prototype.setItem = function (key, value) {
        if (key === 'paldawn:workspace:v1') throw new DOMException('Fictional workspace failure', 'QuotaExceededError')
        return setItem.call(this, key, value)
      }
      return localStorage.getItem('paldawn:workspace:v1')
    })
    await sibling.getByLabel('Private note for Approach').fill('Fictional memory-only sibling draft remains open')
    await expect(sibling.getByText('Browser storage is unavailable.', { exact: true })).toBeVisible()
    await (await offerUpdate(page, server)).click()
    for (const tab of pages) {
      await expect.poll(() => tab.evaluate(() => window.cleanupBlocked?.reason)).toBe('unsaved')
      expect(await tab.locator('#root').evaluate(element => element.inert)).toBe(false)
      expect(await tab.evaluate(() => document.body.inert)).toBe(false)
      expect(await tab.evaluate(() => window.cleanupCommittedBytes ?? null)).toBeNull()
      expect(await tab.evaluate(() => window.cleanupActivated === true)).toBe(false)
      expect(await tab.evaluate(() => sessionStorage.getItem('cleanup-loads'))).toBe('1')
      expect(await tab.evaluate(() => localStorage.getItem('paldawn:workspace:v1'))).toBe(durableWorkspace)
    }
    await expect(page.getByRole('button', { name: 'Retry update and reload', exact: true })).toBeEnabled()
    await expect(sibling.getByLabel('Private note for Approach')).toHaveValue('Fictional memory-only sibling draft remains open')
    await sibling.getByLabel('Private note for Approach').fill('Fictional draft stays editable after the veto')
    await expect(sibling.getByLabel('Private note for Approach')).toHaveValue('Fictional draft stays editable after the veto')
    await page.waitForTimeout(500)
    for (const tab of pages) expect(await tab.evaluate(() => sessionStorage.getItem('cleanup-loads'))).toBe('1')
    expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).waiting.state)).toBe('installed')
    expect(errors).toEqual([])
    expect(external).toEqual([])
  } finally { await Promise.all(pages.map(tab => tab.close())); await server.close() }
})
