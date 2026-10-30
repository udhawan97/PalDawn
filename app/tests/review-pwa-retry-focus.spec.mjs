import { expect, test } from '@playwright/test'

for (const reason of ['unsaved', 'activation-timeout']) {
  for (const bringRequesterToFront of [false, true]) {
    test(`${reason} restores retry focus ${bringRequesterToFront ? 'with' : 'without'} requester bringToFront after sibling`, async ({ page, context }) => {
      await context.addInitScript(() => localStorage.setItem('paldawn:settings:v1', JSON.stringify({
        version: 1, state: { textVoyagePreferred: true, reducedMotion: true },
      })))
      await page.goto('./')
      await page.evaluate(() => window.dispatchEvent(new Event('paldawn:update-ready')))
      await page.getByRole('button', { name: /Show system notice details/ }).click()
      const action = page.getByRole('button', { name: 'Update and reload open tabs', exact: true })
      await expect(action).toBeVisible()
      await action.focus()

      const sibling = await context.newPage()
      await sibling.goto('./')
      await sibling.bringToFront()
      await sibling.getByRole('button', { name: 'My study', exact: true }).click()
      const durableNote = await sibling.evaluate(() => {
        const original = Storage.prototype.setItem
        Storage.prototype.setItem = function (key, value) {
          if (key === 'paldawn:workspace:v1') throw new DOMException('Fictional storage failure', 'QuotaExceededError')
          return original.call(this, key, value)
        }
        return localStorage.getItem('paldawn:workspace:v1')
      })
      const note = sibling.getByLabel(/^Private note for /)
      await note.fill('Fictional sibling note stays open.')
      await expect(sibling.getByText('Browser storage is unavailable.', { exact: true })).toBeVisible()
      if (bringRequesterToFront) await page.bringToFront()

      // Exercise the UI event boundary after the platform freezes, then restores, the root.
      await page.evaluate(() => {
        document.getElementById('root').inert = true
        window.dispatchEvent(new Event('paldawn:update-preparing'))
      })
      await expect(action).toBeDisabled()
      await page.evaluate(reason => {
        document.getElementById('root').inert = false
        window.dispatchEvent(new CustomEvent('paldawn:update-blocked', {
          detail: { requestId: `fictional-${reason}`, reason },
        }))
      }, reason)
      const retry = page.getByRole('button', { name: 'Retry update and reload', exact: true })
      await expect(retry).toBeVisible()
      await expect(retry).toBeEnabled()
      await expect(retry).toBeFocused()
      expect(await page.locator('#root').evaluate(root => root.inert)).toBe(false)
      await expect(note).toHaveValue('Fictional sibling note stays open.')
      await expect(sibling.locator('.drawer')).toBeVisible()
      expect(await sibling.evaluate(() => localStorage.getItem('paldawn:workspace:v1'))).toBe(durableNote)
    })
  }
}
