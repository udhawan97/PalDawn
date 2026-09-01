import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 60_000 })

test('the 50-condition curriculum separates explorable previews from the build queue', async ({ page }) => {
  await page.goto('./')

  const launch = page.getByRole('button', { name: 'View 50' })
  await launch.click()

  const catalog = page.getByRole('dialog', { name: 'Fifty conditions. One body. Six scales.' })
  await expect(catalog).toBeVisible()
  await expect(page.getByRole('searchbox', { name: 'Find a condition or system' })).toBeFocused()
  await expect(catalog.getByText('This is a coverage plan, not a worldwide rank.')).toBeVisible()
  await expect(catalog.locator('.curriculum-grid > li')).toHaveCount(50)
  await expect(catalog.getByText('Published review').locator('..')).toContainText('0')

  const search = page.getByRole('searchbox', { name: 'Find a condition or system' })
  await search.fill('hypertension')
  await expect(catalog.locator('.curriculum-grid > li')).toHaveCount(1)
  await expect(catalog.getByText('Hypertension')).toBeVisible()
  await expect(catalog.getByText('Dossier draft · inspect build plan')).toBeVisible()

  await search.fill('')
  await catalog.getByRole('button', { name: 'Explore now' }).click()
  await expect(catalog.locator('.curriculum-grid > li')).toHaveCount(10)
  await expect(catalog.locator('.curriculum-grid button')).toHaveCount(10)

  await page.keyboard.press('Escape')
  await expect(catalog).toHaveCount(0)
  await expect(launch).toBeFocused()
})

test('the curriculum remains bounded on a narrow phone and can launch an existing journey', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await page.getByRole('button', { name: 'View 50' }).click()

  const catalog = page.getByRole('dialog', { name: 'Fifty conditions. One body. Six scales.' })
  const geometry = await catalog.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    const grid = element.querySelector('.curriculum-grid').getBoundingClientRect()
    return {
      bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
      left: bounds.left,
      right: bounds.right,
      top: bounds.top,
      bottom: bounds.bottom,
      gridLeft: grid.left,
      gridRight: grid.right,
    }
  })
  expect(geometry.bodyOverflow).toBeLessThanOrEqual(1)
  expect(geometry.left).toBeGreaterThanOrEqual(0)
  expect(geometry.right).toBeLessThanOrEqual(390)
  expect(geometry.top).toBeGreaterThanOrEqual(0)
  expect(geometry.bottom).toBeLessThanOrEqual(844)
  expect(geometry.gridLeft).toBeGreaterThanOrEqual(0)
  expect(geometry.gridRight).toBeLessThanOrEqual(390)

  const search = page.getByRole('searchbox', { name: 'Find a condition or system' })
  await search.fill('diabetes')
  await catalog.getByRole('button', { name: /ME-01 Diabetes mellitus/ }).click()
  await expect(catalog).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Diabetes mellitus', level: 1 })).toBeVisible()
})

test('the six-scale legend becomes a keyboard-scrollable local region only when it overflows', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('paldawn:settings:v1', JSON.stringify({
      state: { highContrast: true, reducedMotion: true },
      version: 1,
    }))
  })

  for (const width of [320, 375, 414]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('./')
    await page.getByRole('button', { name: 'View 50' }).click()
    const legend = page.getByRole('list', { name: 'Planned semantic scale coverage' })
    await expect(legend).toHaveAttribute('data-scrollable', 'true')
    await expect(legend).toHaveAttribute('tabindex', '0')

    const geometry = await legend.evaluate((element) => ({
      bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      itemWidths: [...element.children].map((item) => item.getBoundingClientRect().width),
      labels: [...element.querySelectorAll('strong')].map((label) => label.textContent),
    }))
    expect(geometry.bodyOverflow).toBeLessThanOrEqual(1)
    expect(geometry.scrollWidth).toBeGreaterThan(geometry.clientWidth + 1)
    expect(Math.min(...geometry.itemWidths)).toBeGreaterThanOrEqual(111)
    expect(geometry.labels).toEqual(['Body', 'System', 'Organ', 'Structure', 'Tissue', 'Cellular'])

    await legend.focus()
    await expect(legend).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => legend.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
  }

  await page.setViewportSize({ width: 1024, height: 844 })
  await page.goto('./')
  await page.getByRole('button', { name: 'View 50' }).click()
  const desktopLegend = page.getByRole('list', { name: 'Planned semantic scale coverage' })
  await expect(desktopLegend).not.toHaveAttribute('data-scrollable', 'true')
  await expect(desktopLegend).not.toHaveAttribute('tabindex', '0')
  const desktopWidths = await desktopLegend.locator('li').evaluateAll((items) => items.map((item) => item.getBoundingClientRect().width))
  expect(Math.max(...desktopWidths) - Math.min(...desktopWidths)).toBeLessThanOrEqual(1)
})
