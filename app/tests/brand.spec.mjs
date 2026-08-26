import { expect, test } from '@playwright/test'

const useFallbackHeadingFont = (page) => page.addStyleTag({
  content: '.intro h1 { font-family: Georgia, serif !important; }',
})

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
  await expect(page.locator('.flight-ui')).toHaveAttribute('data-reduced-motion', 'true')
  const appSignalMotion = await page.locator('.intro-brand-route i').evaluate((element) => getComputedStyle(element, '::after').animationName)
  expect(appSignalMotion).toBe('none')
  await expect(page.locator('.intro')).toHaveCSS('animation-name', 'none')

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

test('the living-instrument contract reaches the intro and install surfaces', async ({ page }) => {
  await page.goto('./')

  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Enter the body. Follow what happens next.')
  await expect(page.locator('.intro-brand-route')).toBeVisible()
  await expect(page.getByText('The 3D body is a conceptual learning map, not reviewed anatomy.')).toBeVisible()

  const tokens = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement)
    return Object.fromEntries(['--ink-0', '--ink-1', '--bone', '--dawn', '--vital'].map((token) => [token, style.getPropertyValue(token).trim()]))
  })
  expect(tokens).toEqual({
    '--ink-0': '#050412',
    '--ink-1': '#0a0820',
    '--bone': '#f2ede0',
    '--dawn': '#e0b653',
    '--vital': '#45e6cf',
  })

  const manifest = await page.evaluate(async () => fetch('./site.webmanifest').then((response) => response.json()))
  expect(manifest.theme_color).toBe('#0a0820')
  expect(manifest.background_color).toBe('#050412')
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ src: 'icon-app.svg', purpose: 'any' }),
    expect.objectContaining({ src: 'icon-maskable-512.png', purpose: 'maskable' }),
  ]))

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const signalMotion = await page.locator('.intro-brand-route i').evaluate((element) => getComputedStyle(element, '::after').animationIterationCount)
  expect(signalMotion).toBe('1')

  const hiddenLandingFrames = await page.locator('.intro, .top-diseases').evaluateAll((elements) =>
    elements.flatMap((element) => element.getAnimations().flatMap((animation) =>
      animation.effect?.getKeyframes().filter((frame) => Number(frame.opacity) < 1) ?? [],
    )),
  )
  expect(hiddenLandingFrames, 'entrance motion must not make primary content transparent').toEqual([])

  await page.getByRole('button', { name: 'Explore diabetes' }).click()
  const hiddenAtlasFrames = await page.locator('.atlas').evaluate((element) =>
    element.getAnimations().flatMap((animation) =>
      animation.effect?.getKeyframes().filter((frame) => Number(frame.opacity) < 1) ?? [],
    ),
  )
  expect(hiddenAtlasFrames, 'Atlas entrance motion must keep clinical content visible').toEqual([])
})

test('system notices stay collapsed until requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const overlapArea = (first, second) => (
    Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x))
    * Math.max(0, Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y))
  )
  const expectSummaryClear = async (viewport, summary) => {
    const label = `${viewport.width}x${viewport.height}`
    const summaryBox = await summary.boundingBox()
    const mastheadBox = await page.locator('.masthead').boundingBox()
    const wordmarkBox = await page.locator('.wordmark').boundingBox()
    const utilityBox = await page.locator('.utility-nav').boundingBox()
    const introBox = await page.locator('.intro').boundingBox()
    const diseasesBox = await page.locator('.top-diseases').boundingBox()
    expect(summaryBox.height, `${label} summary target height`).toBeGreaterThanOrEqual(44)
    expect(summaryBox.y, `${label} summary inside masthead top`).toBeGreaterThanOrEqual(mastheadBox.y)
    expect(summaryBox.y + summaryBox.height, `${label} summary inside masthead bottom`).toBeLessThanOrEqual(mastheadBox.y + mastheadBox.height)
    expect(overlapArea(summaryBox, wordmarkBox), `${label} summary clear of wordmark`).toBe(0)
    expect(overlapArea(summaryBox, utilityBox), `${label} summary clear of utility navigation`).toBe(0)
    expect(overlapArea(summaryBox, introBox), `${label} summary clear of intro`).toBe(0)
    expect(overlapArea(summaryBox, diseasesBox), `${label} summary clear of disease rail`).toBe(0)
    if (viewport.height > viewport.width && viewport.width <= 600) {
      expect(summaryBox.x - (wordmarkBox.x + wordmarkBox.width), `${label} wordmark-to-summary reserve`).toBeGreaterThanOrEqual(4)
      expect(utilityBox.x - (summaryBox.x + summaryBox.width), `${label} summary-to-utility reserve`).toBeGreaterThanOrEqual(8)
    }
    if (viewport.height > viewport.width && viewport.width >= 541 && viewport.width <= 600) {
      await expect(page.locator('.wordmark-name'), `${label} wordmark name remains visible`).toBeVisible()
    }
    if (viewport.height > viewport.width && viewport.width >= 601 && viewport.width <= 620) {
      expect(summaryBox.x - (wordmarkBox.x + wordmarkBox.width), `${label} wordmark-to-summary reserve`).toBeGreaterThanOrEqual(8)
      expect(utilityBox.x - (summaryBox.x + summaryBox.width), `${label} summary-to-utility reserve`).toBeGreaterThanOrEqual(8)
    }
  }
  const viewports = [
    { width: 320, height: 568 },
    { width: 320, height: 812 },
    { width: 540, height: 800 },
    { width: 541, height: 800 },
    { width: 560, height: 800 },
    { width: 601, height: 800 },
    { width: 562, height: 561 },
    { width: 720, height: 561 },
    { width: 900, height: 561 },
    { width: 900, height: 691 },
    { width: 900, height: 800 },
    { width: 1200, height: 561 },
    { width: 1440, height: 600 },
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
  ]

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto('./')
    await expect(page.locator('.flight-ui')).toBeVisible()
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('paldawn:offline-ready')))
    const summary = page.locator('.system-notice-summary')
    const banner = page.locator('.system-banner-offline-ready')
    await expect(summary).toBeVisible()
    await expect(summary.locator('.system-notice-label')).toHaveText('Offline ready')
    await expect(banner).toBeHidden()
    await expectSummaryClear(viewport, summary)
    await summary.click()
    await expect(banner).toBeVisible()
    await banner.getByRole('button', { name: 'Dismiss' }).click()
    await expect(banner).toBeHidden()
    await expect(summary).toBeHidden()
  }

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 540, height: 800 },
    { width: 541, height: 800 },
    { width: 560, height: 800 },
    { width: 601, height: 800 },
    { width: 562, height: 561 },
    { width: 667, height: 375 },
    { width: 844, height: 390 },
    { width: 900, height: 691 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('./')
    await expect(page.locator('.flight-ui')).toBeVisible()
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'))
      window.dispatchEvent(new CustomEvent('paldawn:update-ready'))
    })
    const summary = page.locator('.system-notice-summary')
    const offline = page.getByText('Offline mode · cached voyage controls remain available.')
    const update = page.locator('.system-banner-update-ready')
    await expect(summary).toBeVisible()
    await expect(summary.locator('.system-notice-label')).toHaveText('2 notices')
    await expect(summary).toHaveAccessibleName(/Offline mode, Update ready\. Show system notice details\./)
    await expect(offline).toBeHidden()
    await expect(update).toBeHidden()
    await expectSummaryClear(viewport, summary)

    await summary.click()
    await expect(offline).toBeVisible()
    await expect(update).toBeVisible()
    const updateTarget = await update.getByRole('button', { name: 'Update now' }).boundingBox()
    expect(updateTarget.height, `${viewport.width}x${viewport.height} update target height`).toBeGreaterThanOrEqual(44)
    await summary.click()
    await expect(offline).toBeHidden()
    await expect(update).toBeHidden()
  }

  await page.setViewportSize({ width: 667, height: 375 })
  await page.goto('./')
  await expect(page.locator('.flight-ui')).toBeVisible()
  await page.getByRole('button', { name: 'Explore diabetes' }).click()
  await expect(page.locator('.flight-ui')).toHaveAttribute('data-atlas', 'true')
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('paldawn:update-ready')))
  const atlasSummary = page.locator('.system-notice-summary')
  const atlasUpdate = page.locator('.system-banner-update-ready')
  await expect(atlasSummary).toBeVisible()
  await expect(atlasUpdate).toBeHidden()
  await atlasSummary.click()
  await expect(atlasUpdate).toBeVisible()
  await atlasSummary.click()
  await expect(atlasUpdate).toBeHidden()
  await atlasSummary.focus()
  await page.keyboard.press('Enter')
  await expect(atlasUpdate).toBeVisible()
  await expect(atlasSummary).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(atlasUpdate).toBeHidden()
  await expect(atlasSummary).toHaveAttribute('aria-expanded', 'false')
  await expect(atlasSummary).toBeFocused()

  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('./')
  await expect(page.locator('.flight-ui')).toBeVisible()
  await page.evaluate(() => {
    window.dispatchEvent(new Event('offline'))
    window.dispatchEvent(new CustomEvent('paldawn:update-ready'))
  })
  await page.getByRole('button', { name: 'Enter step mode' }).click()
  await expect(page.locator('.flight-ui')).toHaveAttribute('data-entered', 'true')
  const enteredSummary = page.locator('.system-notice-summary')
  const enteredSummaryBox = await enteredSummary.boundingBox()
  const phaseRail = page.getByRole('navigation', { name: 'Journey stages' })
  const phaseRailBox = await phaseRail.boundingBox()
  expect(overlapArea(enteredSummaryBox, phaseRailBox), '320x568 summary clear of entered journey stages').toBe(0)
  for (const phase of await phaseRail.getByRole('button').all()) {
    const phaseBox = await phase.boundingBox()
    expect(overlapArea(enteredSummaryBox, phaseBox), '320x568 summary clear of each phase target').toBe(0)
  }
  const firstPhase = phaseRail.getByRole('button').first()
  await firstPhase.click({ trial: true })

  await page.goto('./')
  await expect(page.locator('.flight-ui')).toBeVisible()
  await page.getByRole('button', { name: 'Explore diabetes' }).click()
  await expect(page.locator('.flight-ui')).toHaveAttribute('data-atlas', 'true')
  await page.evaluate(() => {
    window.dispatchEvent(new Event('offline'))
    window.dispatchEvent(new CustomEvent('paldawn:update-ready'))
  })
  const portraitAtlasSummary = page.locator('.system-notice-summary')
  const portraitAtlasSummaryBox = await portraitAtlasSummary.boundingBox()
  const atlasLibrary = page.locator('.atlas-library')
  const atlasLibraryBox = await atlasLibrary.boundingBox()
  expect(overlapArea(portraitAtlasSummaryBox, atlasLibraryBox), '320x568 summary clear of Atlas library').toBe(0)
  const firstDisease = atlasLibrary.getByRole('button').first()
  await firstDisease.click({ trial: true })
  await portraitAtlasSummary.click()
  await expect(page.locator('.system-banner-update-ready')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.system-banner-update-ready')).toBeHidden()
})

test('the branded introduction does not overflow target viewports', async ({ page }) => {
  test.setTimeout(90_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const viewports = [
    { width: 320, height: 568 },
    { width: 320, height: 812 },
    { width: 350, height: 812 },
    { width: 375, height: 801 },
    { width: 375, height: 812 },
    { width: 414, height: 896 },
    { width: 667, height: 375 },
    { width: 720, height: 450 },
    { width: 766, height: 480 },
    { width: 766, height: 481 },
    { width: 766, height: 559 },
    { width: 766, height: 560 },
    { width: 766, height: 561 },
    { width: 821, height: 480 },
    { width: 844, height: 390 },
    { width: 896, height: 414 },
    { width: 562, height: 561 },
    { width: 600, height: 561 },
    { width: 667, height: 561 },
    { width: 691, height: 690 },
    { width: 719, height: 561 },
    { width: 720, height: 561 },
    { width: 720, height: 690 },
    { width: 819, height: 561 },
    { width: 819, height: 690 },
    { width: 820, height: 560 },
    { width: 820, height: 561 },
    { width: 821, height: 560 },
    { width: 821, height: 561 },
    { width: 844, height: 561 },
    { width: 896, height: 561 },
    { width: 900, height: 560 },
    { width: 900, height: 561 },
    { width: 900, height: 690 },
    { width: 900, height: 691 },
    { width: 901, height: 691 },
    { width: 900, height: 800 },
    { width: 1200, height: 500 },
    { width: 1200, height: 560 },
    { width: 1200, height: 561 },
    { width: 1440, height: 561 },
    { width: 1440, height: 600 },
    { width: 1440, height: 690 },
    { width: 1440, height: 691 },
    { width: 1440, height: 700 },
    { width: 1440, height: 701 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto('./')
    await useFallbackHeadingFont(page)
    await expect(page.locator('.brand-icon')).toBeVisible()
    await page.locator('.intro, .top-diseases').evaluateAll(async (elements) => {
      await Promise.all(elements.flatMap((element) => element.getAnimations()).map((animation) => animation.finished))
    })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `${viewport.width}x${viewport.height} horizontal overflow`).toBeLessThanOrEqual(1)
    const controls = page.locator('.wordmark:visible, .utility-nav .text-button:visible, .intro:visible, .intro-actions button:visible, .top-diseases:visible')
    const bounds = await controls.evaluateAll((elements) => elements.map((element) => {
      const box = element.getBoundingClientRect()
      return { label: element.textContent?.trim(), left: box.left, right: box.right }
    }))
    for (const box of bounds) {
      expect(box.left, `${viewport.width}px ${box.label} left edge`).toBeGreaterThanOrEqual(0)
      expect(box.right, `${viewport.width}px ${box.label} right edge`).toBeLessThanOrEqual(viewport.width)
    }

    const targetHeights = await page.locator('.intro-actions button:visible').evaluateAll((buttons) =>
      buttons.map((button) => {
        const box = button.getBoundingClientRect()
        return { label: button.textContent?.trim(), top: box.top, bottom: box.bottom, height: box.height }
      }),
    )
    const safetyTop = await page.locator('.safety-line').evaluate((element) => element.getBoundingClientRect().top)
    for (const target of targetHeights) {
      expect(target.height, `${viewport.width}x${viewport.height} ${target.label} target height`).toBeGreaterThanOrEqual(44)
      expect(target.top, `${viewport.width}x${viewport.height} ${target.label} top edge`).toBeGreaterThanOrEqual(0)
      expect(target.bottom, `${viewport.width}x${viewport.height} ${target.label} bottom edge`).toBeLessThanOrEqual(viewport.height)
      expect(target.bottom, `${viewport.width}x${viewport.height} ${target.label} above safety line`).toBeLessThanOrEqual(safetyTop)
    }
    if (viewport.height <= 560 && viewport.width > viewport.height) {
      expect(safetyTop - Math.max(...targetHeights.map((target) => target.bottom)), `${viewport.width}x${viewport.height} action-to-safety reserve`).toBeGreaterThanOrEqual(4)
    }
    if (viewport.height <= 560 && viewport.width > viewport.height) {
      const boundary = page.locator('.synthetic-stamp')
      await expect(boundary, `${viewport.width}x${viewport.height} conceptual boundary`).toBeVisible()
      const boundaryFontSize = await boundary.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))
      expect(boundaryFontSize, `${viewport.width}x${viewport.height} conceptual boundary font size`).toBeGreaterThanOrEqual(12)
    }

    const mastheadBottom = await page.locator('.masthead').evaluate((element) => element.getBoundingClientRect().bottom)
    const panels = await page.evaluate(() => {
      const intro = document.querySelector('.intro').getBoundingClientRect()
      const diseases = document.querySelector('.top-diseases').getBoundingClientRect()
      return {
        intro: { top: intro.top, right: intro.right, bottom: intro.bottom, left: intro.left },
        diseaseTop: diseases.top,
        overlap: {
          width: Math.max(0, Math.min(intro.right, diseases.right) - Math.max(intro.left, diseases.left)),
          height: Math.max(0, Math.min(intro.bottom, diseases.bottom) - Math.max(intro.top, diseases.top)),
        },
      }
    })
    expect(panels.intro.top, `${viewport.width}x${viewport.height} intro below masthead`).toBeGreaterThanOrEqual(mastheadBottom - 1)
    expect(panels.intro.bottom, `${viewport.width}x${viewport.height} intro above safety`).toBeLessThanOrEqual(safetyTop)
    expect(panels.overlap.width * panels.overlap.height, `${viewport.width}x${viewport.height} intro clear of disease rail`).toBe(0)
    if (viewport.width <= 540 && viewport.height >= 681 && viewport.height > viewport.width) {
      expect(panels.diseaseTop - panels.intro.bottom, `${viewport.width}x${viewport.height} intro-to-disease reserve`).toBeGreaterThanOrEqual(8)
    }
  }
})

test('a saved voyage keeps resume controls inside constrained landscape layouts', async ({ page }) => {
  test.setTimeout(90_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    localStorage.setItem('paldawn:journey:v1', JSON.stringify({ progress: 0.02, narrationMode: 'guide' }))
  })
  const viewports = [
    { width: 667, height: 375 },
    { width: 720, height: 450 },
    { width: 766, height: 480 },
    { width: 766, height: 481 },
    { width: 766, height: 559 },
    { width: 766, height: 560 },
    { width: 766, height: 561 },
    { width: 821, height: 480 },
    { width: 844, height: 390 },
    { width: 896, height: 414 },
    { width: 562, height: 561 },
    { width: 600, height: 561 },
    { width: 667, height: 561 },
    { width: 691, height: 690 },
    { width: 719, height: 561 },
    { width: 720, height: 561 },
    { width: 720, height: 690 },
    { width: 819, height: 561 },
    { width: 819, height: 690 },
    { width: 820, height: 561 },
    { width: 821, height: 561 },
    { width: 844, height: 561 },
    { width: 896, height: 561 },
    { width: 900, height: 560 },
    { width: 900, height: 561 },
    { width: 900, height: 691 },
    { width: 901, height: 691 },
    { width: 900, height: 800 },
    { width: 1200, height: 500 },
    { width: 1200, height: 560 },
    { width: 1200, height: 561 },
    { width: 1440, height: 600 },
  ]

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto('./')
    await useFallbackHeadingFont(page)
    await page.locator('.intro, .top-diseases').evaluateAll(async (elements) => {
      await Promise.all(elements.flatMap((element) => element.getAnimations()).map((animation) => animation.finished))
    })
    await expect(page.getByRole('button', { name: 'Resume at Approach' })).toBeVisible()

    const geometry = await page.evaluate(() => {
      const rect = (selector) => {
        const box = document.querySelector(selector).getBoundingClientRect()
        return { top: box.top, right: box.right, bottom: box.bottom, left: box.left }
      }
      const intro = rect('.intro')
      const diseases = rect('.top-diseases')
      const safety = rect('.safety-line')
      const actionBottoms = [...document.querySelectorAll('.intro-actions button')]
        .filter((button) => button instanceof HTMLElement && button.offsetParent !== null)
        .map((button) => button.getBoundingClientRect().bottom)
      return {
        intro,
        safety,
        actionBottoms,
        overlap: {
          width: Math.max(0, Math.min(intro.right, diseases.right) - Math.max(intro.left, diseases.left)),
          height: Math.max(0, Math.min(intro.bottom, diseases.bottom) - Math.max(intro.top, diseases.top)),
        },
      }
    })
    const label = `${viewport.width}x${viewport.height}`
    expect(Math.max(...geometry.actionBottoms), `${label} saved actions above safety`).toBeLessThanOrEqual(geometry.safety.top)
    if (viewport.height <= 560 && viewport.width > viewport.height) {
      expect(geometry.safety.top - Math.max(...geometry.actionBottoms), `${label} saved action-to-safety reserve`).toBeGreaterThanOrEqual(4)
    }
    if (viewport.height <= 560 && viewport.width > viewport.height) {
      const boundary = page.locator('.synthetic-stamp')
      await expect(boundary, `${label} saved conceptual boundary`).toBeVisible()
      const boundaryFontSize = await boundary.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))
      expect(boundaryFontSize, `${label} saved conceptual boundary font size`).toBeGreaterThanOrEqual(12)
    }
    expect(geometry.intro.bottom, `${label} saved intro above safety`).toBeLessThanOrEqual(geometry.safety.top)
    expect(geometry.overlap.width * geometry.overlap.height, `${label} saved intro clear of disease rail`).toBe(0)
  }
})
