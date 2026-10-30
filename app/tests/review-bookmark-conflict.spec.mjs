import { expect, test } from '@playwright/test'

const KEY = 'paldawn:bookmarks:v1'
const saved = page => page.getByRole('button', { name: 'Saved', exact: true })
const save = page => page.getByRole('button', { name: 'Save stage', exact: true })
const notice = page => page.locator('.system-banner-bookmarks')
const durable = page => page.evaluate(key => localStorage.getItem(key), KEY)

async function install(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(key => {
    localStorage.setItem('paldawn:settings:v1', JSON.stringify({ version: 1, state: { textVoyagePreferred: true, reducedMotion: true } }))
    window.bookmarkPageToken = Math.random()
    window.blockBookmarkWrites = false
    window.blockBookmarkReads = false
    window.blockWorkspaceWrites = false
    const setItem = Storage.prototype.setItem, getItem = Storage.prototype.getItem
    Storage.prototype.setItem = function (name, value) {
      if ((name === key && window.blockBookmarkWrites) || (name === 'paldawn:workspace:v1' && window.blockWorkspaceWrites)) throw new DOMException('Fictional write failure', 'QuotaExceededError')
      return setItem.call(this, name, value)
    }
    Storage.prototype.getItem = function (name) {
      if (name === key && window.blockBookmarkReads) throw new DOMException('Fictional read failure', 'SecurityError')
      return getItem.call(this, name)
    }
    window.updateReplies = []
    class Worker {
      scriptURL = new URL('sw.js', location.href).href
      postMessage(message) {
        window.updateReplies.push(message)
        if (message.type === 'PALDAWN_UPDATE_PREPARED' && !message.ready) queueMicrotask(() => {
          const event = new Event('message')
          Object.defineProperties(event, { data: { value: { type: 'PALDAWN_UPDATE_BLOCKED', requestId: message.requestId, reason: 'unsaved' } }, source: { value: this } })
          serviceWorker.dispatchEvent(event)
        })
      }
    }
    Object.defineProperty(window, 'ServiceWorker', { configurable: true, value: Worker })
    const worker = new Worker()
    const serviceWorker = Object.assign(new EventTarget(), { controller: worker, register: async () => ({ waiting: null, addEventListener() {} }) })
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: serviceWorker })
    window.prepareBookmarkUpdate = requestId => {
      const event = new Event('message')
      Object.defineProperties(event, { data: { value: { type: 'PALDAWN_PREPARE_UPDATE', requestId } }, source: { value: worker } })
      serviceWorker.dispatchEvent(event)
    }
  }, KEY)
}

async function enter(page) {
  await page.goto('./')
  await page.getByRole('button', { name: 'Enter step mode', exact: true }).click()
}

async function prepare(page, requestId, ready) {
  await page.evaluate(id => window.prepareBookmarkUpdate(id), requestId)
  await expect.poll(() => page.evaluate(id => window.updateReplies.find(reply => reply.type === 'PALDAWN_UPDATE_PREPARED' && reply.requestId === id)?.ready, requestId)).toBe(ready)
}

async function showNotices(page) {
  const summary = page.locator('.system-notice-summary')
  if (await summary.getAttribute('aria-expanded') !== 'true') await summary.click()
}

async function expectRecoveryActionFits(page, name) {
  const bounds = await page.getByRole('button', { name, exact: true }).evaluate(button => {
    const action = button.getBoundingClientRect(), notice = button.closest('.system-banner-bookmarks').getBoundingClientRect()
    const range = document.createRange(); range.selectNodeContents(button); const label = range.getBoundingClientRect()
    return { left: action.left, right: action.right, top: action.top, bottom: action.bottom, labelLeft: label.left, labelRight: label.right, noticeLeft: notice.left, noticeRight: notice.right, noticeTop: notice.top, noticeBottom: notice.bottom, width: innerWidth, height: innerHeight }
  })
  expect(bounds.left).toBeGreaterThanOrEqual(Math.max(0, bounds.noticeLeft))
  expect(bounds.right).toBeLessThanOrEqual(Math.min(bounds.width, bounds.noticeRight))
  expect(bounds.top).toBeGreaterThanOrEqual(Math.max(0, bounds.noticeTop))
  expect(bounds.bottom).toBeLessThanOrEqual(Math.min(bounds.height, bounds.noticeBottom))
  expect(bounds.labelLeft).toBeGreaterThanOrEqual(bounds.left)
  expect(bounds.labelRight).toBeLessThanOrEqual(bounds.right)
  await expect(page.locator('.system-banner').filter({ hasText: 'Local changes are not being saved.' })).toHaveCSS('flex-direction', 'row')
}

for (const width of [320, 375, 414, 1440]) for (const change of ['add', 'remove']) {
  test(`failed bookmark ${change} survives sibling changes and vetoes update at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width < 500 ? 568 : 900 }); await install(page); await enter(page)
    await save(page).click()
    const sibling = await page.context().newPage(); await install(sibling); await enter(sibling)
    if (change === 'add') await page.getByLabel('Journey position').fill('350')
    await page.evaluate(() => { window.blockBookmarkWrites = true })
    await (change === 'add' ? save(page) : saved(page)).click()
    await expect(change === 'add' ? saved(page) : save(page)).toBeVisible()
    if (change === 'add') await saved(sibling).click()
    else { await sibling.getByLabel('Journey position').fill('350'); await save(sibling).click() }
    await page.bringToFront()
    await expect(change === 'add' ? saved(page) : save(page)).toBeVisible()
    await showNotices(page)
    await expect(notice(page)).toContainText('Another tab changed saved stages')
    await expect(page.getByRole('button', { name: 'Retry saving stages', exact: true })).toHaveCount(0)
    await expectRecoveryActionFits(page, 'Use saved stages')
    if (width === 320 && change === 'add') await page.screenshot({ path: testInfo.outputPath('bookmark-conflict-320.png'), fullPage: true })
    const siblingBytes = await durable(sibling)
    await page.evaluate(() => { window.blockBookmarkWrites = false })
    await prepare(page, 'conflicted', false)
    expect(await durable(sibling)).toBe(siblingBytes)
    if (await page.locator('.system-notice-summary').getAttribute('aria-expanded') === 'true') await page.locator('.system-notice-summary').click()
    await (change === 'add' ? saved(page) : save(page)).click()
    expect(await durable(sibling)).toBe(siblingBytes)
    await (change === 'add' ? save(page) : saved(page)).click()
    expect(await durable(sibling)).toBe(siblingBytes)
    await showNotices(page)
    await page.getByRole('button', { name: 'Use saved stages', exact: true }).click()
    await expect(change === 'add' ? save(page) : saved(page)).toBeVisible()
    await expect(notice(page)).toHaveCount(0)
    await prepare(page, 'resolved', true)
    expect(await durable(sibling)).toBe(siblingBytes)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

for (const width of [320, 375, 414, 1440]) test(`failed save retries without a conflict and clean tabs keep synchronizing at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: width < 500 ? 568 : 900 }); await install(page); await enter(page)
  const sibling = await page.context().newPage(); await install(sibling); await enter(sibling)
  await page.evaluate(() => { window.blockBookmarkWrites = true }); await save(page).click()
  await showNotices(page)
  await expect(page.getByRole('button', { name: 'Retry saving stages', exact: true })).toBeVisible()
  await expectRecoveryActionFits(page, 'Retry saving stages')
  if (width === 320) await page.screenshot({ path: testInfo.outputPath('bookmark-retry-320.png'), fullPage: true })
  await page.evaluate(() => { window.blockBookmarkWrites = false })
  await page.getByRole('button', { name: 'Retry saving stages', exact: true }).click()
  await expect(notice(page)).toHaveCount(0); await expect(saved(sibling)).toBeVisible()
  await saved(sibling).click(); await expect(save(page)).toBeVisible()
  await save(sibling).click(); await expect(saved(page)).toBeVisible()
  await prepare(page, 'healthy', true)
  await page.reload(); await page.getByRole('button', { name: 'Enter step mode', exact: true }).click()
  await expect(saved(page)).toBeVisible()
})

for (const keepWorkspaceDraft of [false, true]) test(`saved-stage read recovery clears its warning ${keepWorkspaceDraft ? 'but preserves an unrelated workspace warning and draft' : 'when isolated'}`, async ({ page }) => {
  await install(page); await enter(page); await save(page).click()
  if (keepWorkspaceDraft) {
    await page.evaluate(() => { window.blockWorkspaceWrites = true })
    await page.getByRole('button', { name: 'Private note', exact: true }).click()
    await page.getByLabel('Private note for Approach').fill('Fictional unrelated memory note')
    await page.getByRole('button', { name: 'Close panel', exact: true }).click()
  }
  await page.getByLabel('Journey position').fill('350')
  await page.evaluate(() => { window.blockBookmarkWrites = true }); await save(page).click()
  const sibling = await page.context().newPage(); await install(sibling); await enter(sibling); await saved(sibling).click()
  await page.bringToFront(); await showNotices(page)
  await expect(notice(page)).toContainText('Another tab changed saved stages')
  const token = await page.evaluate(() => window.bookmarkPageToken)
  await page.evaluate(() => { window.blockBookmarkReads = true })
  await page.getByRole('button', { name: 'Use saved stages', exact: true }).click()
  await expect(notice(page)).toContainText('Saved stages could not be read')
  await expect(saved(page)).toBeVisible()
  await page.evaluate(() => { window.blockBookmarkReads = false })
  await page.getByRole('button', { name: 'Use saved stages', exact: true }).click()
  await expect(save(page)).toBeVisible()
  expect(await page.evaluate(() => window.bookmarkPageToken)).toBe(token)
  const storageWarning = page.locator('.system-banner-storage').filter({ hasText: 'Local changes are not being saved.' })
  if (keepWorkspaceDraft) {
    await expect(storageWarning).toBeVisible()
    await page.getByRole('button', { name: 'Private note', exact: true }).click()
    await page.getByRole('navigation', { name: 'Workspace stages' }).getByRole('button', { name: /Approach/ }).click()
    await expect(page.getByLabel('Private note for Approach')).toHaveValue('Fictional unrelated memory note')
    await expect(page.getByText('Browser storage is unavailable.', { exact: true })).toBeVisible()
  } else await expect(storageWarning).toHaveCount(0)
})

test('a committed reset replaces dirty bookmarks instead of reviving their old generation', async ({ page }) => {
  await install(page); await enter(page); await save(page).click()
  await page.getByLabel('Journey position').fill('350')
  await page.evaluate(() => { window.blockBookmarkWrites = true }); await save(page).click()
  const sibling = await page.context().newPage(); await install(sibling); await enter(sibling); await saved(sibling).click()
  await page.bringToFront(); await showNotices(page); await expect(notice(page)).toContainText('Another tab changed saved stages')
  const token = await page.evaluate(() => window.bookmarkPageToken)
  await sibling.getByRole('button', { name: 'Settings', exact: true }).click()
  await sibling.getByRole('button', { name: 'Reset local data', exact: true }).click()
  await sibling.getByRole('button', { name: 'Confirm reset', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.bookmarkPageToken)).not.toBe(token)
  expect(await durable(page)).toBeNull()
  await expect(notice(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Enter step mode', exact: true }).click()
  await expect(save(page)).toBeVisible()
})
