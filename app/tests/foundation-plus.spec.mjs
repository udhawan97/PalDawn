import { expect, test } from '@playwright/test'

const JOURNEY_KEY = 'paldawn:journey:v1'
const SETTINGS_KEY = 'paldawn:settings:v1'
const RESET_KEY = 'paldawn:reset:v1'

async function pauseOnCurrentStage(page) {
  await page.bringToFront()
  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByLabel('Journey position').fill('2')
  await expect(page.getByRole('heading', { name: 'Approach' })).toBeVisible()
}

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
  }, { key: JOURNEY_KEY })
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
  test.setTimeout(60_000)
  const otherPage = await page.context().newPage()
  await Promise.all([page.goto('./'), otherPage.goto('./')])
  await Promise.all([
    page.getByRole('button', { name: 'Begin the voyage' }).click(),
    otherPage.getByRole('button', { name: 'Begin the voyage' }).click(),
  ])
  await pauseOnCurrentStage(page)
  await pauseOnCurrentStage(otherPage)
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
    }), { journeyKey: JOURNEY_KEY, settingsKey: SETTINGS_KEY, bookmarksKey: 'paldawn:bookmarks:v1', resetKey: RESET_KEY })
    expect(stored.journey).toBeNull()
    expect(stored.settings).toBeNull()
    expect(stored.bookmarks).toBeNull()
    expect(stored.reset).not.toBeNull()
    await expect(candidate.getByRole('button', { name: 'Begin the voyage' })).toBeVisible()
    await expect(candidate.getByRole('button', { name: 'Resume at' })).toHaveCount(0)
  }
})

test('reset marker failure stays on the page and reports retained data truthfully', async ({ page }) => {
  await page.addInitScript(({ journeyKey, resetKey }) => {
    localStorage.setItem(journeyKey, JSON.stringify({ progress: 0.42, narrationMode: 'guide' }))
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === resetKey) throw new DOMException('Injected reset failure', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  }, { journeyKey: JOURNEY_KEY, resetKey: RESET_KEY })
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Reset local data' }).click()
  await page.getByRole('button', { name: 'Confirm reset' }).click()

  await expect(page.getByText(/could not verify that every local record was cleared/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  const retained = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), JOURNEY_KEY)
  expect(retained.progress).toBe(0.42)
})

test('a rejected scene chunk offers a reload that makes a fresh request', async ({ page }) => {
  await page.addInitScript(({ journeyKey, seedKey }) => {
    if (sessionStorage.getItem(seedKey)) return
    sessionStorage.setItem(seedKey, 'true')
    localStorage.setItem(journeyKey, JSON.stringify({ progress: 0.37, narrationMode: 'guide' }))
  }, { journeyKey: JOURNEY_KEY, seedKey: 'paldawn:test:scene-retry-seeded' })
  let allowSceneChunk = false
  let sceneChunkRequests = 0
  await page.route(/SceneCanvas-[^/]+\.js(?:\?|$)/, async (route) => {
    sceneChunkRequests += 1
    if (!allowSceneChunk) await route.abort('failed')
    else await route.continue()
  })
  await page.goto('./')
  const reload = page.getByRole('button', { name: 'Reload the scene' })
  await expect(reload).toBeVisible()
  const beforeReload = sceneChunkRequests
  allowSceneChunk = true
  await Promise.all([page.waitForNavigation(), reload.click()])
  await expect(page.locator('canvas')).toHaveCount(1)
  expect(sceneChunkRequests).toBeGreaterThan(beforeReload)
  const restored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), JOURNEY_KEY)
  expect(restored.narrationMode).toBe('guide')
  expect(restored.progress).toBeGreaterThanOrEqual(0.37)
  expect(restored.progress).toBeLessThan(0.6)
  await expect(page).not.toHaveURL(/scene-retry=/)
})

test('a failed recovery stays honest and keeps the text voyage available', async ({ page }) => {
  await page.route(/SceneCanvas-[^/]+\.js(?:\?|$)/, (route) => route.abort('failed'))
  await page.goto('./')
  const reloadScene = page.getByRole('button', { name: 'Reload the scene' })
  await expect(reloadScene).toBeVisible()
  await Promise.all([page.waitForNavigation(), reloadScene.click()])

  await expect(page.getByText(/did not load after a fresh request/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reload the app' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue without 3D' }).click()
  await expect(page.locator('.app-root--text')).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
})
