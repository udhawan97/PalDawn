import { expect, test } from '@playwright/test'

const JOURNEY_KEY = 'paldawn:journey:v1'
const SETTINGS_KEY = 'paldawn:settings:v1'
const BOOKMARKS_KEY = 'paldawn:bookmarks:v1'
const WORKSPACE_KEY = 'paldawn:workspace:v1'
const RESET_KEY = 'paldawn:reset:v1'
const RESET_PENDING_KEY = 'paldawn:reset-pending:v1'

const importedBackup = () => JSON.stringify({
  schema_version: 2,
  local_only: true,
  settings: {
    version: 1,
    state: {
      qualityTier: 'low',
      reducedMotion: false,
      comfortVignette: true,
      highContrast: true,
      showTelemetry: false,
      captionScale: 'large',
      playbackRate: 1.5,
      textVoyagePreferred: false,
    },
  },
  journey: { progress: 0.61, narrationMode: 'engineering' },
  bookmarks: { stageIds: ['portal'] },
  workspace: { notes: { portal: 'Imported private note' }, checkpoints: ['arrival'] },
})

async function pauseOnCurrentStage(page) {
  await page.bringToFront()
  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByLabel('Journey position').fill('2')
  await expect(page.getByRole('heading', { name: 'Approach' })).toBeVisible()
}

test('skip navigation moves focus before and after entry', async ({ page }) => {
  await page.goto('./')

  const introSkip = page.getByRole('link', { name: 'Skip to introduction' })
  await introSkip.focus()
  await introSkip.press('Enter')
  await expect(page.locator('#intro-title')).toBeFocused()

  await page.getByRole('button', { name: 'Begin the voyage' }).click()
  const controlsSkip = page.getByRole('link', { name: 'Skip to voyage controls' })
  await controlsSkip.focus()
  await controlsSkip.press('Enter')
  await expect(page.locator('#flight-controls')).toBeFocused()
})

test('completion becomes the focused view on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('./')
  await page.getByRole('button', { name: 'Begin the voyage' }).click()

  const next = page.getByRole('button', { name: 'Skip to next stage' })
  for (let step = 0; step < 5; step += 1) await next.click()

  const summary = page.locator('#completion-summary')
  await expect(summary).toBeVisible()
  await expect(summary).toBeFocused()
  await expect(page.locator('#flight-controls')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Replay voyage' })).toBeVisible()
})

test('a persisted completed journey restores the summary', async ({ page }) => {
  await page.addInitScript(({ key }) => {
    localStorage.setItem(key, JSON.stringify({ progress: 1, narrationMode: 'engineering' }))
  }, { key: JOURNEY_KEY })
  await page.goto('./')

  await expect(page.locator('#completion-summary')).toBeVisible()
  await expect(page.locator('#completion-summary')).toBeFocused()
  await expect(page.getByText('You completed the engineering track.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Resume at' })).toHaveCount(0)
})

test('settings selects provide 44px activation targets', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).click()

  const heights = await page.locator('.quality-setting select').evaluateAll((selects) =>
    selects.map((select) => select.getBoundingClientRect().height),
  )
  expect(heights).toHaveLength(3)
  expect(heights.every((height) => height >= 44)).toBe(true)
})

test('reset in one tab cannot be undone by another open tab', async ({ page }) => {
  test.setTimeout(60_000)
  const otherPage = await page.context().newPage()
  await Promise.all([page.goto('./'), otherPage.goto('./')])
  await Promise.all([
    page.getByRole('button', { name: 'Begin the voyage' }).click(),
    otherPage.getByRole('button', { name: 'Begin the voyage' }).click(),
  ])
  await pauseOnCurrentStage(page)
  await pauseOnCurrentStage(otherPage)
  await otherPage.evaluate(() => document.activeElement?.blur())
  await otherPage.keyboard.press('b')
  await otherPage.getByRole('button', { name: 'Skip to next stage' }).click()
  await otherPage.getByRole('button', { name: 'Settings' }).click()
  await otherPage.getByLabel('Quality tier').selectOption('low')

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Reset local data' }).click()
  const pageReloaded = page.waitForEvent('load')
  const otherPageReloaded = otherPage.waitForEvent('load')
  await page.getByRole('button', { name: 'Confirm reset' }).click()
  await Promise.all([pageReloaded, otherPageReloaded])
  await page.waitForTimeout(3500)

  for (const candidate of [page, otherPage]) {
    const stored = await candidate.evaluate(({ journeyKey, settingsKey, bookmarksKey, resetKey }) => ({
      journey: localStorage.getItem(journeyKey),
      settings: localStorage.getItem(settingsKey),
      bookmarks: localStorage.getItem(bookmarksKey),
      reset: localStorage.getItem(resetKey),
    }), { journeyKey: JOURNEY_KEY, settingsKey: SETTINGS_KEY, bookmarksKey: 'paldawn:bookmarks:v1', resetKey: RESET_KEY })
    expect(stored.journey).toBeNull()
    expect(stored.settings).toBeNull()
    expect(stored.bookmarks).toBeNull()
    expect(stored.reset).not.toBeNull()
    await expect(candidate.getByRole('button', { name: 'Begin the voyage' })).toBeVisible()
    await expect(candidate.getByRole('button', { name: 'Resume at' })).toHaveCount(0)
  }
})

test('reset marker failure stays on the page and reports retained data truthfully', async ({ page }) => {
  await page.addInitScript(({ journeyKey, resetKey }) => {
    localStorage.setItem(journeyKey, JSON.stringify({ progress: 0.42, narrationMode: 'guide' }))
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === resetKey) throw new DOMException('Injected reset failure', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  }, { journeyKey: JOURNEY_KEY, resetKey: RESET_KEY })
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Reset local data' }).click()
  await page.getByRole('button', { name: 'Confirm reset' }).click()

  await expect(page.getByText(/could not verify that every local record was cleared/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  const retained = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), JOURNEY_KEY)
  expect(retained.progress).toBe(0.42)
})

test('late reset deletion failure does not publish reset intent to another tab', async ({ page }) => {
  const otherPage = await page.context().newPage()
  await page.addInitScript(({ bookmarksKey, journeyKey, resetKey, settingsKey, workspaceKey }) => {
    const resetToken = 'reset-before-test'
    localStorage.setItem(resetKey, resetToken)
    localStorage.setItem(settingsKey, JSON.stringify({ state: { qualityTier: 'low' }, version: 1 }))
    localStorage.setItem(journeyKey, JSON.stringify({ progress: 0.42, narrationMode: 'guide', resetToken }))
    localStorage.setItem(bookmarksKey, JSON.stringify({ stageIds: ['portal'], resetToken }))
    localStorage.setItem(workspaceKey, JSON.stringify({ notes: { portal: 'Retain me' }, checkpoints: [], resetToken }))
    const original = Storage.prototype.removeItem
    let delayed = false
    Storage.prototype.removeItem = function removeItem(key) {
      if (key === bookmarksKey) throw new DOMException('Injected late deletion failure', 'QuotaExceededError')
      const result = original.call(this, key)
      if (key === settingsKey && !delayed) {
        delayed = true
        const deadline = performance.now() + 750
        while (performance.now() < deadline) { /* Let the peer renderer observe the pending fence. */ }
      }
      return result
    }
    sessionStorage.setItem('paldawn:test:reset-loads', String(Number(sessionStorage.getItem('paldawn:test:reset-loads') ?? '0') + 1))
  }, {
    bookmarksKey: 'paldawn:bookmarks:v1',
    journeyKey: JOURNEY_KEY,
    resetKey: RESET_KEY,
    settingsKey: SETTINGS_KEY,
    workspaceKey: 'paldawn:workspace:v1',
  })
  await otherPage.addInitScript(({ pendingKey, resetKey, settingsKey }) => {
    sessionStorage.setItem('paldawn:test:reset-loads', String(Number(sessionStorage.getItem('paldawn:test:reset-loads') ?? '0') + 1))
    window.addEventListener('storage', (event) => {
      if (event.key !== pendingKey || event.newValue === null) return
      const before = localStorage.getItem(settingsKey)
      const select = document.querySelector('#quality-tier')
      if (!(select instanceof HTMLSelectElement)) return
      select.value = 'high'
      select.dispatchEvent(new Event('change', { bubbles: true }))
      sessionStorage.setItem('paldawn:test:pending-write-attempt', JSON.stringify({
        blocked: localStorage.getItem(settingsKey) === before,
        committedAtAttempt: localStorage.getItem(resetKey),
      }))
    })
  }, { pendingKey: RESET_PENDING_KEY, resetKey: RESET_KEY, settingsKey: SETTINGS_KEY })
  await page.goto('./')
  await otherPage.goto('./')
  await otherPage.getByRole('button', { name: 'Settings' }).click()
  await expect(otherPage.getByLabel('Quality tier')).toBeVisible()

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Reset local data' }).click()
  const peerReloaded = otherPage.waitForEvent('load', { timeout: 1_500 }).then(() => true, () => false)
  await page.getByRole('button', { name: 'Confirm reset' }).click()

  await expect(page.getByText(/could not verify that every local record was cleared/)).toBeVisible()
  expect(await peerReloaded).toBe(false)
  expect(await otherPage.evaluate(() => Number(sessionStorage.getItem('paldawn:test:reset-loads')))).toBe(1)
  expect(await otherPage.evaluate(() => JSON.parse(sessionStorage.getItem('paldawn:test:pending-write-attempt')))).toEqual({
    blocked: true,
    committedAtAttempt: 'reset-before-test',
  })
  const retained = await page.evaluate(({ bookmarksKey, journeyKey, resetKey, settingsKey, workspaceKey }) => ({
    bookmarks: localStorage.getItem(bookmarksKey),
    journey: localStorage.getItem(journeyKey),
    reset: localStorage.getItem(resetKey),
    settings: localStorage.getItem(settingsKey),
    workspace: localStorage.getItem(workspaceKey),
  }), {
    bookmarksKey: 'paldawn:bookmarks:v1',
    journeyKey: JOURNEY_KEY,
    resetKey: RESET_KEY,
    settingsKey: SETTINGS_KEY,
    workspaceKey: 'paldawn:workspace:v1',
  })
  expect(retained.settings).not.toBeNull()
  expect(retained.journey).not.toBeNull()
  expect(retained.bookmarks).not.toBeNull()
  expect(retained.workspace).not.toBeNull()
  expect(retained.reset).toBe('reset-before-test')
  await otherPage.close()
})

test('a peer write paused after its old-generation check cannot survive reset commit', async ({ page }) => {
  test.setTimeout(120_000)
  const otherPage = await page.context().newPage()
  await page.addInitScript(({ bookmarksKey, journeyKey, resetKey, settingsKey, workspaceKey }) => {
    if (sessionStorage.getItem('paldawn:test:stale-write-seeded')) return
    sessionStorage.setItem('paldawn:test:stale-write-seeded', 'true')
    const token = 'generation-before-reset'
    localStorage.setItem(resetKey, token)
    localStorage.setItem(settingsKey, JSON.stringify({ state: { qualityTier: 'low' }, version: 1, resetToken: token }))
    localStorage.setItem(journeyKey, JSON.stringify({ progress: 0.42, narrationMode: 'guide', resetToken: token }))
    localStorage.setItem(bookmarksKey, JSON.stringify({ stageIds: ['portal'], resetToken: token }))
    localStorage.setItem(workspaceKey, JSON.stringify({ notes: { portal: 'Remove me' }, checkpoints: [], resetToken: token }))
  }, { bookmarksKey: BOOKMARKS_KEY, journeyKey: JOURNEY_KEY, resetKey: RESET_KEY, settingsKey: SETTINGS_KEY, workspaceKey: WORKSPACE_KEY })
  await otherPage.addInitScript(({ bookmarksKey, journeyKey, pendingKey, resetKey, settingsKey, workspaceKey }) => {
    const originalSetItem = Storage.prototype.setItem
    const originalRemoveItem = Storage.prototype.removeItem
    Storage.prototype.setItem = function setItem(key, value) {
      if (key !== settingsKey || sessionStorage.getItem('paldawn:test:arm-post-check') !== 'true') {
        return originalSetItem.call(this, key, value)
      }
      sessionStorage.removeItem('paldawn:test:arm-post-check')
      const token = 'generation-after-reset'
      const desired = {
        [settingsKey]: null,
        [journeyKey]: null,
        [bookmarksKey]: null,
        [workspaceKey]: null,
      }
      originalSetItem.call(this, pendingKey, JSON.stringify({ schemaVersion: 1, token, kind: 'reset', desired }))
      for (const dataKey of [settingsKey, journeyKey, bookmarksKey, workspaceKey]) {
        originalRemoveItem.call(this, dataKey)
      }
      originalSetItem.call(this, resetKey, token)
      originalSetItem.call(this, key, value)
      sessionStorage.setItem('paldawn:test:post-check-interleaved', 'true')
    }
  }, {
    bookmarksKey: BOOKMARKS_KEY,
    journeyKey: JOURNEY_KEY,
    pendingKey: RESET_PENDING_KEY,
    resetKey: RESET_KEY,
    settingsKey: SETTINGS_KEY,
    workspaceKey: WORKSPACE_KEY,
  })
  await Promise.all([page.goto('./'), otherPage.goto('./')])
  await otherPage.getByRole('button', { name: 'Settings' }).click()
  await otherPage.evaluate(() => sessionStorage.setItem('paldawn:test:arm-post-check', 'true'))
  const pageReloaded = page.waitForEvent('load')
  await otherPage.getByLabel('Quality tier').selectOption('high')
  await pageReloaded

  expect(await otherPage.evaluate(() => sessionStorage.getItem('paldawn:test:post-check-interleaved'))).toBe('true')
  const stored = await page.evaluate(({ bookmarksKey, journeyKey, pendingKey, resetKey, settingsKey, workspaceKey }) => ({
    bookmarks: localStorage.getItem(bookmarksKey),
    journey: localStorage.getItem(journeyKey),
    pending: JSON.parse(localStorage.getItem(pendingKey)),
    reset: localStorage.getItem(resetKey),
    settings: localStorage.getItem(settingsKey),
    workspace: localStorage.getItem(workspaceKey),
  }), {
    bookmarksKey: BOOKMARKS_KEY,
    journeyKey: JOURNEY_KEY,
    pendingKey: RESET_PENDING_KEY,
    resetKey: RESET_KEY,
    settingsKey: SETTINGS_KEY,
    workspaceKey: WORKSPACE_KEY,
  })
  expect(stored.settings).toBeNull()
  expect(stored.journey).toBeNull()
  expect(stored.bookmarks).toBeNull()
  expect(stored.workspace).toBeNull()
  expect(stored.reset).toBe('generation-after-reset')
  expect(stored.pending).toMatchObject({ token: stored.reset, kind: 'reset' })
  await otherPage.reload()
  await expect(otherPage.getByRole('button', { name: 'Begin the voyage' })).toBeVisible()
  await otherPage.close()
})

test('an unverified rollback leaves a durable fence that reload completes', async ({ page }) => {
  test.setTimeout(120_000)
  await page.addInitScript(({ bookmarksKey, journeyKey, resetKey, settingsKey, workspaceKey }) => {
    if (sessionStorage.getItem('paldawn:test:rollback-failure-injected')) return
    sessionStorage.setItem('paldawn:test:rollback-failure-injected', 'true')
    const token = 'generation-before-interruption'
    localStorage.setItem(resetKey, token)
    localStorage.setItem(settingsKey, JSON.stringify({ state: { qualityTier: 'high' }, version: 1, resetToken: token }))
    localStorage.setItem(journeyKey, JSON.stringify({ progress: 0.42, narrationMode: 'guide', resetToken: token }))
    localStorage.setItem(bookmarksKey, JSON.stringify({ stageIds: ['portal'], resetToken: token }))
    localStorage.setItem(workspaceKey, JSON.stringify({ notes: { portal: 'Recover me' }, checkpoints: [], resetToken: token }))

    const originalRemoveItem = Storage.prototype.removeItem
    const originalSetItem = Storage.prototype.setItem
    let deletionFailed = false
    let rollbackWriteMustFail = false
    Storage.prototype.removeItem = function removeItem(key) {
      if (key === bookmarksKey && !deletionFailed) {
        deletionFailed = true
        rollbackWriteMustFail = true
        throw new DOMException('Injected deletion failure', 'QuotaExceededError')
      }
      return originalRemoveItem.call(this, key)
    }
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === settingsKey && rollbackWriteMustFail) {
        rollbackWriteMustFail = false
        throw new DOMException('Injected rollback failure', 'QuotaExceededError')
      }
      return originalSetItem.call(this, key, value)
    }
  }, { bookmarksKey: BOOKMARKS_KEY, journeyKey: JOURNEY_KEY, resetKey: RESET_KEY, settingsKey: SETTINGS_KEY, workspaceKey: WORKSPACE_KEY })
  await page.goto('./')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Reset local data' }).click()
  await page.getByRole('button', { name: 'Confirm reset' }).click()

  await expect(page.getByText(/could not verify that every local record was cleared/)).toBeVisible()
  const interrupted = await page.evaluate(({ pendingKey, resetKey }) => ({
    pending: JSON.parse(localStorage.getItem(pendingKey)),
    reset: localStorage.getItem(resetKey),
  }), { pendingKey: RESET_PENDING_KEY, resetKey: RESET_KEY })
  expect(interrupted.pending).toMatchObject({ kind: 'reset' })
  expect(interrupted.pending.token).not.toBe(interrupted.reset)

  await page.reload()
  const recovered = await page.evaluate(({ bookmarksKey, journeyKey, pendingKey, resetKey, settingsKey, workspaceKey }) => ({
    bookmarks: localStorage.getItem(bookmarksKey),
    journey: localStorage.getItem(journeyKey),
    pending: JSON.parse(localStorage.getItem(pendingKey)),
    reset: localStorage.getItem(resetKey),
    settings: localStorage.getItem(settingsKey),
    workspace: localStorage.getItem(workspaceKey),
  }), {
    bookmarksKey: BOOKMARKS_KEY,
    journeyKey: JOURNEY_KEY,
    pendingKey: RESET_PENDING_KEY,
    resetKey: RESET_KEY,
    settingsKey: SETTINGS_KEY,
    workspaceKey: WORKSPACE_KEY,
  })
  expect(recovered.settings).toBeNull()
  expect(recovered.journey).toBeNull()
  expect(recovered.bookmarks).toBeNull()
  expect(recovered.workspace).toBeNull()
  expect(recovered.pending).toMatchObject({ token: recovered.reset, kind: 'reset' })
  await expect(page.getByRole('button', { name: 'Begin the voyage' })).toBeVisible()

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByLabel('Quality tier').selectOption('low')
  const savedSettings = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), SETTINGS_KEY)
  expect(savedSettings.state.qualityTier).toBe('low')
  expect(savedSettings.resetToken).toBe(recovered.reset)
})

test('a corrupt transaction fence preserves records until explicit recovery', async ({ page }) => {
  test.setTimeout(120_000)
  await page.addInitScript(({ bookmarksKey, journeyKey, pendingKey, resetKey, settingsKey, workspaceKey }) => {
    if (sessionStorage.getItem('paldawn:test:corrupt-fence-seeded')) return
    sessionStorage.setItem('paldawn:test:corrupt-fence-seeded', 'true')
    const token = 'generation-before-corrupt-fence'
    localStorage.setItem(resetKey, token)
    localStorage.setItem(settingsKey, JSON.stringify({ state: { qualityTier: 'high' }, version: 1, resetToken: token }))
    localStorage.setItem(journeyKey, JSON.stringify({ progress: 0.42, narrationMode: 'guide', resetToken: token }))
    localStorage.setItem(bookmarksKey, JSON.stringify({ stageIds: ['portal'], resetToken: token }))
    localStorage.setItem(workspaceKey, JSON.stringify({ notes: { portal: 'Preserve me' }, checkpoints: [], resetToken: token }))
    localStorage.setItem(pendingKey, '{"schemaVersion":')
  }, {
    bookmarksKey: BOOKMARKS_KEY,
    journeyKey: JOURNEY_KEY,
    pendingKey: RESET_PENDING_KEY,
    resetKey: RESET_KEY,
    settingsKey: SETTINGS_KEY,
    workspaceKey: WORKSPACE_KEY,
  })
  await page.goto('./')
  const before = await page.evaluate(({ bookmarksKey, journeyKey, pendingKey, settingsKey, workspaceKey }) => ({
    bookmarks: localStorage.getItem(bookmarksKey),
    journey: localStorage.getItem(journeyKey),
    pending: localStorage.getItem(pendingKey),
    settings: localStorage.getItem(settingsKey),
    workspace: localStorage.getItem(workspaceKey),
  }), {
    bookmarksKey: BOOKMARKS_KEY,
    journeyKey: JOURNEY_KEY,
    pendingKey: RESET_PENDING_KEY,
    settingsKey: SETTINGS_KEY,
    workspaceKey: WORKSPACE_KEY,
  })
  expect(before.pending).toBe('{"schemaVersion":')
  expect(before.settings).not.toBeNull()
  expect(before.journey).not.toBeNull()
  expect(before.bookmarks).not.toBeNull()
  expect(before.workspace).not.toBeNull()

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByLabel('Quality tier').selectOption('low')
  await expect(page.getByText(/preference changed for this tab, but browser storage is unavailable/)).toBeVisible()
  expect(await page.evaluate((key) => localStorage.getItem(key), SETTINGS_KEY)).toBe(before.settings)

  await page.getByRole('button', { name: 'Reset local data' }).click()
  const reloaded = page.waitForEvent('load')
  await page.getByRole('button', { name: 'Confirm reset' }).click()
  await reloaded
  const recovered = await page.evaluate(({ bookmarksKey, journeyKey, pendingKey, resetKey, settingsKey, workspaceKey }) => ({
    bookmarks: localStorage.getItem(bookmarksKey),
    journey: localStorage.getItem(journeyKey),
    pending: JSON.parse(localStorage.getItem(pendingKey)),
    reset: localStorage.getItem(resetKey),
    settings: localStorage.getItem(settingsKey),
    workspace: localStorage.getItem(workspaceKey),
  }), {
    bookmarksKey: BOOKMARKS_KEY,
    journeyKey: JOURNEY_KEY,
    pendingKey: RESET_PENDING_KEY,
    resetKey: RESET_KEY,
    settingsKey: SETTINGS_KEY,
    workspaceKey: WORKSPACE_KEY,
  })
  expect(recovered.settings).toBeNull()
  expect(recovered.journey).toBeNull()
  expect(recovered.bookmarks).toBeNull()
  expect(recovered.workspace).toBeNull()
  expect(recovered.pending).toMatchObject({ token: recovered.reset, kind: 'reset' })
})

test('two-tab import publishes only its fully verified committed generation', async ({ page }) => {
  test.setTimeout(120_000)
  const otherPage = await page.context().newPage()
  await page.addInitScript(() => {
    sessionStorage.setItem('paldawn:test:import-loads', String(Number(sessionStorage.getItem('paldawn:test:import-loads') ?? '0') + 1))
  })
  await otherPage.addInitScript(() => {
    sessionStorage.setItem('paldawn:test:import-loads', String(Number(sessionStorage.getItem('paldawn:test:import-loads') ?? '0') + 1))
  })
  await Promise.all([page.goto('./'), otherPage.goto('./')])
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.locator('#local-data-import').setInputFiles({
    name: 'paldawn-import.json',
    mimeType: 'application/json',
    buffer: Buffer.from(importedBackup()),
  })
  await expect(page.getByRole('heading', { name: 'Replacement preview' })).toBeVisible()
  const pageReloaded = page.waitForEvent('load')
  const otherPageReloaded = otherPage.waitForEvent('load')
  await page.getByRole('button', { name: 'Confirm replace local data' }).click()
  await Promise.all([pageReloaded, otherPageReloaded])

  for (const candidate of [page, otherPage]) {
    const committed = await candidate.evaluate(({ bookmarksKey, journeyKey, pendingKey, resetKey, settingsKey, workspaceKey }) => {
      const values = {
        [settingsKey]: localStorage.getItem(settingsKey),
        [journeyKey]: localStorage.getItem(journeyKey),
        [bookmarksKey]: localStorage.getItem(bookmarksKey),
        [workspaceKey]: localStorage.getItem(workspaceKey),
      }
      return {
        loads: Number(sessionStorage.getItem('paldawn:test:import-loads')),
        pending: JSON.parse(localStorage.getItem(pendingKey)),
        reset: localStorage.getItem(resetKey),
        values,
      }
    }, {
      bookmarksKey: BOOKMARKS_KEY,
      journeyKey: JOURNEY_KEY,
      pendingKey: RESET_PENDING_KEY,
      resetKey: RESET_KEY,
      settingsKey: SETTINGS_KEY,
      workspaceKey: WORKSPACE_KEY,
    })
    expect(committed.loads).toBe(2)
    expect(committed.pending).toMatchObject({ token: committed.reset, kind: 'import', desired: committed.values })
    for (const value of Object.values(committed.values)) {
      expect(JSON.parse(value).resetToken).toBe(committed.reset)
    }
    expect(JSON.parse(committed.values[SETTINGS_KEY]).state.qualityTier).toBe('low')
    expect(JSON.parse(committed.values[JOURNEY_KEY]).progress).toBe(0.61)
  }
  await otherPage.close()
})

test('failed two-tab import rolls back without publishing a peer reload', async ({ page }) => {
  test.setTimeout(120_000)
  const otherPage = await page.context().newPage()
  await page.addInitScript(({ bookmarksKey, journeyKey, pendingKey, resetKey, settingsKey, workspaceKey }) => {
    const token = 'generation-before-import'
    const oldValues = {
      [settingsKey]: JSON.stringify({ state: { qualityTier: 'high' }, version: 1, resetToken: token }),
      [journeyKey]: JSON.stringify({ progress: 0.23, narrationMode: 'guide', resetToken: token }),
      [bookmarksKey]: JSON.stringify({ stageIds: ['approach'], resetToken: token }),
      [workspaceKey]: JSON.stringify({ notes: { approach: 'Original note' }, checkpoints: [], resetToken: token }),
    }
    localStorage.setItem(resetKey, token)
    for (const [key, value] of Object.entries(oldValues)) localStorage.setItem(key, value)
    sessionStorage.setItem('paldawn:test:original-import-values', JSON.stringify(oldValues))
    const originalSetItem = Storage.prototype.setItem
    let failed = false
    Storage.prototype.setItem = function setItem(key, value) {
      const pending = localStorage.getItem(pendingKey)
      if (key === workspaceKey && !failed && pending?.includes('"kind":"import"')) {
        failed = true
        throw new DOMException('Injected import failure', 'QuotaExceededError')
      }
      return originalSetItem.call(this, key, value)
    }
  }, {
    bookmarksKey: BOOKMARKS_KEY,
    journeyKey: JOURNEY_KEY,
    pendingKey: RESET_PENDING_KEY,
    resetKey: RESET_KEY,
    settingsKey: SETTINGS_KEY,
    workspaceKey: WORKSPACE_KEY,
  })
  await otherPage.addInitScript(() => {
    sessionStorage.setItem('paldawn:test:import-failure-loads', String(Number(sessionStorage.getItem('paldawn:test:import-failure-loads') ?? '0') + 1))
  })
  await Promise.all([page.goto('./'), otherPage.goto('./')])
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.locator('#local-data-import').setInputFiles({
    name: 'paldawn-import.json',
    mimeType: 'application/json',
    buffer: Buffer.from(importedBackup()),
  })
  await expect(page.getByRole('heading', { name: 'Replacement preview' })).toBeVisible()
  const peerReloaded = otherPage.waitForEvent('load', { timeout: 1_500 }).then(() => true, () => false)
  await page.getByRole('button', { name: 'Confirm replace local data' }).click()

  await expect(page.getByText('Local data could not be replaced in this browser context.')).toBeVisible()
  expect(await peerReloaded).toBe(false)
  expect(await otherPage.evaluate(() => Number(sessionStorage.getItem('paldawn:test:import-failure-loads')))).toBe(1)
  const rolledBack = await page.evaluate(({ pendingKey, resetKey }) => ({
    original: JSON.parse(sessionStorage.getItem('paldawn:test:original-import-values')),
    pending: localStorage.getItem(pendingKey),
    reset: localStorage.getItem(resetKey),
    values: Object.fromEntries(Object.keys(JSON.parse(sessionStorage.getItem('paldawn:test:original-import-values')))
      .map((key) => [key, localStorage.getItem(key)])),
  }), { pendingKey: RESET_PENDING_KEY, resetKey: RESET_KEY })
  expect(rolledBack.reset).toBe('generation-before-import')
  expect(rolledBack.pending).toBeNull()
  expect(rolledBack.values).toEqual(rolledBack.original)
  await otherPage.close()
})

test('a rejected scene chunk offers a reload that makes a fresh request', async ({ page }) => {
  await page.addInitScript(({ journeyKey, seedKey }) => {
    if (sessionStorage.getItem(seedKey)) return
    sessionStorage.setItem(seedKey, 'true')
    localStorage.setItem(journeyKey, JSON.stringify({ progress: 0.37, narrationMode: 'guide' }))
  }, { journeyKey: JOURNEY_KEY, seedKey: 'paldawn:test:scene-retry-seeded' })
  let allowSceneChunk = false
  let sceneChunkRequests = 0
  await page.route(/SceneCanvas-[^/]+\.js(?:\?|$)/, async (route) => {
    sceneChunkRequests += 1
    if (!allowSceneChunk) await route.abort('failed')
    else await route.continue()
  })
  await page.goto('./')
  const reload = page.getByRole('button', { name: 'Reload the scene' })
  await expect(reload).toBeVisible()
  const beforeReload = sceneChunkRequests
  allowSceneChunk = true
  await Promise.all([page.waitForNavigation(), reload.click()])
  await expect(page.locator('canvas')).toHaveCount(1)
  expect(sceneChunkRequests).toBeGreaterThan(beforeReload)
  const restored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), JOURNEY_KEY)
  expect(restored.narrationMode).toBe('guide')
  expect(restored.progress).toBeGreaterThanOrEqual(0.37)
  expect(restored.progress).toBeLessThan(0.6)
  await expect(page).not.toHaveURL(/scene-retry=/)
})

test('a failed recovery stays honest and keeps the text voyage available', async ({ page }) => {
  await page.route(/SceneCanvas-[^/]+\.js(?:\?|$)/, (route) => route.abort('failed'))
  await page.goto('./')
  const reloadScene = page.getByRole('button', { name: 'Reload the scene' })
  await expect(reloadScene).toBeVisible()
  await Promise.all([page.waitForNavigation(), reloadScene.click()])

  await expect(page.getByText(/did not load after a fresh request/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reload the app' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue without 3D' }).click()
  await expect(page.locator('.app-root--text')).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
})
