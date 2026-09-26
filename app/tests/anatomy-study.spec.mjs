import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const STUDY_KEY = 'paldawn:anatomy-study:v1'

test.describe.configure({ timeout: 60_000 })

test('Anatomy study IDs, read marks and unavailable records survive reload and export', async ({ page }) => {
  await page.addInitScript(({ key, value }) => {
    if (window.sessionStorage.getItem('paldawn:test:anatomy-seeded')) return
    window.localStorage.setItem(key, JSON.stringify(value))
    window.sessionStorage.setItem('paldawn:test:anatomy-seeded', 'true')
  }, {
    key: STUDY_KEY,
    value: {
      queue: [{ id: 'function:heart', read: false }, { id: 'retired-topic', read: false }],
      saved: { male: ['FMA7088', 'retired-concept'], female: ['HRA:VH_F_heart'] },
    },
  })
  await page.goto('./?study=anatomy&reference=male')

  await expect(page.getByRole('heading', { name: /Know the body/ })).toBeVisible()
  await expect(page.getByText('Saved study list (2)')).toBeVisible()
  await expect(page.getByText('1 unavailable saved structure')).toBeVisible()
  await page.getByRole('button', { name: 'Queue (2)' }).click()
  await expect(page.getByText('Unavailable saved reading')).toBeVisible()
  const heartReading = page.locator('.research-queue article').filter({ hasText: 'coordinated heartbeat' })
  await heartReading.getByRole('button', { name: 'Move down' }).click()
  await heartReading.getByRole('button', { name: 'Mark read' }).click()
  await expect(heartReading.getByRole('button', { name: 'Read ✓' })).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Queue (2)' }).click()
  await expect(page.getByRole('button', { name: 'Read ✓' })).toBeVisible()
  await expect(page.getByText('Unavailable saved reading')).toBeVisible()

  await page.getByText('Saved Anatomy study & backup').click()
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download Anatomy backup' }).click()
  const backup = JSON.parse(await readFile(await (await downloadEvent).path(), 'utf8'))
  expect(backup.schema_version).toBe(1)
  expect(backup.anatomy_preview).toBe(true)
  expect(backup.study.queue).toEqual([{ id: 'retired-topic', read: false }, { id: 'function:heart', read: true }])
  expect(backup.study.saved.male).toEqual(['FMA7088', 'retired-concept'])
})

test('Anatomy storage failure keeps the reading in memory and reports the unsaved state', async ({ page }) => {
  await page.addInitScript((key) => {
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('blocked', 'QuotaExceededError')
      return setItem.call(this, name, value)
    }
  }, STUDY_KEY)
  await page.goto('./?study=anatomy&reference=male')

  await page.getByRole('button', { name: 'Save this question' }).click()
  await expect(page.getByRole('button', { name: 'Queue (1)' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'browser storage is unavailable' })).toBeVisible()
})
