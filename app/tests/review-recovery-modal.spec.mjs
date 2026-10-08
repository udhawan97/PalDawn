import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 40_000 })
const atlasKey = 'paldawn:atlas-study:v1'
const bodyName = 'Two body views, with different jobs.'
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    if (!localStorage.getItem('paldawn:settings:v1')) localStorage.setItem('paldawn:settings:v1', JSON.stringify({ reducedMotion: true, textVoyagePreferred: true }))
  })
})

for (const width of [320, 1440]) {
  for (const surface of ['desk', 'catalog']) {
    test(`${surface} owns keyboard and focus at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('./')
      const trigger = page.getByRole('button', { name: surface === 'desk' ? 'My condition study' : 'Conditions', exact: true })
      await trigger.click()
      const dialog = page.getByRole('dialog', { name: surface === 'desk' ? 'Your Atlas study desk' : /Fifty conditions/ })
      const close = dialog.getByRole('button', { name: surface === 'desk' ? 'Close Atlas study desk' : 'Close condition curriculum' })
      await expect(surface === 'catalog' ? dialog.locator('input[type="search"]').first() : close).toBeFocused()
      await close.focus()
      const route = page.url()
      for (const key of ['t', 'n', '?', '/', 'ArrowLeft', 'ArrowRight', 'Home', 'End']) {
        await page.keyboard.press(key)
        await expect(close).toBeFocused()
        await expect(page.locator('.drawer')).toHaveCount(0)
        expect(page.url()).toBe(route)
      }
      expect(await page.locator('#root').evaluate((root) => root.inert)).toBe(true)
      const controls = dialog.locator('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]')
      const visible = await controls.evaluateAll((items) => items.map((item, index) => item.getClientRects().length ? index : -1).filter((index) => index >= 0))
      await controls.nth(visible[0]).focus()
      await page.keyboard.press('Shift+Tab')
      await expect(controls.nth(visible.at(-1))).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(controls.nth(visible[0])).toBeFocused()
      const search = dialog.locator('input[type="search"]').first()
      await search.fill('diabetes')
      await expect(search).toHaveValue('diabetes')
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(surface === 'desk' ? trigger : page.getByRole('button', { name: 'Browse 50' })).toBeFocused()
      expect(await page.locator('#root').evaluate((root) => root.inert)).toBe(false)
      await page.keyboard.press('t')
      await expect(page.getByRole('dialog', { name: 'Full transcript' })).toBeVisible()
    })
  }
}

test('Desk from Study keeps its destination and opens an exact step with return history', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto('./#study')
  await page.getByRole('button', { name: 'Open condition study' }).click()
  const desk = page.getByRole('dialog', { name: 'Your Atlas study desk' })
  await desk.getByRole('button', { name: 'Close Atlas study desk' }).focus()
  await page.keyboard.press('t')
  await expect(page.locator('.drawer')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(desk).toHaveCount(0)
  await expect(page).toHaveURL(/#study$/)
  await page.getByRole('button', { name: 'My condition study' }).click()
  await desk.getByRole('button', { name: 'Body systems' }).click()
  await desk.getByRole('button', { name: /^Pancreas / }).click()
  await desk.locator('.atlas-system-results li').filter({ hasText: 'The pancreas releases insulin' }).getByRole('button', { name: 'Open exact step' }).click()
  await expect(page).toHaveURL(/#atlas\/diabetes\/pancreas-senses\?part=pancreas$/)
  await expect(page.getByRole('heading', { name: 'The pancreas releases insulin' })).toBeVisible()
  await page.getByRole('button', { name: /Back to overview/ }).click()
  await expect(page).toHaveURL(/#study$/)
  await expect(page.getByRole('dialog', { name: 'Compare, note, and continue.' })).toBeFocused()
})

for (const kind of ['maximum', 'near-old-limit']) {
  test(`${kind} backup survives preview, replacement, export, and reload`, async ({ page }) => {
    const makeBackup = (length) => ({ schema_version: 3, local_only: true, atlasStudy: { narration: 'clinical', lastPosition: null, records: Object.fromEntries(Array.from({ length: 150 }, (_, i) => [`retired-${i}:${'x'.repeat(140)}`, { saved: true, studied: true, note: '界'.repeat(length) }])) } })
    let input = makeBackup(1200)
    if (kind === 'near-old-limit') {
      let length = 1
      while (Buffer.byteLength(JSON.stringify(makeBackup(length + 1))) < 256 * 1024) length += 1
      input = makeBackup(length)
      expect(Buffer.byteLength(JSON.stringify(input))).toBeLessThan(256 * 1024)
    }
    await page.goto('./')
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.locator('#local-data-import').setInputFiles({ name: 'complete.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(input)) })
    await expect(page.getByRole('heading', { name: 'Replacement preview' })).toBeVisible()
    await expect(page.locator('.import-preview')).toContainText('150 Atlas notes')
    await page.getByRole('button', { name: 'Confirm replace local data' }).click()
    await page.waitForLoadState('load')
    await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)).records, atlasKey)).toEqual(input.atlasStudy.records)
    await page.reload()
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    // Capture the actual Blob passed to the download boundary. Native download
    // completion remains a separate browser gate; no filesystem export is claimed.
    await page.evaluate(() => {
      const create = URL.createObjectURL.bind(URL)
      URL.createObjectURL = (blob) => { window.backupPayload = blob.text(); return create(blob) }
    })
    await page.getByRole('button', { name: 'Download local data' }).click()
    const exported = await page.evaluate(() => window.backupPayload)
    expect(Buffer.byteLength(exported)).toBeGreaterThan(256 * 1024)
    expect(JSON.parse(exported).atlasStudy.records).toEqual(input.atlasStudy.records)
    await page.locator('#local-data-import').setInputFiles({ name: 'round-trip.json', mimeType: 'application/json', buffer: Buffer.from(exported) })
    await expect(page.getByRole('heading', { name: 'Replacement preview' })).toBeVisible()
    await page.getByRole('button', { name: 'Confirm replace local data' }).click()
    await page.waitForLoadState('load')
    await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)).records, atlasKey)).toEqual(input.atlasStudy.records)
  })
}

for (const width of [375, 1440]) {
  for (const direct of [false, true]) {
    test(`Body dialog has its name and restores focus at ${width}px (${direct ? 'direct' : 'Home'})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(direct ? './#body' : './')
      const opener = page.getByRole('button', { name: 'Explore the body', exact: true }).first()
      if (!direct) await opener.click()
      const dialog = page.getByRole('dialog', { name: bodyName })
      await expect(dialog).toBeVisible()
      await expect(dialog).toHaveAttribute('aria-modal', width <= 470 ? 'true' : 'false')
      await dialog.getByRole('button', { name: 'Close panel' }).click()
      await expect(dialog).toHaveCount(0)
      await expect(page).toHaveURL(/#home$/)
      if (!direct) await expect(opener).toBeFocused()
      else await expect.poll(() => page.evaluate(() => document.activeElement instanceof HTMLButtonElement && document.activeElement.getClientRects().length > 0 && !document.activeElement.closest('[inert]'))).toBe(true)
      await page.getByRole('button', { name: 'Settings', exact: true }).click()
      await expect(page.getByRole('dialog', { name: 'Flight settings' })).toBeVisible()
    })
  }
}
