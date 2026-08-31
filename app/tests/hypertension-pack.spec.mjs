import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 60_000 })

test('hypertension opens a fail-closed six-scale planning dossier', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'View 50' }).click()

  const catalog = page.getByRole('dialog', { name: 'Fifty conditions. One body. Six scales.' })
  const search = catalog.getByRole('searchbox', { name: 'Find a condition or system' })
  await search.fill('hypertension')
  const trigger = catalog.getByRole('button', { name: 'Inspect Hypertension build plan' })
  await trigger.click()

  const inspector = catalog.locator('.pack-inspector')
  await expect(inspector).toBeVisible()
  await expect(catalog.getByRole('button', { name: 'All conditions' })).toBeFocused()
  await expect(catalog.getByRole('heading', { name: 'Hypertension, from whole person to cell' })).toBeVisible()
  await expect(inspector.getByText('Planning only · publication blocked')).toBeVisible()
  const metrics = inspector.locator('.pack-inspector-hero dl')
  await expect(metrics.getByText('Official sources', { exact: true }).locator('..')).toContainText('3')
  await expect(metrics.getByText('Draft claims', { exact: true }).locator('..')).toContainText('5')
  await expect(metrics.getByText('Planning gates', { exact: true }).locator('..')).toContainText('2/8')
  await expect(metrics.getByText('Approved assets', { exact: true }).locator('..')).toContainText('0')
  await expect(inspector.locator('.pack-gate-ledger li')).toHaveCount(8)
  await expect(inspector.getByText('This is a build dossier, not a hypertension lesson.')).toBeVisible()

  await expect(inspector.getByText('Place blood-pressure measurement in the whole person.')).toBeVisible()
  await inspector.getByRole('button', { name: 'Clinical terms' }).click()
  await expect(inspector.getByText('Orient measurement context, time course, and target-organ scope.')).toBeVisible()
  await inspector.getByRole('button', { name: /L5 Cellular/ }).click()
  await expect(inspector.getByText('Plan endothelial and smooth-muscle signalling as a reusable cellular grammar.')).toBeVisible()
  await expect(inspector.getByText('endothelium', { exact: true })).toBeVisible()

  const sourceLinks = inspector.locator('.pack-source-ledger a')
  await expect(sourceLinks).toHaveCount(3)
  await expect(sourceLinks.nth(0)).toHaveAttribute('href', 'https://www.who.int/news-room/fact-sheets/detail/hypertension')

  await catalog.getByRole('button', { name: 'All conditions' }).click()
  await expect(trigger).toBeFocused()
  await expect(inspector).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(catalog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'View 50' })).toBeFocused()
})

test('the hypertension dossier stays bounded on a narrow phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await page.getByRole('button', { name: 'View 50' }).click()

  const catalog = page.getByRole('dialog', { name: 'Fifty conditions. One body. Six scales.' })
  await catalog.getByRole('searchbox', { name: 'Find a condition or system' }).fill('CV-03')
  await catalog.getByRole('button', { name: 'Inspect Hypertension build plan' }).click()

  const geometry = await catalog.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    const inspector = element.querySelector('.pack-inspector').getBoundingClientRect()
    return {
      bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
      left: bounds.left,
      right: bounds.right,
      top: bounds.top,
      bottom: bounds.bottom,
      inspectorLeft: inspector.left,
      inspectorRight: inspector.right,
    }
  })
  expect(geometry.bodyOverflow).toBeLessThanOrEqual(1)
  expect(geometry.left).toBeGreaterThanOrEqual(0)
  expect(geometry.right).toBeLessThanOrEqual(390)
  expect(geometry.top).toBeGreaterThanOrEqual(0)
  expect(geometry.bottom).toBeLessThanOrEqual(844)
  expect(geometry.inspectorLeft).toBeGreaterThanOrEqual(0)
  expect(geometry.inspectorRight).toBeLessThanOrEqual(390)

  await catalog.getByRole('button', { name: /L4 Tissue/ }).click()
  await expect(catalog.getByText('Compare the vessel wall with nearby tissue blood flow.')).toBeVisible()
})
