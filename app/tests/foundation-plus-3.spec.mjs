import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

const WORKSPACE_KEY = 'paldawn:workspace:v1'

test('compare view and N shortcut open the current private note', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Begin the voyage' }).click()
  await page.getByRole('button', { name: 'Compare tracks' }).click()

  await expect(page.getByRole('heading', { name: 'Compare, note, and continue.' })).toBeVisible()
  await expect(page.locator('.track-columns article')).toHaveCount(2)
  await expect(page.locator('.track-columns article').first()).toContainText('Guide')
  await expect(page.locator('.track-columns article').last()).toContainText('Engineering')
  await page.getByRole('button', { name: 'Close panel' }).click()

  await page.keyboard.press('n')
  await expect(page.getByLabel('Private note for Approach')).toBeFocused()
  await expect(page.getByText('Do not enter patient or personal health information.')).toBeVisible()
})

test('private notes and personal checkpoints persist and synchronize across tabs', async ({ page }) => {
  const otherPage = await page.context().newPage()
  await Promise.all([page.goto('./'), otherPage.goto('./')])
  await Promise.all([
    page.getByRole('button', { name: 'Begin the voyage' }).click(),
    otherPage.getByRole('button', { name: 'Begin the voyage' }).click(),
  ])
  await Promise.all([page.keyboard.press('n'), otherPage.keyboard.press('n')])

  const note = 'Remember how the guide and engineering tracks describe the same authored stage.'
  await page.getByLabel('Private note for Approach').fill(note)
  await expect(otherPage.getByLabel('Private note for Approach')).toHaveValue(note)

  await otherPage.getByRole('button', { name: 'Mark personal checkpoint' }).click()
  await expect(page.getByRole('button', { name: 'Personal checkpoint complete' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('1 of 5 personal checkpoints')).toBeVisible()

  await page.reload()
  await page.keyboard.press('n')
  await expect(page.getByLabel('Private note for Approach')).toHaveValue(note)
  await expect(page.getByRole('button', { name: 'Personal checkpoint complete' })).toBeVisible()
})

test('study Markdown export contains both authored tracks and private workspace data', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Begin the voyage' }).click()
  await page.keyboard.press('n')
  await page.getByLabel('Private note for Approach').fill('Private export note')
  await page.getByRole('button', { name: 'Mark personal checkpoint' }).click()

  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download study Markdown' }).click()
  const download = await downloadEvent
  const path = await download.path()
  expect(path).not.toBeNull()
  const markdown = await readFile(path, 'utf8')
  expect(markdown).toContain('### Guide')
  expect(markdown).toContain('### Engineering')
  expect(markdown).toContain('Private export note')
  expect(markdown).toContain('Personal checkpoints are not evidence, approval, or medical review')
})

test('local backup import validates, previews, cancels, and explicitly replaces', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).click()
  const input = page.locator('#local-data-import')
  await input.setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{invalid'),
  })
  await expect(page.getByText('That file is not valid JSON.')).toBeVisible()

  const backup = JSON.stringify({
    schema_version: 1,
    local_only: true,
    settings: {
      version: 1,
      state: {
        qualityTier: 'low',
        reducedMotion: true,
        comfortVignette: false,
        highContrast: true,
        showTelemetry: false,
        captionScale: 'large',
        playbackRate: 1.5,
      },
    },
    journey: { progress: 0, narrationMode: 'engineering' },
    bookmarks: { stageIds: ['approach', 'not-a-stage'] },
    workspace: {
      notes: { approach: 'Imported private note', 'not-a-stage': 'reject' },
      checkpoints: ['approach', 'not-a-stage'],
    },
  })
  const file = { name: 'paldawn-local-data.json', mimeType: 'application/json', buffer: Buffer.from(backup) }
  await input.setInputFiles(file)
  await expect(page.getByRole('heading', { name: 'Replacement preview' })).toBeVisible()
  await expect(page.getByText(/0% route progress · 1 saved stages · 1 private notes · 1 personal checkpoints/)).toBeVisible()
  await page.getByRole('button', { name: 'Cancel import' }).click()
  await expect(page.getByText('Backup import cancelled. Nothing changed.')).toBeVisible()
  expect(await page.evaluate((key) => localStorage.getItem(key), WORKSPACE_KEY)).toBeNull()

  await input.setInputFiles(file)
  await Promise.all([
    page.waitForNavigation(),
    page.getByRole('button', { name: 'Confirm replace local data' }).click(),
  ])
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByLabel('Quality tier')).toHaveValue('low')
  await page.getByRole('button', { name: 'Close panel' }).click()
  await page.getByRole('button', { name: 'Study' }).click()
  await expect(page.getByLabel('Private note for Approach')).toHaveValue('Imported private note')
  await expect(page.getByRole('button', { name: 'Personal checkpoint complete' })).toBeVisible()
})

test('workspace remains readable without horizontal overflow at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('./')
  await page.getByRole('button', { name: 'Study' }).click()
  await expect(page.locator('.track-columns article')).toHaveCount(2)
  const overflow = await page.locator('.drawer-scroll').evaluate((element) => element.scrollWidth - element.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})
