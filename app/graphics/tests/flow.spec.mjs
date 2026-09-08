import { test, expect } from '@playwright/test'

const scene = page => page.getByRole('region', { name: 'Interactive flow study' })
async function settled(page) {
  await expect(scene(page)).toHaveAttribute('data-renderer', 'ready')
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}
async function ready(page) { await page.goto('/flow-study.html'); await settled(page) }
async function seek(page, value) {
  await page.getByRole('slider', { name: 'Study time' }).fill(String(value))
  await expect(scene(page)).toHaveAttribute('data-time', Number(value).toFixed(3))
  await settled(page)
}

test('GPU flow changes, pauses, and reconstructs identical pixels after backward seek', async ({ page }, info) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await ready(page)
  await seek(page, 3)
  const canvas = scene(page).locator('canvas')
  const initial = await canvas.screenshot()
  await page.getByRole('button', { name: 'Play flow', exact: true }).click()
  await expect.poll(async () => Number(await scene(page).getAttribute('data-time'))).toBeGreaterThan(3.25)
  await page.getByRole('button', { name: 'Pause flow', exact: true }).click()
  await settled(page)
  const paused = await canvas.screenshot()
  expect(paused.equals(initial)).toBe(false)
  await page.waitForTimeout(200)
  expect((await canvas.screenshot()).equals(paused)).toBe(true)
  await seek(page, 9)
  expect((await canvas.screenshot()).equals(initial)).toBe(false)
  await seek(page, 3)
  expect((await canvas.screenshot()).equals(initial)).toBe(true)
  await page.getByRole('button', { name: 'Low', exact: true }).click()
  await settled(page)
  expect((await canvas.screenshot()).equals(initial)).toBe(false)
  await page.getByRole('button', { name: 'High', exact: true }).click()
  await settled(page)
  expect((await canvas.screenshot()).equals(initial)).toBe(true)
  await page.screenshot({ path: `../output/playwright/heart-study/${info.project.name}-flow.png`, fullPage: true })
  await seek(page, 11.9)
  await page.getByRole('button', { name: 'Play flow', exact: true }).click()
  await expect(scene(page)).toHaveAttribute('data-time', '12.000')
  await expect(page.getByRole('button', { name: 'Play flow', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Restart passage' }).click()
  await expect(scene(page)).toHaveAttribute('data-time', '0.000')
  expect(errors).toEqual([])
})

test('reduced motion stops playback and preserves keyboard still-frame inspection', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: 'Play flow', exact: true }).click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.getByRole('button', { name: 'Play flow', exact: true })).toBeDisabled()
  await seek(page, 4)
  const slider = page.getByRole('slider', { name: 'Study time' })
  await slider.focus(); await page.keyboard.press('ArrowLeft')
  await expect(scene(page)).toHaveAttribute('data-time', '3.900')
  await page.waitForTimeout(150)
  await expect(scene(page)).toHaveAttribute('data-time', '3.900')
})

test('hidden documents pause without jumping on return', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: 'Play flow', exact: true }).click()
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.getByRole('button', { name: 'Play flow', exact: true })).toBeVisible()
  const time = await scene(page).getAttribute('data-time')
  await page.waitForTimeout(200)
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')) })
  await expect(scene(page)).toHaveAttribute('data-time', time)
})

test('WebGL retry restores the same paused time and detail', async ({ page }) => {
  await ready(page); await seek(page, 5)
  await page.getByRole('button', { name: 'Low', exact: true }).click()
  const supported = await scene(page).locator('canvas').evaluate(canvas => {
    const extension = canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')
    if (!extension) return false
    extension.loseContext(); return true
  })
  test.skip(!supported, 'Context-loss extension unavailable')
  await expect(page.getByRole('alert')).toContainText('The flow view is unavailable')
  await page.getByRole('button', { name: 'Retry flow view' }).click()
  await settled(page)
  await expect(scene(page)).toHaveAttribute('data-time', '5.000')
  await expect(scene(page)).toHaveAttribute('data-quality', 'low')
  await expect(page.getByRole('button', { name: 'Play flow', exact: true })).toBeVisible()
})

test('portrait and landscape retain the scene and controls; no storage or heart asset is loaded', async ({ page }, info) => {
  const assets = []; page.on('request', request => { if (request.url().includes('.glb')) assets.push(request.url()) })
  await ready(page)
  for (const [width, height] of [[390, 844], [844, 390]]) {
    await page.setViewportSize({ width, height }); await settled(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole('slider', { name: 'Study time' })).toBeEnabled()
    await page.screenshot({ path: `../output/playwright/heart-study/${info.project.name}-flow-${width}.png`, fullPage: true })
  }
  expect(assets).toEqual([])
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([])
  await page.getByRole('link', { name: 'Return to the heart study' }).click()
  await expect(page.getByRole('heading', { name: 'A heart. With substance.' })).toBeVisible()
})
