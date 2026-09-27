import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

test('home presents clear body, condition, and study destinations', async ({ page }) => {
  await page.goto('./')

  await expect(page.getByRole('heading', { name: 'Explore the body' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Understand a condition' })).toBeVisible()

  await page.getByRole('button', { name: 'Explore the body' }).first().click()
  await expect(page.getByRole('heading', { name: 'Two body views, with different jobs.' })).toBeVisible()
  await expect(page.getByText(/qualified anatomy and clinical review is pending/)).toBeVisible()
  await expect(page).toHaveURL(/#body$/)

  await page.getByRole('button', { name: 'Home' }).click()
  await expect(page.getByRole('heading', { name: 'Enter the body. Follow what happens next.' })).toBeVisible()
  await expect(page).toHaveURL(/#home$/)

  await page.getByRole('button', { name: 'Conditions', exact: true }).click()
  await expect(page.getByRole('dialog', { name: /Fifty conditions/i })).toBeVisible()

  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'My study' }).click()
  await expect(page.getByRole('heading', { name: 'Compare, note, and continue.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your condition study' })).toBeVisible()
  await expect(page).toHaveURL(/#study$/)
})

test('lung infection opens an unobscured conceptual 3D diagram', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /Open lung infection/ }).click()

  const shell = page.locator('.flight-ui')
  await expect(shell).toHaveAttribute('data-atlas', 'true')
  await expect(page.getByRole('heading', { name: 'Lower respiratory infection' })).toBeVisible()
  await expect(page.getByText('Conceptual 3D diagram · visibly synthetic')).toBeVisible()
  await expect(page.locator('canvas')).toBeVisible()

  const backdrop = await shell.evaluate((element) => getComputedStyle(element, '::before').backgroundImage)
  expect(backdrop).not.toContain('237, 240, 233')
  expect(backdrop).toContain('radial-gradient')

  await page.getByRole('button', { name: 'Lungs', exact: true }).click()
  await page.getByRole('button', { name: 'Whole body' }).click()
  await expect(page.getByRole('button', { name: 'Whole body' })).toBeHidden()
  await expect(page.getByText(/Lungs anchors this phase/)).toBeVisible()
})

test('direct destination hashes remain usable on reload', async ({ page }) => {
  await page.goto('./#body')
  await expect(page.getByRole('heading', { name: 'Two body views, with different jobs.' })).toBeVisible()
  await expect(page).toHaveURL(/#body$/)

  await page.goto('./#conditions')
  await expect(page.getByRole('dialog', { name: /Fifty conditions/i })).toBeVisible()
  await expect(page).toHaveURL(/#conditions$/)

  await page.goto('./#study')
  await expect(page.getByRole('heading', { name: 'Compare, note, and continue.' })).toBeVisible()
  await expect(page).toHaveURL(/#study$/)
})

test('primary destinations stay synchronized with close, Back, Forward, and reload', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Explore the body' }).first().click()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Two body views, with different jobs.' })).toBeHidden()
  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Two body views, with different jobs.' })).toBeVisible()
  await page.getByRole('button', { name: 'Close panel' }).click()
  await expect(page).toHaveURL(/#home$/)

  await page.getByRole('button', { name: 'Conditions', exact: true }).click()
  await page.goBack()
  await expect(page.getByRole('dialog', { name: /Fifty conditions/i })).toBeHidden()
  await page.goForward()
  await expect(page.getByRole('dialog', { name: /Fifty conditions/i })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/#home$/)

  await page.getByRole('button', { name: 'My study' }).click()
  await page.getByRole('button', { name: 'Close panel' }).click()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Enter the body. Follow what happens next.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Compare, note, and continue.' })).toBeHidden()

  const historyLength = await page.evaluate(() => history.length)
  await page.getByRole('button', { name: 'Home' }).click()
  await page.getByRole('button', { name: 'Home' }).click()
  expect(await page.evaluate(() => history.length)).toBe(historyLength)
})
