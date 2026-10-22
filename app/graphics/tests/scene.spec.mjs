import { test, expect } from '@playwright/test'
import { Matrix4, Vector3 } from 'three'

const scene = page => page.getByRole('region', { name: 'Interactive junction study' })
async function ready(page) { await expect(scene(page)).toHaveAttribute('data-renderer', 'ready'); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))) }
async function seek(page, time) { await page.getByLabel('Study time', { exact: true }).fill(String(time)); await ready(page) }

async function assertFits(page) {
  const rect = await scene(page).locator('canvas').boundingBox()
  await expect.poll(async () => JSON.parse(await scene(page).getAttribute('data-frame')).viewport.width).toBeCloseTo(rect.width, 0)
  const frame = JSON.parse(await scene(page).getAttribute('data-frame')), matrices = JSON.parse(await scene(page).getAttribute('data-camera'))
  const view = new Matrix4().fromArray(matrices[1]), projection = new Matrix4().fromArray(matrices[0])
  const [low, high] = frame.framingBounds
  for (const x of [low[0], high[0]]) for (const y of [low[1], high[1]]) for (const z of [low[2], high[2]]) {
    const point = new Vector3(x, y, z).applyMatrix4(view).applyMatrix4(projection)
    expect(Math.abs(point.x)).toBeLessThanOrEqual(1 - 16 / rect.width)
    expect(Math.abs(point.y)).toBeLessThanOrEqual(1 - 16 / rect.height)
    expect(point.z).toBeGreaterThan(-1); expect(point.z).toBeLessThan(1)
  }
}

test('one frame owns shots, captions, flow and inspect/return without independent motion', async ({ page }) => {
  await page.goto('/junction-study.html'); await ready(page)
  for (const [time, shot] of [[0, 'overview'], [3.999, 'overview'], [4, 'junction'], [7.999, 'junction'], [8, 'inside'], [12, 'inside']]) {
    await seek(page, time); await expect(scene(page)).toHaveAttribute('data-shot', shot)
    const frame = JSON.parse(await scene(page).getAttribute('data-frame'))
    expect(frame.time).toBe(time); expect(frame.flowTime).toBe(time); expect(frame.shot).toBe(shot); expect(frame.sources).toEqual(['synthetic:y-v1'])
  }
  await seek(page, 6); const expected = await scene(page).locator('canvas').screenshot(), expectedFrame = await scene(page).getAttribute('data-frame')
  await page.getByRole('button', { name: 'Play passage', exact: true }).click()
  await page.getByRole('button', { name: 'Inspect freely', exact: true }).click(); await ready(page)
  await expect(scene(page)).toHaveAttribute('data-inspecting', 'true')
  await expect(page.getByRole('button', { name: 'Play passage', exact: true })).toBeDisabled()
  await seek(page, 6); await page.getByRole('button', { name: 'Below', exact: true }).click(); await ready(page)
  expect((await scene(page).locator('canvas').screenshot()).equals(expected)).toBe(false)
  await page.getByRole('button', { name: 'Return to journey', exact: true }).click(); await ready(page)
  expect(await scene(page).getAttribute('data-frame')).toBe(expectedFrame)
  expect((await scene(page).locator('canvas').screenshot()).equals(expected)).toBe(true)
  await page.waitForTimeout(120); expect((await scene(page).locator('canvas').screenshot()).equals(expected)).toBe(true)
  await page.emulateMedia({ reducedMotion: 'reduce' }); await seek(page, 8)
  const reducedCamera = JSON.parse(await scene(page).getAttribute('data-frame')).camera
  await seek(page, 12); expect(JSON.parse(await scene(page).getAttribute('data-frame')).camera).toEqual(reducedCamera)
  await page.getByLabel('Text mode', { exact: true }).check()
  await expect(scene(page)).toContainText('Inspect the central lane from inside one exit')
})

test('failed, superseded and retried scene readiness cannot advance an unready narrative', async ({ page }) => {
  const requests = []
  await page.route('**/junction-study.html?scene-ready=*', route => { requests.push(route) })
  await page.goto('/junction-study.html?fixture=deferred'); await ready(page)
  await page.getByRole('button', { name: 'Inside shot', exact: true }).click()
  await expect.poll(() => requests.length).toBe(1); await expect(scene(page)).toHaveAttribute('data-playback', 'pending'); await expect(scene(page)).toHaveAttribute('data-time', '0.000')
  await page.getByRole('button', { name: 'Low', exact: true }).click()
  await page.getByRole('button', { name: 'Junction shot', exact: true }).click(); await expect.poll(() => requests.length).toBe(2)
  await requests[0].fulfill({ status: 200, body: 'old ready' }).catch(() => {})
  await expect(scene(page)).toHaveAttribute('data-time', '0.000')
  await requests[1].fulfill({ status: 500, body: 'unavailable' }); await expect(scene(page)).toHaveAttribute('data-playback', 'failed')
  await page.getByRole('button', { name: 'Retry scene', exact: true }).click(); await expect.poll(() => requests.length).toBe(3)
  await requests[2].fulfill({ status: 200, body: 'ready' }); await ready(page)
  await expect(scene(page)).toHaveAttribute('data-time', '4.000'); await expect(scene(page)).toHaveAttribute('data-quality', 'low')
  await page.getByLabel('Study time', { exact: true }).fill('7.99'); await expect.poll(() => requests.length).toBe(4)
  await requests[3].fulfill({ status: 200, body: 'ready' }); await ready(page)
  await page.getByRole('button', { name: 'Play passage', exact: true }).click(); await expect.poll(() => requests.length).toBe(5)
  await expect(scene(page)).toHaveAttribute('data-playback', 'pending'); await expect(scene(page)).toHaveAttribute('data-shot', 'junction')
  expect(Number(await scene(page).getAttribute('data-time'))).toBeLessThan(8)
  await requests[4].fulfill({ status: 200, body: 'ready' }); await ready(page)
  await expect(scene(page)).toHaveAttribute('data-shot', 'inside')
  await expect(page.getByRole('button', { name: 'Play passage', exact: true })).toBeVisible()
  const time = await scene(page).getAttribute('data-time'); await page.waitForTimeout(100); await expect(scene(page)).toHaveAttribute('data-time', time)
  await page.getByRole('button', { name: 'Inside shot', exact: true }).click(); await expect.poll(() => requests.length).toBe(6)
  await page.getByRole('button', { name: 'Restart passage', exact: true }).click(); await ready(page)
  await requests[5].fulfill({ status: 200, body: 'late ready' }).catch(() => {})
  await expect(scene(page)).toHaveAttribute('data-time', '0.000'); await expect(scene(page)).toHaveAttribute('data-playback', 'ready')
})

test('declared targets stay inside the scene with notes and enlarged text at both DPRs', async ({ browser }, info) => {
  test.setTimeout(90_000)
  for (const dpr of [1, 2]) for (const [width, height] of [[320, 568], [844, 390], [1440, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, reducedMotion: 'reduce' })
    const page = await context.newPage()
    try {
      await page.goto('http://127.0.0.1:4318/junction-study.html'); await ready(page)
      await page.getByText('Scene notes', { exact: true }).click()
      await page.addStyleTag({ content: 'button,input,label,summary,.canvas-caption{font-size:200%!important}' })
      for (const time of [0, 4, 8, 12]) {
        await seek(page, time)
        await assertFits(page)
        await page.getByText('Scene notes', { exact: true }).click(); await assertFits(page)
        await page.getByText('Scene notes', { exact: true }).click()
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: `../output/playwright/junction/${info.project.name}-scene-${width}-dpr${dpr}.png`, fullPage: true })
      await page.getByLabel('Text mode', { exact: true }).check(); await expect(scene(page)).toHaveAttribute('data-renderer', 'text')
    } finally { await context.close() }
  }
})


test('free inspection refits a same-page resize and returns to the exact journey pose', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/junction-study.html'); await ready(page); await seek(page, 6)
  const original = await scene(page).locator('canvas').screenshot(), originalFrame = await scene(page).getAttribute('data-frame')
  await page.getByRole('button', { name: 'Inspect freely', exact: true }).click(); await ready(page)
  for (const [width, height] of [[320, 568], [844, 390], [1440, 900]]) {
    await page.setViewportSize({ width, height }); await ready(page); await assertFits(page)
    await expect(scene(page)).toHaveAttribute('data-time', '6.000')
    await expect(page.getByRole('button', { name: 'Play passage', exact: true })).toBeDisabled()
  }
  await page.getByRole('button', { name: 'Return to journey', exact: true }).click(); await ready(page)
  expect(await scene(page).getAttribute('data-frame')).toBe(originalFrame)
  expect((await scene(page).locator('canvas').screenshot()).equals(original)).toBe(true)
})
