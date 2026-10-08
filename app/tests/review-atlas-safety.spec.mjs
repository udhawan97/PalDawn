import { expect, test } from '@playwright/test'

const ATLAS_KEY = 'paldawn:atlas-study:v1'
const route = './#atlas/diabetes/pancreas-senses'
const noteLabel = /Private note · stored only in this browser/

test.beforeEach(async ({ page }) => {
  await page.addInitScript((atlasKey) => {
    localStorage.setItem('paldawn:settings:v1', JSON.stringify({ version: 1, state: { textVoyagePreferred: true, reducedMotion: true } }))
    window.atlasWritesBlocked = false
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === atlasKey && window.atlasWritesBlocked) throw new DOMException('Fictional quota failure', 'QuotaExceededError')
      return setItem.call(this, key, value)
    }
    // Observe the real export payload without depending on native download handling.
    const createObjectURL = URL.createObjectURL
    URL.createObjectURL = function (blob) {
      window.lastStudyExport = blob
      return createObjectURL.call(this, blob)
    }
    // Exercise page-side update preparation without installing a service worker.
    window.updateReplies = []
    class UpdateWorker {
      scriptURL = new URL('sw.js', window.location.href).href
      postMessage(message) { window.updateReplies.push(message) }
    }
    Object.defineProperty(window, 'ServiceWorker', { configurable: true, value: UpdateWorker })
    const worker = new UpdateWorker()
    const serviceWorker = Object.assign(new EventTarget(), {
      controller: worker,
      register: async () => ({ waiting: null, addEventListener() {} }),
    })
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: serviceWorker })
    window.sendUpdateMessage = data => {
      const event = new Event('message')
      Object.defineProperties(event, { data: { value: data }, source: { value: worker } })
      serviceWorker.dispatchEvent(event)
    }
  }, ATLAS_KEY)
})

async function expectUpdateReady(page, requestId, ready) {
  await page.evaluate(requestId => window.sendUpdateMessage({ type: 'PALDAWN_PREPARE_UPDATE', requestId }), requestId)
  await expect.poll(() => page.evaluate(requestId => window.updateReplies.find(message => message.requestId === requestId), requestId))
    .toEqual({ type: 'PALDAWN_UPDATE_PREPARED', requestId, ready })
  if (!ready) {
    await page.evaluate(requestId => window.sendUpdateMessage({ type: 'PALDAWN_UPDATE_BLOCKED', requestId, reason: 'unsaved' }), requestId)
  }
}

test('Atlas conflict protects sibling bytes through edits, navigation, export and PWA preparation', async ({ page }) => {
  await page.goto(route)
  await page.getByRole('button', { name: 'Private note', exact: true }).click()
  await page.evaluate(() => { window.atlasWritesBlocked = true })
  const note = page.getByLabel(noteLabel)
  await note.fill('Fictional private draft')
  await expect(page.locator('.atlas-study-status')).toContainText('storage is unavailable')

  const sibling = await page.context().newPage()
  await sibling.goto('./')
  const siblingBytes = JSON.stringify({ narration: 'plain', lastPosition: null, records: {
    'stroke:vessel-event': { saved: true, studied: false, note: 'Fictional sibling durable note' },
  }, resetToken: null })
  await sibling.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: ATLAS_KEY, value: siblingBytes })
  await page.bringToFront()
  await expect(page.locator('.atlas-study-status')).toContainText('Another tab changed Atlas study data')
  await expect(note).toHaveValue('Fictional private draft')
  await page.evaluate(() => { window.atlasWritesBlocked = false })
  await note.fill('Fictional private draft edited after conflict')
  await page.getByRole('button', { name: 'Clinical terms', exact: true }).click()
  await page.getByRole('button', { name: 'Next step →', exact: true }).click()
  await page.getByRole('button', { name: '← Previous', exact: true }).click()
  await expect(note).toHaveValue('Fictional private draft edited after conflict')
  await expectUpdateReady(page, 'atlas-conflict', false)
  expect(await sibling.evaluate(key => localStorage.getItem(key), ATLAS_KEY)).toBe(siblingBytes)

  await page.getByRole('button', { name: 'Compare pathway' }).click()
  const reader = page.getByRole('dialog', { name: 'Diabetes mellitus' })
  await reader.getByRole('checkbox', { name: 'Show private notes and include in export' }).check()
  await reader.getByRole('button', { name: 'Download selected study' }).click()
  await expect.poll(() => page.evaluate(async () => window.lastStudyExport?.text())).toContain('Fictional private draft edited after conflict')
  expect(await sibling.evaluate(key => localStorage.getItem(key), ATLAS_KEY)).toBe(siblingBytes)

  // Reload is the deliberate resolution after the draft has been copied/exported.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Diabetes mellitus', level: 1 })).toBeVisible()
  await expectUpdateReady(page, 'atlas-after-reload', true)
  const durable = await sibling.evaluate(key => JSON.parse(localStorage.getItem(key)), ATLAS_KEY)
  expect(durable.records['stroke:vessel-event'].note).toBe('Fictional sibling durable note')
  expect(durable.records['diabetes:pancreas-senses']).toBeUndefined()
  await sibling.close()
})

test('Atlas ordinary failed-save recovery permits update preparation and survives reload', async ({ page }) => {
  await page.goto(route)
  await page.getByRole('button', { name: 'Private note', exact: true }).click()
  await page.evaluate(() => { window.atlasWritesBlocked = true })
  await page.getByLabel(noteLabel).fill('Fictional retry draft')
  await expect(page.locator('.atlas-study-status')).toContainText('storage is unavailable')
  await expectUpdateReady(page, 'atlas-unavailable', false)
  await page.evaluate(() => { window.atlasWritesBlocked = false })
  await expectUpdateReady(page, 'atlas-retry', true)
  await page.reload()
  await page.getByRole('button', { name: 'Private note', exact: true }).click()
  await expect(page.getByLabel(noteLabel)).toHaveValue('Fictional retry draft')
})
