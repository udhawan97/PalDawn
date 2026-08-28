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

test('blocked browser storage never claims local notes or bookmarks were saved', async ({ page }) => {
  test.setTimeout(60_000)
  await page.addInitScript(() => {
    const nativeSetItem = Storage.prototype.setItem
    window.storageBlocked = true
    Object.defineProperty(Storage.prototype, 'setItem', {
      configurable: true,
      value(key, value) {
        if (window.storageBlocked && String(key).startsWith('paldawn:')) {
          throw new DOMException('Test-injected storage rejection', 'QuotaExceededError')
        }
        return nativeSetItem.call(this, key, value)
      },
    })
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await page.getByRole('button', { name: 'Study' }).click()

  const note = 'Review how the signal changes before the next phase.'
  await page.getByLabel('Private note for Approach').fill(note)
  await expect(page.getByText('Private note not saved', { exact: true })).toBeVisible()
  await expect(page.getByText(/Browser storage is unavailable.*Keep this page open/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Retry saving' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('paldawn:workspace:v1'))).toBeNull()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download study Markdown' }).click()
  const download = await downloadPromise
  const downloadPath = await download.path()
  expect(downloadPath).not.toBeNull()
  const { readFile } = await import('node:fs/promises')
  expect(await readFile(downloadPath, 'utf8')).toContain(note)

  await page.getByRole('button', { name: 'Close panel' }).click()
  await expect(page.getByRole('button', { name: 'Study' })).toBeFocused()
  await page.keyboard.press('t')
  await page.getByRole('button', { name: 'Save stage' }).first().click()
  await expect(page.getByText(/Stage changed for this tab, but browser storage is unavailable/i)).toBeAttached()
  await expect(page.getByRole('button', { name: /Local storage unavailable/i })).toBeVisible()

  await page.getByRole('button', { name: 'Close panel' }).click()
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByLabel('High contrast').check()
  await expect(page.locator('.settings-status')).toHaveText(/preference changed for this tab.*storage is unavailable/i)
  expect(await page.evaluate(() => localStorage.getItem('paldawn:settings:v1'))).toBeNull()

  await page.evaluate(() => { window.storageBlocked = false })
  await page.getByLabel('High contrast').uncheck()
  await expect(page.locator('.settings-status')).toHaveText('Preference saved in this browser.')
  await page.getByRole('button', { name: 'Close panel' }).click()
  await page.keyboard.press('t')
  await page.getByRole('button', { name: 'Remove saved stage' }).click()
  await page.getByRole('button', { name: 'Close panel' }).click()
  await page.getByRole('button', { name: 'Study' }).click()
  await page.getByRole('button', { name: 'Retry saving' }).click()
  await expect(page.locator('.action-status')).toHaveText('Private workspace saved in this browser.')
  await expect(page.getByRole('button', { name: /Local storage unavailable/i })).toHaveCount(0)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('paldawn:workspace:v1')).notes.approach)).toBe(note)

  await page.reload()
  await page.getByRole('button', { name: 'Study' }).click()
  await expect(page.getByLabel('Private note for Approach')).toHaveValue(note)

  await page.getByRole('button', { name: 'Close panel' }).click()
  await page.evaluate(() => { window.storageBlocked = true })
  await page.getByRole('button', { name: 'Begin the voyage' }).click()
  await page.locator('.companion').getByRole('button', { name: 'Save stage' }).click()
  await expect(page.locator('.companion .action-status')).toHaveText(/Stage changed for this tab.*storage is unavailable/i)
  await expect(page.locator('.companion .action-status')).not.toContainText('saved on this device')
})

test('full-width drawers are modal, contain keyboard focus, and restore the trigger', async ({ page }) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('./')
  const drawer = page.locator('.drawer')

  const studyTrigger = page.getByRole('button', { name: 'Study', exact: true })
  await studyTrigger.focus()
  await page.locator('[data-panel="mission"]').evaluate((element) => element.click())
  await expect(page.getByRole('heading', { name: 'An engine demonstration, honestly labeled.' })).toBeVisible()
  await expect(drawer).toHaveAttribute('aria-modal', 'true')
  expect(await page.locator('.masthead').evaluate((element) => element.inert)).toBe(true)
  await page.keyboard.press('Escape')
  await expect(drawer).toHaveCount(0)
  await expect(studyTrigger).toBeFocused()

  const settingsTrigger = page.getByRole('button', { name: 'Settings', exact: true })
  await settingsTrigger.focus()
  await page.keyboard.press('t')
  await expect(page.getByRole('heading', { name: 'Full transcript' })).toBeVisible()
  await expect(drawer).toHaveAttribute('aria-modal', 'true')
  expect(await page.locator('.masthead').evaluate((element) => element.inert)).toBe(true)
  await page.keyboard.press('Escape')
  await expect(drawer).toHaveCount(0)
  await expect(settingsTrigger).toBeFocused()

  for (const panelName of ['Study', 'Settings', 'Help']) {
    const trigger = page.getByRole('button', { name: panelName, exact: true })
    await trigger.focus()
    await trigger.press('Enter')
    await expect(drawer).toHaveAttribute('aria-modal', 'true')
    expect(await page.locator('.masthead').evaluate((element) => element.inert)).toBe(true)
    await page.keyboard.press('Escape')
    await expect(drawer).toHaveCount(0)
    await expect(trigger).toBeFocused()
  }

  const trigger = page.getByRole('button', { name: 'Settings', exact: true })
  await trigger.focus()
  await trigger.press('Enter')

  const lastControl = drawer.locator('button:visible, a[href]:visible, input:visible, select:visible, textarea:visible').last()
  await lastControl.focus()
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('.drawer')))).toBe(true)
  await expect(page.getByRole('button', { name: 'Close panel' })).toBeFocused()

  await page.keyboard.press('Shift+Tab')
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('.drawer')))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(drawer).toHaveCount(0)
  await expect(trigger).toBeFocused()

  await page.setViewportSize({ width: 768, height: 900 })
  await trigger.press('Enter')
  await expect(drawer).toHaveAttribute('aria-modal', 'false')
  expect(await page.locator('.masthead').evaluate((element) => element.inert)).toBe(false)
  await page.keyboard.press('Escape')

  await page.setViewportSize({ width: 320, height: 568 })
  await trigger.focus()
  await page.keyboard.press('t')
  await page.evaluate(() => {
    const lateControl = document.createElement('button')
    lateControl.id = 'late-background-control'
    lateControl.textContent = 'Late background control'
    document.querySelector('.flight-ui').append(lateControl)
    document.querySelector('[data-panel="settings"]').remove()
  })
  await expect.poll(() => page.locator('#late-background-control').evaluate((element) => element.inert)).toBe(true)
  await page.keyboard.press('Escape')
  await expect(drawer).toHaveCount(0)
  expect(await page.locator('#late-background-control').evaluate((element) => element.inert)).toBe(false)
  await expect.poll(() => page.evaluate(() => {
    const active = document.activeElement
    return active instanceof HTMLElement && active.matches('[data-panel]') && active.getClientRects().length > 0
  })).toBe(true)
})

test('an explicit text-voyage preference survives reload and remains reversible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Use text voyage' }).click()
  await expect(page.locator('.flight-ui')).toHaveAttribute('data-text-voyage', 'true')
  await expect(page.getByRole('button', { name: 'Return to 3D scene' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('paldawn:settings:v1')).state.textVoyagePreferred)).toBe(true)

  await page.reload()
  await expect(page.locator('.flight-ui')).toHaveAttribute('data-text-voyage', 'true')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Return to 3D scene' }).click()
  await expect(page.locator('.flight-ui')).toHaveAttribute('data-text-voyage', 'false')
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('paldawn:settings:v1')).state.textVoyagePreferred)).toBe(false)
})

test('temporary WebGL recovery can be promoted to a persistent text-voyage preference', async ({ page }) => {
  await page.addInitScript(() => {
    const nativeGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (contextId, ...args) {
      if (contextId === 'webgl2') return null
      return nativeGetContext.call(this, contextId, ...args)
    }
  })
  await page.goto('./')
  await page.getByRole('button', { name: 'Continue without 3D' }).click()
  await expect(page.locator('.flight-ui')).toHaveAttribute('data-text-voyage', 'true')
  expect(await page.evaluate(() => localStorage.getItem('paldawn:settings:v1'))).toBeNull()

  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('button', { name: 'Prefer text voyage in this browser' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try the 3D scene again' })).toBeVisible()
  await page.getByRole('button', { name: 'Prefer text voyage in this browser' }).click()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('paldawn:settings:v1')).state.textVoyagePreferred)).toBe(true)

  await page.reload()
  await expect(page.locator('.flight-ui')).toHaveAttribute('data-text-voyage', 'true')
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('button', { name: 'Return to 3D scene' })).toBeVisible()
})

test('expanded text reserves the complete safety boundary across the Atlas acceptance matrix', async ({ page }) => {
  test.setTimeout(60_000)
  await page.addInitScript(() => {
    localStorage.setItem('paldawn:settings:v1', JSON.stringify({
      state: { highContrast: true, captionScale: 'largest' },
      version: 1,
    }))
  })
  const viewports = [
    { width: 320, height: 568 },
    { width: 375, height: 812 },
    { width: 414, height: 896 },
    { width: 667, height: 375 },
  ]

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto('./')
    await page.addStyleTag({ content: 'html { font-size: 20.8px !important; }' })
    await page.getByRole('button', { name: '08 Diabetes' }).click()
    await expect(page.getByRole('heading', { name: 'Food enters the digestive tract' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high')
    await expect(page.locator('html')).toHaveAttribute('data-caption-size', 'largest')

    await expect.poll(() => page.evaluate(() => {
      const safety = document.querySelector('.safety-line').getBoundingClientRect()
      const detail = document.querySelector('.atlas-detail').getBoundingClientRect()
      return Math.max(0, detail.bottom - safety.top)
    })).toBeLessThanOrEqual(1)
    await expect(page.locator('.safety-line')).toContainText('Education only · never diagnosis')
  }
})
