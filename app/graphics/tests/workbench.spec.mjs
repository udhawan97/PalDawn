import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const specimen = page => page.getByRole('region', { name: 'Interactive heart form study' })
async function settled(page) {
  await expect(specimen(page)).toHaveAttribute('data-renderer', 'ready')
  // Allow the browser compositor to present the completed WebGL frame.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
}
async function ready(page) {
  await page.goto('/heart-study.html')
  await settled(page)
  await expect(specimen(page).locator('canvas')).toBeVisible()
}

test('inspects every side, clay, layers, and reset without runtime errors', async ({ page }, info) => {
  const errors=[]; page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await ready(page)
  const dir='../output/playwright/heart-study'
  mkdirSync(dir,{recursive:true})
  await page.screenshot({ path:`${dir}/${info.project.name}-front-tissue.png`, fullPage:true })
  await page.getByRole('button',{name:'Clay',exact:true}).click()
  await expect(specimen(page)).toHaveAttribute('data-material','clay')
  for (const name of ['left','back','right','front']) {
    await page.getByRole('button',{name:name[0].toUpperCase()+name.slice(1),exact:true}).click()
    await expect(specimen(page)).toHaveAttribute('data-view',name)
    await settled(page)
    await page.screenshot({path:`${dir}/${info.project.name}-${name}-clay.png`,fullPage:true})
  }
  await page.getByLabel('Surface vessels',{exact:true}).uncheck()
  await page.getByLabel('Chest context',{exact:true}).check()
  await expect(specimen(page)).toHaveAttribute('data-context','chest')
  await page.getByLabel('Surface vessels',{exact:true}).check()
  await page.getByRole('button',{name:'Tissue',exact:true}).click()
  await settled(page)
  await page.screenshot({path:`${dir}/${info.project.name}-chest.png`,fullPage:true})
  await page.getByRole('button',{name:'Start turntable',exact:true}).click()
  await expect(page.getByRole('button',{name:'Pause turntable'})).toHaveAttribute('aria-pressed','true')
  await page.getByRole('button',{name:'Pause turntable'}).click()
  await page.getByRole('button',{name:'Reset view'}).click()
  await expect(page.getByRole('button',{name:'Front',exact:true})).toHaveAttribute('aria-pressed','true')
  await page.getByRole('button',{name:'View asset notes'}).click()
  await expect(page.getByRole('heading',{name:'Authored, reproducible, awaiting review.'})).toBeVisible()
  await expect(page.locator('#asset-notes')).toContainText('No third-party anatomy mesh or patient data is used')
  expect(errors).toEqual([])
})

test('small screens retain a usable canvas and do not overflow', async ({ page }, info) => {
  await ready(page)
  for (const [width,height] of [[390,844],[844,390],[768,1024]]) {
    await page.setViewportSize({width,height})
    await expect(page.getByRole('button',{name:'Clay',exact:true})).toBeEnabled()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    const box=await specimen(page).locator('canvas').boundingBox()
    expect(box.width).toBeGreaterThan(250)
    expect(box.height).toBeGreaterThan(300)
    await settled(page)
    await page.screenshot({path:`../output/playwright/heart-study/${info.project.name}-${width}x${height}.png`,fullPage:true})
  }
})

test('reduced motion preserves fixed views and keyboard controls', async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'})
  await ready(page)
  await expect(page.getByRole('button',{name:'Start turntable'})).toBeDisabled()
  await page.getByRole('button',{name:'Back',exact:true}).focus()
  await page.keyboard.press('Enter')
  await expect(specimen(page)).toHaveAttribute('data-view','back')
  await page.getByRole('button',{name:'Clay',exact:true}).focus()
  await page.keyboard.press('Space')
  await expect(specimen(page)).toHaveAttribute('data-material','clay')
})

test('a failed asset request can be retried', async ({ page }) => {
  await page.route('**/*.glb',route=>route.abort())
  await page.goto('/heart-study.html')
  await expect(page.getByRole('alert')).toContainText('The study could not load')
  await page.unroute('**/*.glb')
  await page.getByRole('button',{name:'Retry the study'}).click()
  await expect(specimen(page)).toHaveAttribute('data-renderer','ready')
})

test('corrupt bytes fail integrity verification', async ({ page }) => {
  await page.route('**/*.glb',route=>route.fulfill({status:200,contentType:'model/gltf-binary',body:'invalid mesh bytes'}))
  await page.goto('/heart-study.html')
  await expect(page.getByRole('alert')).toContainText('The study could not load')
  await expect(specimen(page).locator('canvas')).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Clay',exact:true})).toBeDisabled()
})

test('the rendered turntable moves and a paused frame stays still', async ({ page }) => {
  await ready(page)
  const canvas=specimen(page).locator('canvas')
  const still=await canvas.screenshot()
  await page.getByRole('button',{name:'Start turntable'}).click()
  await page.waitForTimeout(450)
  const moving=await canvas.screenshot()
  expect(moving.equals(still)).toBe(false)
  await page.getByRole('button',{name:'Pause turntable'}).click()
  const paused=await canvas.screenshot()
  await page.waitForTimeout(200)
  expect((await canvas.screenshot()).equals(paused)).toBe(true)
  await expect(specimen(page)).toHaveAttribute('data-view','free')
})

test('WebGL context loss has a working retry path', async ({ page }) => {
  await ready(page)
  const supported=await specimen(page).locator('canvas').evaluate(canvas=>{
    const gl=canvas.getContext('webgl2')
    const extension=gl?.getExtension('WEBGL_lose_context')
    if (!extension) return false
    extension.loseContext()
    return true
  })
  test.skip(!supported,'This browser does not expose context-loss testing')
  await expect(page.getByRole('alert')).toContainText('The study could not load')
  await page.getByRole('button',{name:'Retry the study'}).click()
  await expect(specimen(page)).toHaveAttribute('data-renderer','ready')
  await expect(specimen(page).locator('canvas')).toBeVisible()
})
