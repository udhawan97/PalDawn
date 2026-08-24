import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

const BOOKMARKS_KEY = 'paldawn:bookmarks:v1'

async function pauseOnCurrentStage(page) {
  await page.bringToFront()
  await page.getByLabel('Journey position').fill('2')
  await expect(page.getByRole('heading', { name: 'Approach' })).toBeVisible()
}

test('playback speed persists and stays visible in the flight controls', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.locator('#playback-rate').selectOption('1.5')
  await page.reload()
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.locator('#playback-rate')).toHaveValue('1.5')
  await page.getByRole('button', { name: 'Close panel' }).click()
  await page.getByRole('button', { name: 'Begin the voyage' }).click()
  await expect(page.locator('.shortcut-hint output')).toHaveText('1.5×')
})

test('slash focuses transcript search and a result jumps to its stage', async ({ page }) => {
  await page.goto('./')
  await page.keyboard.press('/')

  const search = page.locator('#transcript-search')
  await expect(search).toBeFocused()
  await search.fill('threshold')
  await expect(page.getByText('1 stage shown')).toBeVisible()
  await expect(page.locator('.transcript-list > li')).toHaveCount(1)
  await page.getByRole('button', { name: 'Go to stage' }).click()

  await expect(page.locator('.drawer')).toHaveCount(0)
  await expect(page).toHaveURL(/#stage\/portal$/)
  await expect(page.getByRole('heading', { name: 'Portal' })).toBeVisible()
})

test('saved stages persist, export locally, and survive a voyage-only restart', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Begin the voyage' }).click()
  await page.getByRole('button', { name: 'Skip to next stage' }).click()
  await page.evaluate(() => document.activeElement?.blur())
  await page.keyboard.press('b')
  await expect(page.getByText('Stage saved on this device.').last()).toBeAttached()

  await page.reload()
  await page.getByRole('button', { name: 'Transcript' }).click()
  const saved = page.locator('.saved-stages')
  await expect(saved).toBeVisible()
  await expect(saved.getByRole('button', { name: 'Surface trace' })).toBeVisible()
  await page.getByRole('button', { name: 'Close panel' }).click()
  await page.getByRole('button', { name: 'Resume at Surface trace' }).click()

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByLabel('Quality tier').selectOption('low')
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download local data' }).click()
  const download = await downloadEvent
  const path = await download.path()
  expect(path).not.toBeNull()
  const exported = JSON.parse(await readFile(path, 'utf8'))
  expect(exported.local_only).toBe(true)
  expect(exported.bookmarks.stageIds).toEqual(['surface-trace'])

  await page.getByRole('button', { name: 'Restart voyage' }).click()
  await page.getByRole('button', { name: 'Confirm restart voyage' }).click()
  await expect(page.getByRole('button', { name: 'Begin the voyage' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Resume at' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByLabel('Quality tier')).toHaveValue('low')
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), BOOKMARKS_KEY)
  expect(stored.stageIds).toEqual(['surface-trace'])
})

test('saved stage changes synchronize across open tabs', async ({ page }) => {
  const otherPage = await page.context().newPage()
  await Promise.all([page.goto('./'), otherPage.goto('./')])
  await Promise.all([
    page.getByRole('button', { name: 'Begin the voyage' }).click(),
    otherPage.getByRole('button', { name: 'Begin the voyage' }).click(),
  ])
  await pauseOnCurrentStage(page)
  await pauseOnCurrentStage(otherPage)

  await page.getByRole('button', { name: 'Save stage' }).click()
  await expect(otherPage.getByRole('button', { name: 'Saved' })).toBeVisible()
  await otherPage.getByRole('button', { name: 'Saved' }).click()
  await expect(page.getByRole('button', { name: 'Save stage' })).toBeVisible()
})

test('sharing uses the native capability and then the copy fallback', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (payload) => { window.__paldawnShare = payload },
    })
  })
  await page.goto('./')
  await page.getByRole('button', { name: 'Begin the voyage' }).click()
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  await expect(page.getByText('Stage shared.')).toBeVisible()
  expect(await page.evaluate(() => window.__paldawnShare.url)).toMatch(/#stage\/approach$/)

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text) => { window.__paldawnCopy = text } },
    })
  })
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  await expect(page.getByText('Sharing is unavailable, so the stage was copied.')).toBeVisible()
  expect(await page.evaluate(() => window.__paldawnCopy)).toMatch(/#stage\/approach$/)
})

test('installation UI follows the browser capability without false success', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).click()
  const help = page.getByRole('button', { name: 'Installation help' })
  await expect(help).toBeVisible()
  await help.click()
  await expect(page.getByText('If your browser offers Install App or Add to Home Screen, use that command to install PalDawn.')).toBeVisible()

  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true })
    Object.defineProperties(event, {
      prompt: { value: async () => { window.__paldawnInstallPrompted = true } },
      userChoice: { value: Promise.resolve({ outcome: 'dismissed' }) },
    })
    window.dispatchEvent(event)
  })

  const install = page.getByRole('button', { name: 'Install PalDawn' })
  await expect(install).toBeVisible()
  await install.click()
  await expect(page.getByText('Install cancelled. Nothing changed.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Installation help' })).toBeVisible()

  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true })
    Object.defineProperties(event, {
      prompt: { value: async () => { window.__paldawnInstallPrompted = true } },
      userChoice: { value: Promise.resolve({ outcome: 'accepted' }) },
    })
    window.dispatchEvent(event)
  })
  await page.getByRole('button', { name: 'Install PalDawn' }).click()
  await expect(page.getByText('Install request accepted. Your browser will finish adding PalDawn.')).toBeVisible()
  expect(await page.evaluate(() => window.__paldawnInstallPrompted)).toBe(true)

  await page.context().addInitScript(() => {
    const matchMedia = window.matchMedia.bind(window)
    window.matchMedia = (query) => query === '(display-mode: standalone)'
      ? {
          matches: true,
          media: query,
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() { return true },
        }
      : matchMedia(query)
  })
  const installedPage = await page.context().newPage()
  await installedPage.goto('./')
  await installedPage.getByRole('button', { name: 'Settings' }).click()
  const installed = installedPage.getByRole('button', { name: 'PalDawn installed' })
  await expect(installed).toBeVisible()
  await expect(installed).toBeDisabled()
})
