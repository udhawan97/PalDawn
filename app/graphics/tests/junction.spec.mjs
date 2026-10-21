import { test, expect } from '@playwright/test'

const scene = page => page.getByRole('region', { name: 'Interactive junction study' })
async function settled(page) {
  await expect(scene(page)).toHaveAttribute('data-renderer', 'ready')
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}
async function ready(page) { await page.goto('/junction-study.html'); await settled(page) }
async function seek(page, time) { await page.getByLabel('Study time', { exact: true }).fill(String(time)); await settled(page) }

test('connected junction renders from four sides and flow reconstructs the same frame', async ({ page }, info) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message))
  await page.setViewportSize({ width: 1440, height: 900 }); await ready(page); await seek(page, 6)
  const canvas = scene(page).locator('canvas'), initial = await canvas.screenshot()
  await seek(page, 8); expect((await canvas.screenshot()).equals(initial)).toBe(false)
  await seek(page, 6); expect((await canvas.screenshot()).equals(initial)).toBe(true)
  await page.getByRole('button', { name: 'Low', exact: true }).click(); await settled(page)
  expect((await canvas.screenshot()).equals(initial)).toBe(false)
  await page.getByRole('button', { name: 'High', exact: true }).click(); await settled(page)
  expect((await canvas.screenshot()).equals(initial)).toBe(true)
  await page.getByRole('button', { name: 'Play passage', exact: true }).click()
  await expect.poll(async () => Number(await scene(page).getAttribute('data-time'))).toBeGreaterThan(6.2)
  await page.getByRole('button', { name: 'Pause passage', exact: true }).click(); await settled(page)
  const paused = await canvas.screenshot(); await page.waitForTimeout(100)
  expect((await canvas.screenshot()).equals(paused)).toBe(true)
  for (const view of ['Above', 'Below', 'Left', 'Right']) {
    await page.getByRole('button', { name: view, exact: true }).click(); await settled(page)
    await canvas.screenshot({ path: `../output/playwright/junction/${info.project.name}-${view.toLowerCase()}.png` })
  }
  await page.getByLabel('Wireframe', { exact: true }).check(); await settled(page)
  await canvas.screenshot({ path: `../output/playwright/junction/${info.project.name}-wireframe.png` })
  expect(errors).toEqual([])
})

test('reduced motion, keyboard controls, hidden documents and text remain available', async ({ page }) => {
  await ready(page); await seek(page, 6)
  await page.getByRole('button', { name: 'Play passage', exact: true }).click()
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')) })
  await expect(page.getByRole('button', { name: 'Play passage', exact: true })).toBeVisible()
  const time = await scene(page).getAttribute('data-time')
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')) })
  await page.waitForTimeout(100); await expect(scene(page)).toHaveAttribute('data-time', time)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.getByRole('button', { name: 'Play passage', exact: true })).toBeDisabled()
  const slider = page.getByLabel('Study time', { exact: true }); await slider.focus(); await page.keyboard.press('ArrowLeft'); await settled(page)
  await page.getByLabel('Text mode', { exact: true }).check()
  await expect(scene(page)).toHaveAttribute('data-renderer', 'text')
  await expect(page.getByRole('heading', { name: 'One parent, two exits' })).toBeVisible()
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([])
})

test('context recovery preserves time and detail', async ({ page }) => {
  await ready(page); await seek(page, 6)
  await page.getByRole('button', { name: 'Low', exact: true }).click(); await settled(page)
  const supported = await scene(page).locator('canvas').evaluate(canvas => {
    const extension = canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')
    if (!extension) return false; extension.loseContext(); return true
  })
  test.skip(!supported, 'Context loss extension unavailable')
  await expect(page.getByRole('alert')).toContainText('The junction view is unavailable')
  await page.getByRole('button', { name: 'Retry junction view' }).click(); await settled(page)
  await expect(scene(page)).toHaveAttribute('data-time', '6.000'); await expect(scene(page)).toHaveAttribute('data-quality', 'low')
})
