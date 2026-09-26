import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 60_000 })

const WORKSPACE_KEY = 'paldawn:workspace:v1'

test('oversized backups are rejected before reading or replacing local data', async ({ page }) => {
  await page.addInitScript(() => {
    File.prototype.text = function () { throw new Error('Oversized file must not be read') }
  })
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).click()
  const before = await page.evaluate(() => JSON.stringify(localStorage))
  await page.locator('#local-data-import').setInputFiles({
    name: 'oversized.json', mimeType: 'application/json', buffer: Buffer.alloc(256 * 1024 + 1, ' '),
  })
  await expect(page.getByText('That backup is larger than the 256 KiB local-data limit.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Replacement preview' })).toHaveCount(0)
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(before)
})

test('workspace search finds authored tracks and current private notes without moving the journey', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Begin the voyage' }).click()
  await pauseOnCurrentStage(page)
  await page.getByRole('button', { name: 'Compare tracks' }).click()
  const query = page.getByLabel('Find authored text or a private note')
  const matches = page.getByRole('region', { name: 'Matches' })
  const journeyPosition = await page.getByLabel('Journey position').inputValue()
  await page.getByLabel('Private note for Approach').fill('distinctive-study-reminder')
  await query.fill('  DISTINCTIVE-study-reminder  ')
  await expect(matches.getByRole('button')).toHaveCount(1)
  await expect(matches.getByRole('button')).toContainText('Approach')
  await page.getByRole('navigation', { name: 'Workspace stages' }).getByRole('button', { name: 'Portal' }).click()
  await matches.getByRole('button').click()
  await expect(page.getByLabel('Private note for Approach')).toHaveValue('distinctive-study-reminder')
  await expect(page.getByLabel('Journey position')).toHaveValue(journeyPosition)
  await page.getByLabel('Private note for Approach').fill('')
  await expect(matches.getByRole('button')).toHaveCount(0)
  await expect(matches).toContainText('No authored stage or private note matches')
  await query.fill('Portal')
  await expect(matches.getByRole('button').filter({ hasText: 'Portal' })).toBeVisible()
  await page.setViewportSize({ width: 320, height: 700 })
  await expect(query).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await query.fill('')
  await expect(matches).toHaveCount(0)
})

async function pauseOnCurrentStage(page) {
  await page.bringToFront()
  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByLabel('Journey position').fill('2')
  await expect(page.getByRole('heading', { name: 'Approach' })).toBeVisible()
  await page.evaluate(() => document.activeElement?.blur())
}

test('compare view and N shortcut open the current private note', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Begin the voyage' }).click()
  await pauseOnCurrentStage(page)
  await page.getByRole('button', { name: 'Compare tracks' }).click()

  await expect(page.getByRole('heading', { name: 'Compare, note, and continue.' })).toBeVisible()
  await expect(page.locator('.track-columns article')).toHaveCount(2)
  await expect(page.locator('.track-columns article').first()).toContainText('Guide')
  await expect(page.locator('.track-columns article').last()).toContainText('Engineering')
  await page.keyboard.press('Escape')

  await page.keyboard.press('n')
  await expect(page.getByLabel('Private note for Approach')).toBeFocused()
  await expect(page.getByText('Do not enter patient or personal health information.')).toBeVisible()
})

test('private notes and personal checkpoints persist and synchronize across tabs', async ({ page }) => {
  const otherPage = await page.context().newPage()
  await Promise.all([page.goto('./'), otherPage.goto('./')])
  await Promise.all([
    page.getByRole('button', { name: 'Begin the voyage' }).click(),
    otherPage.getByRole('button', { name: 'Begin the voyage' }).click(),
  ])
  await pauseOnCurrentStage(page)
  await pauseOnCurrentStage(otherPage)
  await page.bringToFront()
  await page.getByRole('button', { name: 'Private note' }).click()
  await otherPage.bringToFront()
  await otherPage.getByRole('button', { name: 'Private note' }).click()

  const note = 'Remember how the guide and engineering tracks describe the same authored stage.'
  await page.bringToFront()
  await page.getByLabel('Private note for Approach').fill(note)
  await otherPage.bringToFront()
  await expect(otherPage.getByLabel('Private note for Approach')).toHaveValue(note)

  await otherPage.getByRole('button', { name: 'Mark personal checkpoint' }).click()
  await page.bringToFront()
  await expect(page.getByRole('button', { name: 'Personal checkpoint complete' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('1 of 5 personal checkpoints')).toBeVisible()

  await otherPage.close()
  await page.reload()
  await page.keyboard.press('n')
  await expect(page.getByLabel('Private note for Approach')).toHaveValue(note)
  await expect(page.getByRole('button', { name: 'Personal checkpoint complete' })).toBeVisible()
})

test('study Markdown export contains both authored tracks and private workspace data', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Begin the voyage' }).click()
  await pauseOnCurrentStage(page)
  await page.keyboard.press('n')
  await page.getByLabel('Private note for Approach').fill('Private export note')
  await page.getByRole('button', { name: 'Mark personal checkpoint' }).click()

  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download study Markdown' }).click()
  const download = await downloadEvent
  const path = await download.path()
  expect(path).not.toBeNull()
  const markdown = await readFile(path, 'utf8')
  expect(markdown).toContain('### Guide')
  expect(markdown).toContain('### Engineering')
  expect(markdown).toContain('Private export note')
  expect(markdown).toContain('Personal checkpoints are not evidence, approval, or medical review')
})

test('local backup import validates, previews, cancels, and explicitly replaces', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).click()
  const input = page.locator('#local-data-import')
  await input.setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{invalid'),
  })
  await expect(page.getByText('That file is not valid JSON.')).toBeVisible()

  const backup = JSON.stringify({
    schema_version: 1,
    local_only: true,
    settings: {
      version: 1,
      state: {
        qualityTier: 'low',
        reducedMotion: true,
        comfortVignette: false,
        highContrast: true,
        showTelemetry: false,
        captionScale: 'large',
        playbackRate: 1.5,
      },
    },
    journey: { progress: 0, narrationMode: 'engineering' },
    bookmarks: { stageIds: ['approach', 'not-a-stage'] },
    workspace: {
      notes: { approach: 'Imported private note', 'not-a-stage': 'reject' },
      checkpoints: ['approach', 'not-a-stage'],
    },
  })
  const file = { name: 'paldawn-local-data.json', mimeType: 'application/json', buffer: Buffer.from(backup) }
  await input.setInputFiles(file)
  await expect(page.getByRole('heading', { name: 'Replacement preview' })).toBeVisible()
  await expect(page.getByText(/0% route progress · 1 saved stages · 1 private notes · 1 personal checkpoints/)).toBeVisible()
  await page.getByRole('button', { name: 'Cancel import' }).click()
  await expect(page.getByText('Backup import cancelled. Nothing changed.')).toBeVisible()
  expect(await page.evaluate((key) => localStorage.getItem(key), WORKSPACE_KEY)).toBeNull()

  await input.setInputFiles(file)
  await Promise.all([
    page.waitForNavigation(),
    page.getByRole('button', { name: 'Confirm replace local data' }).click(),
  ])
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByLabel('Quality tier')).toHaveValue('low')
  await page.getByRole('button', { name: 'Close panel' }).click()
  await page.getByRole('button', { name: 'Study' }).click()
  await expect(page.getByLabel('Private note for Approach')).toHaveValue('Imported private note')
  await expect(page.getByRole('button', { name: 'Personal checkpoint complete' })).toBeVisible()
})

test('workspace remains readable without horizontal overflow at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('./')
  await page.getByRole('button', { name: 'Study' }).click()
  await expect(page.locator('.track-columns article')).toHaveCount(2)
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
      drawerOverflow: document.querySelector('.drawer-scroll').scrollWidth - document.querySelector('.drawer-scroll').clientWidth,
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
  expect(geometry.drawerOverflow).toBeLessThanOrEqual(1)
  expect(geometry.scrollOwners.every((owner) => owner.left >= -1 && owner.right <= 321 && owner.scrollWidth > owner.clientWidth)).toBe(true)
  expect(geometry.unownedEscapes).toBe(0)
})


async function stubUpdateWorker(page) {
  await page.addInitScript(() => {
    // Exercise the real page-side preparation protocol without installing a worker.
    window.updateReplies = []
    class UpdateWorker {
      scriptURL = new URL('sw.js', window.location.href).href
      postMessage(message) { window.updateReplies.push(message) }
    }
    Object.defineProperty(window, 'ServiceWorker', { configurable: true, value: UpdateWorker })
    const worker = new UpdateWorker()
    const serviceWorker = Object.assign(new EventTarget(), {
      controller: worker,
      register: async () => ({ waiting: null, addEventListener() {} }),
    })
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: serviceWorker })
    window.sendUpdateMessage = data => {
      const event = new Event('message')
      Object.defineProperties(event, { data: { value: data }, source: { value: worker } })
      serviceWorker.dispatchEvent(event)
    }
  })
}

async function expectUpdateBlockedByUnsavedWork(page, requestId) {
  await page.evaluate(requestId => window.sendUpdateMessage({ type: 'PALDAWN_PREPARE_UPDATE', requestId }), requestId)
  await expect.poll(() => page.evaluate(requestId => window.updateReplies.find(message => message.type === 'PALDAWN_UPDATE_PREPARED' && message.requestId === requestId), requestId)).toEqual({ type: 'PALDAWN_UPDATE_PREPARED', requestId, ready: false })
  await page.evaluate(requestId => window.sendUpdateMessage({ type: 'PALDAWN_UPDATE_BLOCKED', requestId, reason: 'unsaved' }), requestId)
}

test('a sibling save preserves the only unsaved draft and does not overwrite the sibling on further edits', async ({ page }) => {
  await stubUpdateWorker(page)
  await page.addInitScript((key) => {
    localStorage.setItem('paldawn:settings:v1', JSON.stringify({ version: 1, state: { textVoyagePreferred: true, reducedMotion: true } }))
    window.workspaceWritesBlocked = true
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (name, value) {
      if (name === key && window.workspaceWritesBlocked) throw new DOMException('blocked', 'QuotaExceededError')
      return setItem.call(this, name, value)
    }
  }, WORKSPACE_KEY)
  await page.goto('./')
  await page.getByRole('button', { name: 'Enter step mode' }).click()
  await page.getByRole('button', { name: 'Private note', exact: true }).click()
  const note = page.getByLabel('Private note for Approach')
  await note.fill('Fictional draft retained only in this tab')
  await expect(page.getByText('Browser storage is unavailable.', { exact: true })).toBeVisible()
  const sibling = await page.context().newPage()
  await sibling.goto('./')
  const remote = { notes: { portal: 'Fictional sibling note' }, checkpoints: ['portal'], resetToken: null }
  await sibling.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: WORKSPACE_KEY, value: remote })
  await expect(page.getByText('Another tab changed your workspace.', { exact: true })).toBeVisible()
  await expect(note).toHaveValue('Fictional draft retained only in this tab')
  await page.evaluate(() => { window.workspaceWritesBlocked = false })
  await note.fill('Fictional draft retained and edited after conflict')
  await page.getByRole('button', { name: 'Mark personal checkpoint' }).click()
  await expect(page.getByRole('button', { name: 'Retry saving', exact: true })).toHaveCount(0)
  await expectUpdateBlockedByUnsavedWork(page, 'workspace-conflict')
  expect(await sibling.evaluate((key) => JSON.parse(localStorage.getItem(key)), WORKSPACE_KEY)).toEqual(remote)
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download study Markdown' }).click()
  const markdown = await readFile(await (await downloadEvent).path(), 'utf8')
  expect(markdown).toContain('Fictional draft retained and edited after conflict')
  expect(markdown).toContain('Personal checkpoint: Complete')
  await expect(page.getByText('Another tab changed your workspace.', { exact: true })).toBeVisible()
})
