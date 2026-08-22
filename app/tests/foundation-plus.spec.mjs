import { expect, test } from '@playwright/test'

const JOURNEY_KEY = 'paldawn:journey:p0.first-light:session:v3'
const SETTINGS_KEY = 'paldawn:settings:v1'
const RESET_KEY = 'paldawn:journey:p0.first-light:reset:v3'

test('skip navigation moves focus before and after entry', async ({ page }) => {
  await page.goto('./')

  const introSkip = page.getByRole('link', { name: 'Skip to introduction' })
  await introSkip.focus()
  await introSkip.press('Enter')
  await expect(page.locator('#intro-title')).toBeFocused()

  await page.getByRole('button', { name: 'Begin the voyage' }).click()
  const controlsSkip = page.getByRole('link', { name: 'Skip to voyage controls' })
  await controlsSkip.focus()
  await controlsSkip.press('Enter')
  await expect(page.locator('#flight-controls')).toBeFocused()
})

test('completion becomes the focused view on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('./')
  await page.getByRole('button', { name: 'Begin the voyage' }).click()

  const next = page.getByRole('button', { name: 'Skip to next stage' })
  for (let step = 0; step < 5; step += 1) await next.click()

  const summary = page.locator('#completion-summary')
  await expect(summary).toBeVisible()
  await expect(summary).toBeFocused()
  await expect(page.locator('#flight-controls')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Replay voyage' })).toBeVisible()
})

test('a persisted completed journey restores the summary', async ({ page }) => {
  await page.addInitScript(({ key }) => {
    localStorage.setItem(key, JSON.stringify({ progress: 1, narrationMode: 'engineering' }))
  }, { key: 'paldawn:journey:v1' })
  await page.goto('./')

  await expect(page.locator('#completion-summary')).toBeVisible()
  await expect(page.locator('#completion-summary')).toBeFocused()
  await expect(page.getByText('You completed the engineering track.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Resume at' })).toHaveCount(0)
})

test('settings selects provide 44px activation targets', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).click()

  const heights = await page.locator('.quality-setting select').evaluateAll((selects) =>
    selects.map((select) => select.getBoundingClientRect().height),
  )
  expect(heights).toHaveLength(3)
  expect(heights.every((height) => height >= 44)).toBe(true)
})

test('reset in one tab cannot be undone by another open tab', async ({ page }) => {
  const otherPage = await page.context().newPage()
  await Promise.all([page.goto('./'), otherPage.goto('./')])
  await Promise.all([
    page.getByRole('button', { name: 'Begin the voyage' }).click(),
    otherPage.getByRole('button', { name: 'Begin the voyage' }).click(),
  ])
  await otherPage.evaluate(() => document.activeElement?.blur())
  await otherPage.keyboard.press('b')
  await otherPage.getByRole('button', { name: 'Skip to next stage' }).click()
  await otherPage.getByRole('button', { name: 'Settings' }).click()
  await otherPage.getByLabel('Quality tier').selectOption('low')

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Reset local data' }).click()
  const pageReloaded = page.waitForEvent('load')
  const otherPageReloaded = otherPage.waitForEvent('load')
  await page.getByRole('button', { name: 'Confirm reset' }).click()
  await Promise.all([pageReloaded, otherPageReloaded])
  await page.waitForTimeout(3500)

  for (const candidate of [page, otherPage]) {
    const stored = await candidate.evaluate(({ journeyKey, settingsKey, bookmarksKey, resetKey }) => ({
      journey: localStorage.getItem(journeyKey),
      settings: localStorage.getItem(settingsKey),
      bookmarks: localStorage.getItem(bookmarksKey),
      reset: localStorage.getItem(resetKey),
    }), { journeyKey: JOURNEY_KEY, settingsKey: SETTINGS_KEY, bookmarksKey: 'paldawn:journey:p0.first-light:bookmarks:v3', resetKey: RESET_KEY })
    expect(stored.journey).toBeNull()
    expect(stored.settings).toBeNull()
    expect(stored.bookmarks).toBeNull()
    expect(stored.reset).not.toBeNull()
    await expect(candidate.getByRole('button', { name: 'Begin the voyage' })).toBeVisible()
    await expect(candidate.getByRole('button', { name: 'Resume at' })).toHaveCount(0)
  }
})
