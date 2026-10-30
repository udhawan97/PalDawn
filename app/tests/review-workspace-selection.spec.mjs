import { expect, test } from '@playwright/test'

const workspaceKey = 'paldawn:workspace:v1'
const workspace = page => page.getByRole('dialog', { name: 'Compare, note, and continue.' })
const selectPortal = async page => workspace(page).getByRole('navigation', { name: 'Workspace stages' }).getByRole('button', { name: /Portal/ }).click()
const position = page => page.getByLabel('Journey position')

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addInitScript(() => localStorage.setItem('paldawn:settings:v1', JSON.stringify({
    version: 1, state: { textVoyagePreferred: true, reducedMotion: false },
  })))
})

for (const width of [320, 1440]) {
  for (const entry of ['Private note', 'Compare tracks', 'N shortcut']) {
    test(`initially playing workspace keeps the chosen stage at ${width}px via ${entry}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('./')
      await page.getByRole('button', { name: 'Begin the voyage', exact: true }).click()
      await expect.poll(async () => Number(await position(page).inputValue())).toBeGreaterThan(2)
      if (entry === 'N shortcut') await page.keyboard.press('n')
      else await page.getByRole('button', { name: entry, exact: true }).click()
      await selectPortal(page)
      const note = page.getByLabel('Private note for Portal')
      await note.fill('Fictional Portal reminder')
      const pausedAt = await position(page).inputValue()
      await page.waitForTimeout(250)
      await expect(note).toHaveValue('Fictional Portal reminder')
      await expect(position(page)).toHaveValue(pausedAt)
      await page.keyboard.press('Escape')
      await expect(workspace(page)).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible()
      await page.waitForTimeout(100)
      await expect(position(page)).toHaveValue(pausedAt)
    })
  }
}

test('explicit desktop playback cannot retarget an open private note across a stage boundary', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('./')
  await page.getByRole('button', { name: 'Begin the voyage', exact: true }).click()
  await position(page).fill('179')
  await page.getByRole('button', { name: 'Private note', exact: true }).click()
  await selectPortal(page)
  const note = page.getByLabel('Private note for Portal')
  await note.fill('Fictional note before crossing')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect.poll(async () => Number(await position(page).inputValue())).toBeGreaterThan(185)
  await expect(note).toHaveValue('Fictional note before crossing')
  await note.fill('Fictional note after crossing')
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), workspaceKey)
  expect(stored.notes.portal).toBe('Fictional note after crossing')
  expect(stored.notes['surface-trace']).toBeUndefined()
})

test('chosen note and checkpoint retain identity through close, reload and study export', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Begin the voyage', exact: true }).click()
  await page.getByRole('button', { name: 'Private note', exact: true }).click()
  await selectPortal(page)
  await page.getByLabel('Private note for Portal').fill('Fictional durable Portal reminder')
  await workspace(page).getByRole('button', { name: 'Mark personal checkpoint', exact: true }).click()
  await page.evaluate(() => {
    const create = URL.createObjectURL.bind(URL)
    URL.createObjectURL = blob => { window.reviewStudyExport = blob.text(); return create(blob) }
  })
  await workspace(page).getByRole('button', { name: 'Download study Markdown', exact: true }).click()
  const exported = await page.evaluate(() => window.reviewStudyExport)
  expect(exported).toContain('## 3. Portal')
  expect(exported).toContain('Fictional durable Portal reminder')
  expect(exported).toContain('- Personal checkpoint: Complete')
  await page.keyboard.press('Escape')
  await page.keyboard.press('n')
  await selectPortal(page)
  await expect(page.getByLabel('Private note for Portal')).toHaveValue('Fictional durable Portal reminder')
  await page.reload()
  await page.keyboard.press('n')
  await selectPortal(page)
  await expect(page.getByLabel('Private note for Portal')).toHaveValue('Fictional durable Portal reminder')
  await expect(workspace(page).getByRole('button', { name: 'Personal checkpoint complete', exact: true })).toHaveAttribute('aria-pressed', 'true')
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), workspaceKey)
  expect(stored.notes).toEqual({ portal: 'Fictional durable Portal reminder' })
  expect(stored.checkpoints).toEqual(['portal'])
})

test('already paused and reduced-motion workspace entry stays paused', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Begin the voyage', exact: true }).click()
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.getByRole('button', { name: 'Compare tracks', exact: true }).click()
  await selectPortal(page)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.locator('#reduced-motion').check()
  await page.keyboard.press('Escape')
  await page.keyboard.press('n')
  await selectPortal(page)
  await page.getByLabel('Private note for Portal').fill('Fictional still-frame reminder')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Advance stage', exact: true })).toBeVisible()
})

test('switching from playing Settings into study cancels the Settings auto-resume token', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Begin the voyage', exact: true }).click()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const pausedAt = await position(page).inputValue()
  await page.keyboard.press('n')
  await expect(workspace(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible()
  await page.waitForTimeout(150)
  await expect(position(page)).toHaveValue(pausedAt)
})
