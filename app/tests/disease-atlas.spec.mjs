import { expect, test } from '@playwright/test'

test('landing offers ten English-only disease journeys and opens diabetes', async ({ page }) => {
  await page.goto('./')

  const startingJourneys = page.getByRole('complementary', { name: 'Ten starting journeys' })
  await expect(startingJourneys.getByRole('button')).toHaveCount(10)
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

test('mobile atlas and its how-to guide remain bounded and usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')

  const startingJourneys = page.getByRole('complementary', { name: 'Ten starting journeys' })
  await expect(startingJourneys).toBeVisible()
  await expect(startingJourneys.getByRole('button')).toHaveCount(10)
  await page.getByRole('button', { name: 'Explore diabetes' }).click()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
  await expect(page.getByRole('button', { name: 'Next step' })).toBeVisible()

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
  await expect(page.getByRole('heading', { name: /See disease/ })).toBeVisible()

  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Diabetes mellitus', level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Step 5: Diabetes changes the control loop' })).toHaveAttribute('aria-current', 'step')

  await page.getByRole('button', { name: 'Back to overview' }).click()
  await expect(page.getByRole('heading', { name: /See disease/ })).toBeVisible()
  await page.getByRole('button', { name: 'Explore diabetes' }).click()
  await expect(page.getByRole('button', { name: 'Step 5: Diabetes changes the control loop' })).toHaveAttribute('aria-current', 'step')
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
