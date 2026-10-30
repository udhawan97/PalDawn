import { expect, test } from '@playwright/test'

const route = './#atlas/lower-respiratory-infection/arrival'
const lastPosition = page => page.evaluate(() => JSON.parse(localStorage.getItem('paldawn:atlas-study:v1')).lastPosition)

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => localStorage.setItem('paldawn:settings:v1', JSON.stringify({
    version: 1, state: { textVoyagePreferred: true, reducedMotion: true },
  })))
})

for (const width of [320, 375, 414, 1440]) {
  for (const panel of ['Settings', 'Help', 'Transcript']) {
    test(`${panel} owns Atlas shortcuts at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(route)
      await expect(page.locator('#atlas-title')).toBeVisible()
      const address = page.url()
      await expect.poll(() => lastPosition(page)).toEqual({ diseaseId: 'lower-respiratory-infection', stepId: 'arrival' })
      if (panel === 'Transcript') {
        await page.locator('#atlas-title').focus()
        await page.keyboard.press('t')
      } else {
        const trigger = page.getByRole('button', { name: panel, exact: true })
        await trigger.focus()
        await page.keyboard.press('Enter')
      }
      const drawer = page.locator('.drawer')
      await expect(drawer).toHaveAttribute('aria-modal', width <= 470 ? 'true' : 'false')
      const close = drawer.getByRole('button', { name: 'Close panel', exact: true })
      await close.focus()
      for (const key of ['ArrowRight', 'ArrowLeft', '/']) {
        await page.keyboard.press(key)
        expect(page.url()).toBe(address)
        await expect(close).toBeFocused()
        expect(await lastPosition(page)).toEqual({ diseaseId: 'lower-respiratory-infection', stepId: 'arrival' })
      }
      if (panel === 'Transcript') {
        const search = drawer.getByLabel('Find a stage or phrase')
        await search.fill('Portal')
        await search.press('ArrowLeft')
        await search.press('x')
        await expect(search).toHaveValue('Portaxl')
        expect(page.url()).toBe(address)
      }
      await page.keyboard.press('Escape')
      await expect(drawer).toHaveCount(0)
      await page.locator('#atlas-title').focus()
      await page.keyboard.press('ArrowRight')
      await expect(page).toHaveURL(/#atlas\/lower-respiratory-infection\/inflammation$/)
      await expect.poll(() => lastPosition(page)).toEqual({ diseaseId: 'lower-respiratory-infection', stepId: 'inflammation' })
    })
  }
}

test('Atlas private-note and search arrows retain native text editing', async ({ page }) => {
  await page.goto(route)
  await page.getByRole('button', { name: 'Private note', exact: true }).click()
  const note = page.getByLabel(/Private note · stored only in this browser/)
  await note.fill('Fictional note')
  await note.press('ArrowLeft')
  await note.press('x')
  await expect(note).toHaveValue('Fictional notxe')
  await expect(page).toHaveURL(/#atlas\/lower-respiratory-infection\/arrival$/)
  const search = page.getByLabel('Find a route', { exact: true })
  await search.fill('Lungs')
  await search.press('ArrowLeft')
  await search.press('x')
  await expect(search).toHaveValue('Lungxs')
  await expect(page).toHaveURL(/#atlas\/lower-respiratory-infection\/arrival$/)
})
