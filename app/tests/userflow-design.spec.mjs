import { expect, test } from '@playwright/test'

const overlap = (a, b) => ({
  width: Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)),
  height: Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)),
})

test('short landscape keeps route, narration, controls, and safety in separate bands', async ({ page }) => {
  test.setTimeout(60_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => localStorage.removeItem('paldawn:journey:v1'))
  const viewports = [
    { width: 667, height: 375 },
    { width: 844, height: 390 },
    { width: 896, height: 414 },
    { width: 1200, height: 500 },
  ]

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto('./')
    await page.locator('.begin-action').click()
    await page.locator('.phase-rail, .companion, .control-deck').evaluateAll(async (elements) => {
      await Promise.all(elements.flatMap((element) => element.getAnimations()).map((animation) => animation.finished))
    })

    const boxes = await page.evaluate(() => {
      const box = (selector) => {
        const bounds = document.querySelector(selector).getBoundingClientRect()
        return { top: bounds.top, right: bounds.right, bottom: bounds.bottom, left: bounds.left }
      }
      return {
        masthead: box('.masthead'),
        rail: box('.phase-rail'),
        companion: box('.companion'),
        heading: box('.companion-heading'),
        controls: box('.control-deck'),
        safety: box('.safety-line'),
      }
    })

    const label = `${viewport.width}x${viewport.height}`
    expect(boxes.heading.top, `${label} heading`).toBeGreaterThanOrEqual(0)
    expect(boxes.companion.top, `${label} companion below rail`).toBeGreaterThanOrEqual(boxes.rail.bottom)
    expect(boxes.companion.bottom, `${label} companion above controls`).toBeLessThanOrEqual(boxes.controls.top)
    expect(boxes.controls.bottom, `${label} controls above safety`).toBeLessThanOrEqual(boxes.safety.top)
    expect(overlap(boxes.masthead, boxes.companion).height, `${label} masthead separation`).toBe(0)
    expect(overlap(boxes.rail, boxes.companion).height, `${label} rail separation`).toBe(0)
  }
})

test('the drawer header keeps its close target separate from scrolled settings controls', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.locator('.drawer-scroll').evaluate((element) => { element.scrollTop = 218 })

  const state = await page.evaluate(() => {
    const rect = (element) => {
      const bounds = element.getBoundingClientRect()
      return { top: bounds.top, right: bounds.right, bottom: bounds.bottom, left: bounds.left }
    }
    const close = rect(document.querySelector('.drawer-close'))
    const scroller = rect(document.querySelector('.drawer-scroll'))
    const controls = [...document.querySelectorAll('.drawer-scroll button, .drawer-scroll input, .drawer-scroll select')]
      .filter((element) => element instanceof HTMLElement && element.offsetParent !== null)
      .map(rect)
    return { close, scroller, controls }
  })

  expect(state.scroller.top).toBeGreaterThanOrEqual(state.close.bottom)
  for (const control of state.controls) {
    const visibleControl = {
      ...control,
      top: Math.max(control.top, state.scroller.top),
      bottom: Math.min(control.bottom, state.scroller.bottom),
    }
    if (visibleControl.bottom <= visibleControl.top) continue
    const collision = overlap(state.close, visibleControl)
    expect(collision.width * collision.height).toBe(0)
  }
})

test('settings pauses First Light and restores only a previously playing voyage', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Begin the voyage' }).click()

  const position = page.getByRole('slider', { name: 'Journey position' })
  await expect(position).toBeVisible()
  await page.waitForTimeout(250)
  await page.getByRole('button', { name: 'Settings' }).click()
  const pausedAt = Number(await position.inputValue())
  await page.waitForTimeout(600)
  expect(Math.abs(Number(await position.inputValue()) - pausedAt)).toBeLessThanOrEqual(1)

  await page.getByRole('button', { name: 'Close panel' }).click()
  await page.waitForTimeout(500)
  expect(Number(await position.inputValue())).toBeGreaterThan(pausedAt)

  await page.getByRole('button', { name: 'Pause' }).click()
  const manuallyPausedAt = Number(await position.inputValue())
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Close panel' }).click()
  await page.waitForTimeout(500)
  expect(Math.abs(Number(await position.inputValue()) - manuallyPausedAt)).toBeLessThanOrEqual(1)
})

test('settings feedback stays visible while preserving one polite drawer live region', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => undefined },
    })
  })
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).click()

  const installHelp = page.getByRole('button', { name: 'Installation help' })
  await installHelp.focus()
  await installHelp.press('Enter')
  await expect(installHelp).toBeFocused()
  const status = page.locator('.settings-status')
  await expect(status).toHaveText('If your browser offers Install App or Add to Home Screen, use that command to install PalDawn.')
  await expect(page.locator('.drawer [aria-live="polite"]')).toHaveCount(1)

  const isVisibleInDrawer = async () => page.evaluate(() => {
    const drawer = document.querySelector('.drawer').getBoundingClientRect()
    const message = document.querySelector('.settings-status').getBoundingClientRect()
    return message.top >= drawer.top && message.bottom <= drawer.bottom
  })
  expect(await isVisibleInDrawer()).toBe(true)

  const copyDiagnostics = page.getByRole('button', { name: 'Copy diagnostics' })
  await copyDiagnostics.focus()
  await copyDiagnostics.press('Enter')
  await expect(copyDiagnostics).toBeFocused()
  await expect(status).toHaveText('Diagnostics copied.')
  expect(await isVisibleInDrawer()).toBe(true)

  await page.getByRole('button', { name: 'Close panel' }).click()
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.locator('.settings-status')).toBeEmpty()
})

test('late settings feedback cannot leak into a reopened drawer', async ({ page }) => {
  await page.addInitScript(() => {
    window.resolveClipboardWrite = null
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () => new Promise((resolve) => {
          window.resolveClipboardWrite = resolve
        }),
      },
    })
  })
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Copy diagnostics' }).click()
  await page.getByRole('button', { name: 'Close panel' }).click()
  await page.getByRole('button', { name: 'Settings' }).click()

  await page.evaluate(() => window.resolveClipboardWrite())
  await expect(page.locator('.settings-status')).toBeEmpty()
})
