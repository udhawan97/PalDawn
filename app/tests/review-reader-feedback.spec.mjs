import { expect, test } from '@playwright/test'

const atlasKey = 'paldawn:atlas-study:v1'
const route = './#atlas/diabetes/pancreas-senses?part=pancreas'
const noteLabel = /Private note · stored only in this browser/

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript((key) => {
    if (!localStorage.getItem('paldawn:settings:v1')) localStorage.setItem('paldawn:settings:v1', JSON.stringify({ version: 1, state: { reducedMotion: true, textVoyagePreferred: true } }))
    window.rejectAtlasWrite = false
    const write = Storage.prototype.setItem
    Storage.prototype.setItem = function (name, value) {
      if (name === key && window.rejectAtlasWrite) throw new DOMException('Fictional storage rejection', 'QuotaExceededError')
      return write.call(this, name, value)
    }
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { window.copiedStep = text } } })
  }, atlasKey)
})

async function copyStep(page) {
  await page.getByRole('button', { name: 'Share step', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Step sharing' })).toHaveText('Step link copied.')
  expect(await page.evaluate(() => window.copiedStep)).toContain('#atlas/diabetes/pancreas-senses?part=pancreas')
}

test('sharing cannot hide failed note persistence and successful retry survives reload', async ({ page }) => {
  await page.goto(route)
  await copyStep(page)
  await page.getByRole('button', { name: 'Private note', exact: true }).click()
  await page.evaluate(() => { window.rejectAtlasWrite = true })
  await page.getByLabel(noteLabel).fill('Fictional note with blocked persistence')
  await expect(page.locator('.atlas-study-status')).toContainText('browser storage is unavailable')
  await expect(page.locator('.atlas-study-status')).toBeVisible()
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).records, atlasKey)).toEqual({})
  await copyStep(page)
  await expect(page.locator('.atlas-study-status')).toContainText('browser storage is unavailable')
  await page.evaluate(() => { window.rejectAtlasWrite = false })
  await page.getByLabel(noteLabel).fill('Fictional durable retry note')
  await expect(page.locator('.atlas-study-status')).toHaveText('Study saved on this device.')
  await page.reload()
  await page.getByRole('button', { name: 'Private note', exact: true }).click()
  await expect(page.getByLabel(noteLabel)).toHaveValue('Fictional durable retry note')
})

test('sharing cannot hide a sibling conflict or overwrite its durable copy', async ({ page }) => {
  await page.goto(route)
  await copyStep(page)
  await page.getByRole('button', { name: 'Private note', exact: true }).click()
  await page.evaluate(() => { window.rejectAtlasWrite = true })
  await page.getByLabel(noteLabel).fill('Fictional unsaved conflict draft')
  const sibling = await page.context().newPage()
  await sibling.goto('./')
  const siblingBytes = JSON.stringify({ narration: 'plain', lastPosition: null, records: { 'stroke:vessel-event': { saved: true, studied: false, note: 'Fictional sibling durable note' } }, resetToken: null })
  await sibling.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: atlasKey, value: siblingBytes })
  await page.bringToFront()
  await expect(page.locator('.atlas-study-status')).toContainText('Another tab changed Atlas study data')
  await page.evaluate(() => { window.rejectAtlasWrite = false })
  await copyStep(page)
  await page.getByLabel(noteLabel).fill('Fictional edited conflict draft')
  await expect(page.locator('.atlas-study-status')).toContainText('Another tab changed Atlas study data')
  await expect(page.getByLabel(noteLabel)).toHaveValue('Fictional edited conflict draft')
  expect(await sibling.evaluate((key) => localStorage.getItem(key), atlasKey)).toBe(siblingBytes)
  await sibling.close()
})

test('sharing cannot hide the capacity refusal or evict existing notes', async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify({ narration: 'plain', lastPosition: null, records: Object.fromEntries(Array.from({ length: 150 }, (_, index) => [`retired-${index}:removed`, { saved: true, studied: false, note: `Fictional preserved note ${index}` }])), resetToken: null }))
  }, atlasKey)
  await page.goto(route)
  await copyStep(page)
  await page.getByRole('button', { name: 'Save step', exact: true }).click()
  await expect(page.locator('.atlas-study-status')).toContainText('Atlas study is full (150 records)')
  await copyStep(page)
  await expect(page.locator('.atlas-study-status')).toContainText('Atlas study is full (150 records)')
  const records = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).records, atlasKey)
  expect(Object.keys(records)).toHaveLength(150)
  expect(records['retired-0:removed'].note).toBe('Fictional preserved note 0')
  expect(records['diabetes:pancreas-senses']).toBeUndefined()
})

for (const outcome of ['cancelled', 'unavailable', 'shared']) {
  test(`native share ${outcome} feedback stays separate from study state`, async ({ page }) => {
    await page.goto(route)
    await page.evaluate((mode) => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: mode === 'unavailable' ? undefined : async () => {
        if (mode === 'cancelled') throw new DOMException('Fictional share cancellation', 'AbortError')
      } })
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Fictional copy rejection') } } })
      document.execCommand = () => false
    }, outcome)
    await page.getByRole('button', { name: 'Save step', exact: true }).click()
    await page.getByRole('button', { name: 'Share step', exact: true }).click()
    await expect(page.getByRole('status', { name: 'Step sharing' })).toHaveText(outcome === 'shared' ? 'Step shared.' : outcome === 'cancelled' ? 'Share cancelled.' : 'Sharing and copy are unavailable.')
    await expect(page.locator('.atlas-study-status')).toHaveText('Study saved on this device.')
    await expect(page.getByRole('button', { name: 'Saved step', exact: true })).toHaveAttribute('aria-pressed', 'true')
  })
}

test('Atlas skip preserves the exact step, structure and history while moving keyboard focus', async ({ page }, testInfo) => {
  await page.goto(route)
  const address = page.url()
  const historyLength = await page.evaluate(() => history.length)
  const skip = page.getByRole('link', { name: 'Skip to disease explorer' })
  await skip.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#atlas-title')).toBeFocused()
  expect(page.url()).toBe(address)
  expect(await page.evaluate(() => history.length)).toBe(historyLength)
  // macOS WebKit uses Option+Tab to traverse every control when full keyboard access is off.
  const nextControl = process.platform === 'darwin' && testInfo.project.name === 'webkit' ? 'Alt+Tab' : 'Tab'
  await page.keyboard.press(nextControl)
  await expect(page.getByRole('button', { name: 'Plain English', exact: true })).toBeFocused()
  const recipient = await page.context().newPage()
  await recipient.goto(address)
  await expect(recipient.getByRole('heading', { name: 'The pancreas releases insulin', exact: true })).toBeVisible()
  await expect(recipient).toHaveURL(/#atlas\/diabetes\/pancreas-senses\?part=pancreas$/)
  await recipient.close()
})

test('Intro, voyage and completion skips preserve routes and focus their content', async ({ page }) => {
  await page.goto('./#home')
  const skipTo = async (name, target) => {
    const address = page.url()
    const historyLength = await page.evaluate(() => history.length)
    await page.getByRole('link', { name }).focus()
    await page.keyboard.press('Enter')
    await expect(page.locator(target)).toBeFocused()
    expect(page.url()).toBe(address)
    expect(await page.evaluate(() => history.length)).toBe(historyLength)
  }
  await skipTo('Skip to introduction', '#intro-title')
  await page.getByRole('button', { name: 'Enter step mode', exact: true }).click()
  await skipTo('Skip to voyage controls', '#flight-controls')
  await page.locator('#flight-controls').focus()
  await page.keyboard.press('End')
  await expect(page.locator('#completion-summary')).toBeVisible()
  await skipTo('Skip to completion summary', '#completion-summary')
})
