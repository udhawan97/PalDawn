import { expect, test } from '@playwright/test'

const WORKSPACE = 'paldawn:workspace:v1'
const draft = 'Fictional draft retained through scene recovery'
test.describe.configure({ timeout: 60_000 })

async function installSession(page, { text = false, blocked = true, reducedMotion = true } = {}) {
  await page.addInitScript(({ text, blocked, reducedMotion, key }) => {
    localStorage.setItem('paldawn:settings:v1', JSON.stringify({ version: 1, state: { reducedMotion, textVoyagePreferred: text } }))
    window.blockStudyWrites = blocked
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (name, value) {
      if (window.blockStudyWrites && [key, 'paldawn:bookmarks:v1'].includes(name)) throw new DOMException('Fictional storage failure', 'QuotaExceededError')
      return setItem.call(this, name, value)
    }
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copiedStudy = text } } })
  }, { text, blocked, reducedMotion, key: WORKSPACE })
}

async function openDraft(page) {
  await page.goto('./')
  await page.getByRole('button', { name: 'Enter step mode', exact: true }).click()
  await page.getByRole('button', { name: 'Save stage', exact: true }).click()
  await page.getByRole('button', { name: 'Private note', exact: true }).click()
  await page.getByLabel('Private note for Approach').fill(draft)
  await page.getByRole('button', { name: 'Mark personal checkpoint', exact: true }).click()
  await page.getByLabel('Private note for Approach').focus()
}

test('initial scene-chunk failure returns focus to the usable text introduction', async ({ page }) => {
  await installSession(page)
  await page.route(/SceneCanvas-[^/]+\.js(?:\?|$)/, route => route.abort('failed'))
  await page.goto('./')
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reload the scene', exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Continue without 3D', exact: true }).click()
  await expect(page.locator('#intro-title')).toBeFocused()
  await expect(page.getByRole('button', { name: 'Enter step mode', exact: true })).toBeVisible()
})

test('scene recovery pauses an animated voyage and never resumes it implicitly', async ({ page }) => {
  await installSession(page, { reducedMotion: false, blocked: false })
  await page.goto('./')
  await page.getByRole('button', { name: 'Begin the voyage', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
  await loseContext(page)
  const position = await page.getByLabel('Journey position').inputValue()
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })))
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  expect(await page.getByLabel('Journey position').inputValue()).toBe(position)
  await page.getByRole('button', { name: 'Continue without 3D', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible()
  expect(await page.getByLabel('Journey position').inputValue()).toBe(position)
})

async function loseContext(page) {
  await expect(page.locator('canvas')).toBeVisible()
  const lost = await page.evaluate(() => {
    const context = document.querySelector('canvas')?.getContext('webgl2')
    const extension = context?.getExtension('WEBGL_lose_context')
    if (!extension) return false
    extension.loseContext()
    return true
  })
  expect(lost, 'Pinned browser must support actual WebGL context-loss acceptance').toBe(true)
  await expect(page.getByRole('heading', { name: 'The 3D map could not start.' })).toBeVisible()
}

for (const action of ['Retry the scene', 'Continue without 3D']) {
  test(`scene recovery preserves drafts and contains input through ${action}`, async ({ page }) => {
    await installSession(page)
    await openDraft(page)
    const position = await page.getByLabel('Journey position').inputValue()
    await loseContext(page)
    const recovery = page.getByRole('alertdialog')
    await expect(page.locator('.flight-ui')).toBeHidden()
    await expect(page.locator('.flight-ui')).toHaveAttribute('inert', '')
    await expect(recovery.getByRole('button').first()).toBeFocused()
    for (const key of ['n', 'b', 'Escape', 'End', 'ArrowRight']) await page.keyboard.press(key)
    expect(await page.getByLabel('Journey position').inputValue()).toBe(position)
    for (let index = 0; index < 4; index++) {
      await page.keyboard.press('Tab')
      expect(await recovery.evaluate(element => element.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Shift+Tab')
    expect(await recovery.evaluate(element => element.contains(document.activeElement))).toBe(true)
    await recovery.getByRole('button', { name: action, exact: true }).click()
    await expect(page.getByLabel('Private note for Approach')).toHaveValue(draft)
    await expect(page.getByLabel('Private note for Approach')).toBeFocused()
    await expect(page.getByRole('button', { name: 'Personal checkpoint complete', exact: true })).toBeVisible()
    await expect(page.getByText('Browser storage is unavailable.', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Copy study Markdown', exact: true }).click()
    await expect.poll(() => page.evaluate(() => window.copiedStudy)).toContain(draft)
    await expect.poll(() => page.evaluate(() => window.copiedStudy)).toContain('Personal checkpoint: Complete')
    await page.getByRole('button', { name: 'Close panel', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Saved', exact: true })).toHaveAttribute('aria-pressed', 'true')
    expect(await page.evaluate(key => localStorage.getItem(key), WORKSPACE)).toBeNull()
  })
}

test('3D and text preference transitions retain the memory-only session', async ({ page }) => {
  await installSession(page)
  await openDraft(page)
  await page.getByRole('button', { name: 'Close panel', exact: true }).click()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Use text voyage', exact: true }).click()
  await expect(page.locator('.app-root--text')).toBeVisible()
  await page.getByRole('button', { name: 'Return to 3D scene', exact: true }).click()
  await expect(page.locator('canvas')).toBeVisible()
  await page.getByRole('button', { name: 'Close panel', exact: true }).click()
  await page.getByRole('button', { name: 'Private note', exact: true }).click()
  await expect(page.getByLabel('Private note for Approach')).toHaveValue(draft)
  await expect(page.getByRole('button', { name: 'Personal checkpoint complete', exact: true })).toBeVisible()
})

test('conflicted workspace survives recovery, exports, and still vetoes PWA preparation', async ({ page }) => {
  await page.addInitScript(() => {
    window.updateReplies = []
    class Worker { scriptURL = new URL('sw.js', location.href).href; postMessage(message) { window.updateReplies.push(message) } }
    Object.defineProperty(window, 'ServiceWorker', { configurable: true, value: Worker })
    const worker = new Worker()
    const serviceWorker = Object.assign(new EventTarget(), { controller: worker, register: async () => ({ waiting: null, addEventListener() {} }) })
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: serviceWorker })
    window.sendUpdateMessage = data => {
      const event = new Event('message')
      Object.defineProperties(event, { data: { value: data }, source: { value: worker } })
      serviceWorker.dispatchEvent(event)
    }
  })
  await installSession(page)
  await openDraft(page)
  const sibling = await page.context().newPage()
  await sibling.goto('./')
  const remote = JSON.stringify({ notes: { portal: 'Fictional sibling note' }, checkpoints: ['portal'], resetToken: null })
  await sibling.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: WORKSPACE, value: remote })
  await expect(page.getByText('Another tab changed your workspace.', { exact: true })).toBeVisible()
  await page.bringToFront()
  await page.evaluate(() => { window.blockStudyWrites = false })
  await loseContext(page)
  await page.getByRole('button', { name: 'Continue without 3D', exact: true }).click()
  await expect(page.getByLabel('Private note for Approach')).toHaveValue(draft)
  await expect(page.getByText('Another tab changed your workspace.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Copy study Markdown', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.copiedStudy)).toContain(draft)
  await page.evaluate(() => window.sendUpdateMessage({ type: 'PALDAWN_PREPARE_UPDATE', requestId: 'scene-conflict' }))
  await expect.poll(() => page.evaluate(() => window.updateReplies.find(message => message.type === 'PALDAWN_UPDATE_PREPARED'))).toEqual({ type: 'PALDAWN_UPDATE_PREPARED', requestId: 'scene-conflict', ready: false })
  expect(await sibling.evaluate(key => localStorage.getItem(key), WORKSPACE)).toBe(remote)
})

const backup = progress => ({ name: `${progress}.json`, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ schema_version: 3, local_only: true, journey: { progress, narrationMode: 'guide' } })) })

async function installDeferredReads(page, recovery) {
  await page.addInitScript(recovery => {
    localStorage.setItem('paldawn:settings:v1', JSON.stringify({ version: 1, state: { textVoyagePreferred: true } }))
    if (recovery) localStorage.setItem('paldawn:reset-pending:v1', '{corrupt receipt')
    window.backupReads = {}
    const read = File.prototype.text
    File.prototype.text = function () {
      const name = this.name
      return read.call(this).then(text => new Promise((resolve, reject) => {
        window.backupReads[name] = { resolve: () => resolve(text), reject: () => reject(new Error('Fictional read failure')) }
      }))
    }
  }, recovery)
}

async function finishRead(page, name, outcome = 'resolve') {
  await expect.poll(() => page.evaluate(name => Boolean(window.backupReads[name]), name)).toBe(true)
  await page.evaluate(async ({ name, outcome }) => {
    window.backupReads[name][outcome]()
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  }, { name, outcome })
}

for (const recovery of [false, true]) {
  const scope = recovery ? 'preserved-record recovery' : 'ordinary'
  const inputId = recovery ? '#local-data-recovery-import' : '#local-data-import'
  const previewTitle = recovery ? 'Destructive replacement preview' : 'Replacement preview'
  const cancel = recovery ? 'Cancel replacement' : 'Cancel import'
  test(`${scope} import follows newest selection, cancellation and close`, async ({ page }) => {
    await installDeferredReads(page, recovery)
    await page.goto('./')
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const input = page.locator(inputId)
    const preview = page.getByRole('heading', { name: previewTitle, exact: true })
    await input.setInputFiles(backup(0.1))
    await input.setInputFiles(backup(0.8))
    await finishRead(page, '0.8.json')
    await expect(page.locator('.import-preview')).toContainText('80% route progress')
    await finishRead(page, '0.1.json')
    await expect(page.locator('.import-preview')).toContainText('80% route progress')

    await input.setInputFiles(backup(0.2))
    await expect(preview).toHaveCount(0)
    await input.setInputFiles(backup(0.7))
    await finishRead(page, '0.7.json')
    await page.getByRole('button', { name: cancel, exact: true }).click()
    await expect(input).toBeFocused()
    await finishRead(page, '0.2.json')
    await expect(preview).toHaveCount(0)

    await input.setInputFiles(backup(0.3))
    // Establish an unresolved read before unmounting the Settings panel.
    await expect.poll(() => page.evaluate(() => Boolean(window.backupReads['0.3.json']))).toBe(true)
    await page.getByRole('button', { name: 'Close panel', exact: true }).click()
    await finishRead(page, '0.3.json')
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await expect(preview).toHaveCount(0)

    await input.setInputFiles(backup(0.4))
    await input.setInputFiles(backup(0.6))
    await finishRead(page, '0.6.json')
    await finishRead(page, '0.4.json', 'reject')
    await expect(page.locator('.import-preview')).toContainText('60% route progress')
    await input.setInputFiles({ name: 'oversized.json', mimeType: 'application/json', buffer: Buffer.alloc(2 * 1024 * 1024 + 1) })
    await expect(preview).toHaveCount(0)
    await expect(page.getByText('That backup is larger than the 2 MiB local-data limit.')).toBeVisible()
    await input.setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{invalid') })
    await finishRead(page, 'invalid.json')
    await expect(preview).toHaveCount(0)
    await expect(page.getByText('That file is not valid JSON.')).toBeVisible()
    await input.setInputFiles(backup(0.9))
    await finishRead(page, '0.9.json', 'reject')
    await expect(preview).toHaveCount(0)
    await expect(page.getByText('That backup could not be read.')).toBeVisible()
  })
}
