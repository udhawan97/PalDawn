import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 60_000 })

test('landing offers ten English-only disease journeys and opens diabetes', async ({ page }) => {
  await page.goto('./')

  const startingJourneys = page.getByRole('complementary', { name: 'Ten starting journeys' })
  await expect(startingJourneys.locator('ol').getByRole('button')).toHaveCount(10)
  await expect(startingJourneys.getByRole('button', { name: '08 Diabetes' })).toBeVisible()
  expect(await page.locator('body').innerText()).not.toMatch(/[\u0900-\u097f]/)

  await page.getByRole('button', { name: 'Explore diabetes' }).click()
  await expect(page.getByRole('heading', { name: 'Diabetes mellitus', level: 1 })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Diabetes mellitus mechanism steps' }).getByRole('button')).toHaveCount(11)
  await expect(page.getByRole('link', { name: /Your digestive system and how it works/ })).toHaveAttribute('href', /niddk\.nih\.gov/)
})

test('diabetes controls connect the explanation depth, mechanism, and 3D state', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Explore diabetes' }).click()

  await page.getByRole('button', { name: 'Clinical terms' }).click()
  await page.getByRole('button', { name: 'Step 5: Diabetes changes the control loop' }).click()
  await expect(page.getByRole('region', { name: 'Diabetes changes the control loop' })).toContainText('autoimmune beta-cell destruction')
  await expect(page.getByRole('button', { name: 'Blood vessels' })).toHaveAttribute('data-active', 'true')
  await expect(page.getByRole('button', { name: 'Immune system' })).toHaveAttribute('data-active', 'true')

  await page.getByRole('button', { name: 'Explode systems' }).click()
  await expect(page.getByRole('button', { name: 'Assemble body' })).toHaveAttribute('aria-pressed', 'true')
})

test('Atlas exposes renderer controls only when a renderer is present', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Explore diabetes' }).click()

  const renderedStage = page.getByRole('region', { name: 'Interactive 3D systems map' })
  await expect(renderedStage).toHaveAttribute('data-renderer', 'available')
  await expect(page.getByRole('group', { name: '3D view controls' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'How to use' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Mechanism lens' })).toContainText('3D view')

  const textPage = await page.context().newPage()
  await textPage.addInitScript(() => {
    localStorage.setItem('paldawn:settings:v1', JSON.stringify({
      state: { textVoyagePreferred: true },
      version: 1,
    }))
  })
  await textPage.goto('./')
  await textPage.getByRole('button', { name: 'Explore diabetes' }).click()

  const sceneFreeStage = textPage.getByRole('region', { name: 'Scene-free mechanism guide' })
  await expect(sceneFreeStage).toHaveAttribute('data-renderer', 'unavailable')
  await expect(sceneFreeStage).not.toHaveAttribute('data-focus-part', /.+/)
  await expect(textPage.getByRole('group', { name: '3D view controls' })).toHaveCount(0)
  await expect(textPage.getByRole('button', { name: /Explode systems|Pause drift|Resume drift|How to use|Whole body/ })).toHaveCount(0)
  await expect(sceneFreeStage.locator('.atlas-active-parts')).toHaveCount(0)
  await expect(sceneFreeStage.locator('.atlas-structure-status')).toHaveCount(0)
  await expect(sceneFreeStage.getByRole('note')).toContainText('3D body controls are unavailable')

  const mechanismContext = textPage.getByRole('complementary', { name: 'Mechanism context' })
  await expect(mechanismContext).toContainText('no body view or visual highlight is active')
  await expect(mechanismContext).not.toContainText(/close focus|phase anchor|highlighted structure in the 3D view/i)
  const search = textPage.getByRole('searchbox', { name: 'Find a route' })
  await search.fill('pancreas')
  await textPage.getByRole('region', { name: 'Atlas search results' }).locator('button[data-kind="pathway"]').first().click()
  await expect(textPage.getByRole('heading', { name: 'Diabetes mellitus', level: 1 })).toBeVisible()
  await textPage.getByRole('button', { name: 'Step 5: Diabetes changes the control loop' }).click()
  await expect(textPage.getByRole('button', { name: 'Step 5: Diabetes changes the control loop' })).toHaveAttribute('aria-current', 'step')
  await expect(textPage.getByRole('button', { name: 'Next step' })).toBeVisible()

  await textPage.goBack()
  await expect(textPage.getByRole('heading', { name: 'Enter the body. Follow what happens next.' })).toBeVisible()
  await textPage.goForward()
  await expect(textPage.getByRole('button', { name: 'Step 5: Diabetes changes the control loop' })).toHaveAttribute('aria-current', 'step')
  await textPage.getByRole('button', { name: 'Research lens' }).click()
  const evidenceMap = textPage.getByRole('dialog', { name: 'Evidence map' })
  await expect(evidenceMap).toBeVisible()
  await expect(evidenceMap.getByRole('link', { name: /What is diabetes/ })).toHaveAttribute('href', /niddk\.nih\.gov/)
  await textPage.close()
})

test('Atlas Wayfinder searches existing routes and arrives at the matched structure', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Explore diabetes' }).click()

  await page.keyboard.press('/')
  const search = page.getByRole('searchbox', { name: 'Find a route' })
  await expect(search).toBeFocused()
  await expect(page.getByRole('dialog', { name: 'Full transcript' })).toHaveCount(0)
  await search.fill('pancreas')

  const results = page.getByRole('region', { name: 'Atlas search results' })
  await expect(results).toContainText(/route[s]? found/)
  await results.locator('button[data-kind="pathway"]').first().click()

  await expect(page.getByRole('heading', { name: 'Diabetes mellitus', level: 1 })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Interactive 3D systems map' })).toHaveAttribute('data-focus-part', 'pancreas')
  await expect(page.getByRole('complementary', { name: 'Mechanism lens' })).toContainText('Pancreas · close focus')

  await search.fill('kidney diseases')
  await page.getByRole('button', { name: 'Go to Kidney diseases. Renal · WHO #9' }).click()
  await expect(page.getByRole('heading', { name: 'Kidney diseases', level: 1 })).toBeVisible()

  await search.fill('not a paldawn route')
  await expect(page.getByText('No route found')).toBeVisible()
  await search.press('Escape')
  await expect(search).toHaveValue('')
  await expect(page.getByRole('button', { name: '09 Kidney disease Renal' })).toHaveAttribute('aria-current', 'page')
})

test('Atlas Wayfinder focus survives browser history restoration', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Explore diabetes' }).click()
  const search = page.getByRole('searchbox', { name: 'Find a route' })
  await search.fill('pancreas')
  await page.getByRole('region', { name: 'Atlas search results' }).locator('button[data-kind="pathway"]').first().click()
  await expect(page.getByRole('region', { name: 'Interactive 3D systems map' })).toHaveAttribute('data-focus-part', 'pancreas')

  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Enter the body. Follow what happens next.' })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('region', { name: 'Interactive 3D systems map' })).toHaveAttribute('data-focus-part', 'pancreas')
})

test('Research Lens maps bundled sources to authored steps and returns to the mechanism', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Explore diabetes' }).click()
  const trigger = page.getByRole('button', { name: 'Research lens' })
  await trigger.click()

  const lens = page.getByRole('dialog', { name: 'Evidence map' })
  await expect(lens).toBeVisible()
  await expect(page.getByRole('button', { name: 'Close Research lens' })).toBeFocused()
  await expect(lens.getByRole('note')).toContainText('Named qualified review pending')
  await expect(lens.locator('.atlas-evidence-metrics')).toHaveAttribute('data-source-count', '8')
  await expect(lens.locator('.atlas-evidence-metrics')).toHaveAttribute('data-step-coverage', '11/11')
  await expect(lens.getByText('Index context').first()).toBeVisible()

  const diabetesSource = lens.locator('.atlas-evidence-source').filter({ hasText: 'What is diabetes?' })
  await expect(diabetesSource.getByRole('link')).toHaveAttribute('href', /niddk\.nih\.gov/)
  await diabetesSource.getByRole('button', { name: 'Go to step 3: The pancreas releases insulin' }).click()

  await expect(lens).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'The pancreas releases insulin' })).toBeVisible()
  await expect(trigger).toBeFocused()
})

test('mobile Research Lens stays bounded and restores focus after Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await page.getByRole('button', { name: 'Explore diabetes' }).click()
  const trigger = page.getByRole('button', { name: 'Research lens' })
  await trigger.click()

  const lens = page.getByRole('dialog', { name: 'Evidence map' })
  await expect(lens).toBeVisible()
  const geometry = await page.evaluate(() => {
    const dialog = document.querySelector('.atlas-research-lens').getBoundingClientRect()
    const stepButton = document.querySelector('.atlas-evidence-coverage button').getBoundingClientRect()
    return {
      bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
      dialogLeft: dialog.left,
      dialogRight: dialog.right,
      dialogTop: dialog.top,
      dialogBottom: dialog.bottom,
      stepWidth: stepButton.width,
      stepHeight: stepButton.height,
    }
  })
  expect(geometry.bodyOverflow).toBeLessThanOrEqual(1)
  expect(geometry.dialogLeft).toBeGreaterThanOrEqual(-1)
  expect(geometry.dialogRight).toBeLessThanOrEqual(391)
  expect(geometry.dialogTop).toBeGreaterThanOrEqual(0)
  expect(geometry.dialogBottom).toBeLessThanOrEqual(845)
  expect(geometry.stepWidth).toBeGreaterThanOrEqual(44)
  expect(geometry.stepHeight).toBeGreaterThanOrEqual(44)

  await page.keyboard.press('Escape')
  await expect(lens).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('mobile Atlas Wayfinder keeps its result rail bounded and touchable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await page.getByRole('button', { name: 'Explore diabetes' }).click()
  await page.getByRole('searchbox', { name: 'Find a route' }).fill('pancreas')

  const results = page.getByRole('region', { name: 'Atlas search results' })
  const firstResult = results.locator('button[data-kind="pathway"]').first()
  await expect(firstResult).toBeVisible()
  const geometry = await page.evaluate(() => {
    const library = document.querySelector('.atlas-library').getBoundingClientRect()
    const result = document.querySelector('.atlas-search-results button').getBoundingClientRect()
    return {
      bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
      libraryLeft: library.left,
      libraryRight: library.right,
      resultHeight: result.height,
    }
  })
  expect(geometry.bodyOverflow).toBeLessThanOrEqual(1)
  expect(geometry.libraryLeft).toBeGreaterThanOrEqual(-1)
  expect(geometry.libraryRight).toBeLessThanOrEqual(391)
  expect(geometry.resultHeight).toBeGreaterThanOrEqual(44)

  await firstResult.click()
  await expect(page.getByRole('region', { name: 'Interactive 3D systems map' })).toHaveAttribute('data-focus-part', 'pancreas')
})

test('mechanism lens enters close focus and resets with each phase', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Explore diabetes' }).click()

  const stage = page.getByRole('region', { name: 'Interactive 3D systems map' })
  const lens = page.getByRole('complementary', { name: 'Mechanism lens' })
  await expect(stage).toHaveAttribute('data-phase-detail', 'meal')
  await expect(stage).toHaveAttribute('data-focus-part', 'whole-body')
  await expect(lens).toContainText('Stomach · phase anchor')

  await page.locator('.atlas-active-parts').getByRole('button', { name: 'Pancreas' }).click()
  await expect(stage).toHaveAttribute('data-focus-part', 'pancreas')
  await expect(lens).toContainText('Pancreas · close focus')
  await expect(page.getByRole('button', { name: 'Whole body' })).toBeVisible()

  await page.getByRole('button', { name: 'Next step' }).click()
  await expect(stage).toHaveAttribute('data-phase-detail', 'absorption')
  await expect(stage).toHaveAttribute('data-focus-part', 'whole-body')
  await expect(lens).toContainText('Intestines · phase anchor')
  await expect(page.locator('.atlas-active-parts').getByRole('button')).toHaveCount(3)
})

test('mobile atlas and its how-to guide remain bounded and usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')

  const startingJourneys = page.getByRole('complementary', { name: 'Ten starting journeys' })
  await expect(startingJourneys).toBeVisible()
  await expect(startingJourneys.locator('ol').getByRole('button')).toHaveCount(10)
  await page.getByRole('button', { name: 'Explore diabetes' }).click()

  const geometry = await page.evaluate(() => {
    const elements = Array.from(document.body.querySelectorAll('*'))
    const ownsOverflow = (element) => {
      let parent = element.parentElement
      while (parent) {
        if (['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(parent).overflowX)) return true
        parent = parent.parentElement
      }
      return ['hidden', 'clip'].includes(getComputedStyle(element).overflowX)
    }
    return {
      bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
      rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      scrollOwners: elements
        .filter((element) => ['auto', 'scroll'].includes(getComputedStyle(element).overflowX) && element.scrollWidth > element.clientWidth + 1)
        .map((element) => {
          const rect = element.getBoundingClientRect()
          return { left: rect.left, right: rect.right, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }
        }),
      unownedEscapes: elements.filter((element) => {
        const rect = element.getBoundingClientRect()
        return (rect.left < -1 || rect.right > window.innerWidth + 1) && !ownsOverflow(element)
      }).length,
    }
  })
  expect(geometry.bodyOverflow).toBeLessThanOrEqual(1)
  expect(geometry.rootOverflow).toBeLessThanOrEqual(1)
  expect(geometry.scrollOwners.length).toBeGreaterThan(0)
  expect(geometry.scrollOwners.every((owner) => owner.left >= -1 && owner.right <= 391 && owner.scrollWidth > owner.clientWidth)).toBe(true)
  expect(geometry.unownedEscapes).toBe(0)
  await expect(page.getByRole('button', { name: 'Next step' })).toBeVisible()

  const learningSurface = await page.evaluate(() => {
    const visibleHeights = (selector) => [...document.querySelectorAll(selector)]
      .filter((element) => element instanceof HTMLElement && element.offsetParent !== null)
      .map((element) => element.getBoundingClientRect().height)
    const review = document.querySelector('.atlas-review-boundary')
    return {
      reading: visibleHeights('.atlas-reading-switch button'),
      view: visibleHeights('.atlas-view-actions button'),
      structures: visibleHeights('.atlas-active-parts button'),
      steps: visibleHeights('.atlas-step-actions button'),
      evidence: visibleHeights('.atlas-sources a'),
      reviewFont: Number.parseFloat(getComputedStyle(review).fontSize),
    }
  })
  for (const [group, heights] of Object.entries(learningSurface).filter(([key]) => key !== 'reviewFont')) {
    expect(heights.length, `${group} controls exist`).toBeGreaterThan(0)
    expect(Math.min(...heights), `${group} minimum control height from ${heights.join(', ')}`).toBeGreaterThanOrEqual(44)
  }
  expect(learningSurface.reviewFont, 'medical review status remains readable').toBeGreaterThanOrEqual(12)
  await expect(page.getByRole('note', { name: 'Medical review status' })).toContainText('not yet been reviewed by a named qualified clinician')

  const guideTrigger = page.getByRole('button', { name: 'How to use' })
  await guideTrigger.click()
  await expect(page.getByRole('heading', { name: 'How to use the systems map' })).toBeVisible()
  await expect(page.getByText('Choose a condition.')).toBeVisible()
  const closeGuide = page.getByRole('button', { name: 'Close how-to guide' })
  await expect(closeGuide).toBeFocused()
  await page.locator('.atlas-guide').evaluate((element) => { element.scrollTop = element.scrollHeight })
  const stickyHeader = await page.evaluate(() => {
    const guide = document.querySelector('.atlas-guide').getBoundingClientRect()
    const heading = document.querySelector('.atlas-guide-heading').getBoundingClientRect()
    const close = document.querySelector('[aria-label="Close how-to guide"]').getBoundingClientRect()
    return { guideTop: guide.top, headingTop: heading.top, closeTop: close.top, closeBottom: close.bottom, guideBottom: guide.bottom }
  })
  expect(stickyHeader.headingTop).toBeGreaterThanOrEqual(stickyHeader.guideTop - 1)
  expect(stickyHeader.closeTop).toBeGreaterThanOrEqual(stickyHeader.guideTop)
  expect(stickyHeader.closeBottom).toBeLessThanOrEqual(stickyHeader.guideBottom)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'How to use the systems map' })).toHaveCount(0)
  await expect(guideTrigger).toBeFocused()
})

test('atlas history keeps Back inside PalDawn and restores the current mechanism step', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Explore diabetes' }).click()
  await page.getByRole('button', { name: 'Step 5: Diabetes changes the control loop' }).click()
  await expect(page).not.toHaveURL(/diabetes/i)

  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Enter the body. Follow what happens next.' })).toBeVisible()

  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Diabetes mellitus', level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Step 5: Diabetes changes the control loop' })).toHaveAttribute('aria-current', 'step')

  await page.getByRole('button', { name: 'Back to overview' }).click()
  await expect(page.getByRole('heading', { name: 'Enter the body. Follow what happens next.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Explore diabetes' })).toBeFocused()
  await page.getByRole('button', { name: 'Explore diabetes' }).click()
  await expect(page.getByRole('button', { name: 'Step 5: Diabetes changes the control loop' })).toHaveAttribute('aria-current', 'step')
})

test('rapid repeated Atlas close requests traverse history only once', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Explore diabetes' }).click()

  const backCalls = await page.evaluate(() => {
    const originalBack = window.history.back.bind(window.history)
    let calls = 0
    window.history.back = () => {
      calls += 1
      originalBack()
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    return calls
  })

  expect(backCalls).toBe(1)
  await expect(page.getByRole('heading', { name: 'Enter the body. Follow what happens next.' })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Diabetes mellitus', level: 1 })).toBeVisible()
})

test('Escape closes only the topmost Atlas surface and restart returns to the intro', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('./')
  await page.getByRole('button', { name: 'Explore diabetes' }).click()
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'Settings' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Diabetes mellitus', level: 1 })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'Enter the body. Follow what happens next.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Explore diabetes' })).toBeFocused()

  await page.getByRole('button', { name: 'Explore diabetes' }).click()
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Restart voyage' }).click()
  await page.getByRole('button', { name: 'Confirm restart voyage' }).click()
  await expect(page.getByRole('heading', { name: 'Enter the body. Follow what happens next.' })).toBeVisible()
  await expect(page.locator('#intro-title')).toBeFocused()
  await expect(page.getByRole('heading', { name: 'Diabetes mellitus', level: 1 })).toHaveCount(0)
})

test('the final mechanism step closes with a clear next decision', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Explore diabetes' }).click()
  await page.getByRole('button', { name: 'Step 11: Management supports the feedback loop' }).click()

  await expect(page.getByText('Mechanism complete.')).toBeVisible()
  const chooseAnother = page.getByRole('button', { name: 'Choose another condition' })
  await expect(chooseAnother).toBeEnabled()
  await chooseAnother.click()
  await expect(page.getByRole('complementary', { name: 'Ten starting journeys' })).toBeVisible()
})
