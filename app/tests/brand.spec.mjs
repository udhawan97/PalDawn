import { expect, test } from '@playwright/test'

test('the living mark is visible and honors reduced motion', async ({ page, context }) => {
  await page.goto('./')

  const mark = page.locator('.brand-icon')
  await expect(mark).toBeVisible()
  await expect(mark).toHaveAttribute('src', /icon\.svg$/)
  await expect.poll(() => mark.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0)

  const iconPage = await context.newPage()
  await iconPage.goto(await mark.getAttribute('src'))
  await expect(iconPage.locator('.traveler')).toHaveCSS('animation-name', 'passage')

  await iconPage.emulateMedia({ reducedMotion: 'reduce' })
  await expect(iconPage.locator('.traveler')).toHaveCSS('animation-name', 'none')
  await expect(iconPage.locator('.traveler')).toHaveCSS('display', 'none')

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByLabel('Reduced motion').check()
  await expect(mark).toHaveAttribute('src', /icon-static\.svg$/)
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /icon-static\.svg$/)

  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === 'webgl2') return null
      return getContext.call(this, type, ...args)
    }
  })
  await page.reload()
  await expect(page.locator('.fallback-brand-icon')).toHaveAttribute('src', /icon-static\.svg$/)
})

test('the branded introduction does not overflow target viewports', async ({ page }) => {
  const viewports = [
    { width: 320, height: 568 },
    { width: 375, height: 812 },
    { width: 414, height: 896 },
    { width: 720, height: 450 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto('./')
    await expect(page.locator('.brand-icon')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `${viewport.width}x${viewport.height} horizontal overflow`).toBeLessThanOrEqual(1)
    const controls = page.locator('.wordmark:visible, .utility-nav .text-button:visible')
    const bounds = await controls.evaluateAll((elements) => elements.map((element) => {
      const box = element.getBoundingClientRect()
      return { label: element.textContent?.trim(), left: box.left, right: box.right }
    }))
    for (const box of bounds) {
      expect(box.left, `${viewport.width}px ${box.label} left edge`).toBeGreaterThanOrEqual(0)
      expect(box.right, `${viewport.width}px ${box.label} right edge`).toBeLessThanOrEqual(viewport.width)
    }
  }
})
