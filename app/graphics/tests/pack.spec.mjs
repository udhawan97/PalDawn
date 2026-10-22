import { test, expect } from '@playwright/test'
import { createHash } from 'node:crypto'
const scene = page => page.getByRole('region', { name: 'Interactive scene pack lab' })
const button = (page,name) => page.getByRole('button',{name,exact:true})
const ready = async (page,id='block',lod='high') => { await expect(scene(page)).toHaveAttribute('data-active',id);await expect(scene(page)).toHaveAttribute('data-lod',lod);await expect(scene(page)).toHaveAttribute('data-status','ready');await expect(scene(page)).toHaveAttribute('data-pending','0') }
const canvasHash = async page => createHash('sha256').update(await page.locator('canvas').screenshot()).digest('hex')
async function installBufferCounter(page) {
  await page.addInitScript(() => {
    const live=new Set(),create=WebGL2RenderingContext.prototype.createBuffer,remove=WebGL2RenderingContext.prototype.deleteBuffer
    window.packBuffers={created:0,deleted:0,duplicate:0,peak:0,live:0}
    WebGL2RenderingContext.prototype.createBuffer=function(...args){const value=create.apply(this,args);if(value){live.add(value);window.packBuffers.created++;window.packBuffers.live=live.size;window.packBuffers.peak=Math.max(window.packBuffers.peak,live.size)}return value}
    WebGL2RenderingContext.prototype.deleteBuffer=function(value){if(value){if(!live.delete(value))window.packBuffers.duplicate++;else window.packBuffers.deleted++;window.packBuffers.live=live.size}return remove.call(this,value)}
  })
}
for(const width of[320,1440]) {
  test(`pack bytes drive visible static scenes, keyboard and reentry at${width}`,async({page})=>{
    await page.setViewportSize({width,height:width===320?568:900});await page.emulateMedia({reducedMotion:'reduce'});const requests=[];page.on('request',r=>{if(r.url().endsWith('.mesh'))requests.push(r.url())});await page.goto('/pack-study.html');await ready(page)
    expect(requests.length).toBe(2);expect(requests.some(url=>url.includes('octahedron'))).toBe(false)
    const before=await canvasHash(page);await page.waitForTimeout(120);expect(await canvasHash(page)).toBe(before)
    await button(page,'Load wedge').focus();await page.keyboard.press('Enter');await ready(page,'wedge');expect(await canvasHash(page)).not.toBe(before)
    await button(page,'Low detail').click();await ready(page,'wedge','low');await page.getByRole('checkbox',{name:'Text mode',exact:true}).check();await expect(scene(page)).toHaveAttribute('data-renderer','text');await expect(scene(page)).toHaveAttribute('data-resident','0');await expect(scene(page)).toHaveAttribute('data-reserved','0');await expect(scene(page)).toContainText('Four base corners')
    await page.getByRole('checkbox',{name:'Text mode',exact:true}).uncheck();await ready(page,'wedge','low');await page.getByRole('link',{name:'Return to junction study',exact:true}).click();await expect(page.getByRole('region',{name:'Interactive junction study'})).toHaveAttribute('data-renderer','ready');await page.getByRole('link',{name:'Scene pack lab',exact:true}).click();await ready(page)
    expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('paldawn:')))).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false)
  })
  test(`corrupt replacement retains old pixels and caption then retries at${width}`,async({page})=>{
    await page.setViewportSize({width,height:900});let corrupt=true
    await page.route('**/*octahedron-low-*.mesh',async route=>{if(!corrupt)return route.continue();const response=await route.fetch(),bytes=Buffer.from(await response.body());bytes[bytes.length-1]^=1;await route.fulfill({response,body:bytes})})
    await page.goto('/pack-study.html');await ready(page);const before=await canvasHash(page),caption=await scene(page).locator('.canvas-caption').innerText()
    await button(page,'Low detail').click();await ready(page,'block','low');const low=await canvasHash(page);await button(page,'Load octahedron').click();await expect(scene(page)).toHaveAttribute('data-status','failed');await expect(scene(page)).toHaveAttribute('data-active','block');expect(await canvasHash(page)).toBe(low);expect(await scene(page).locator('.canvas-caption').innerText()).toBe(caption);await expect(page.getByRole('status')).toContainText('digest mismatch')
    corrupt=false;await button(page,'Retry scene pack').click();await ready(page,'octahedron','low');expect(await canvasHash(page)).not.toBe(before);expect(Number(await scene(page).getAttribute('data-peak'))).toBeLessThanOrEqual(524288)
  })
  for(const failure of['missing','timeout'])test(`${failure} scene keeps readable active content and recovers at${width}`,async({page})=>{
    test.setTimeout(30_000);await page.setViewportSize({width,height:900});let fail=true
    await page.route('**/*octahedron-low-*.mesh',route=>{if(!fail)return route.continue();if(failure==='missing')return route.fulfill({status:404,body:'Synthetic unavailable fixture'})})
    await page.goto('/pack-study.html');await ready(page);await button(page,'Low detail').click();await ready(page,'block','low');await button(page,'Load octahedron').click();await expect(scene(page)).toHaveAttribute('data-status','failed',{timeout:8000});await expect(scene(page)).toHaveAttribute('data-active','block');await expect(scene(page)).toContainText('Eight corners');if(failure==='timeout')await expect(page.getByRole('status')).toContainText('timed out')
    fail=false;await button(page,'Retry scene pack').click();await ready(page,'octahedron','low');await expect(scene(page)).toHaveAttribute('data-reserved','0')
  })
  test(`rapid switch releases old resources and never activates stale bytes at${width}`,async({page})=>{
    await page.setViewportSize({width,height:900});await installBufferCounter(page);const held=[];let hold=true
    await page.route('**/*octahedron-low-*.mesh',r=>hold?held.push(r):r.continue());await page.goto('/pack-study.html');await ready(page);await button(page,'Low detail').click();await ready(page,'block','low');const before=await canvasHash(page);await button(page,'Load octahedron').click();await expect.poll(()=>held.length).toBe(1);await expect(scene(page)).toHaveAttribute('data-status','loading');expect(await canvasHash(page)).toBe(before)
    await button(page,'Load block').click();await ready(page,'block','low');await held[0].fulfill({status:200,body:'late corrupt bytes'}).catch(()=>{});await expect(scene(page)).toHaveAttribute('data-active','block');hold=false
    for(let i=0;i<8;i++){await button(page,i%2?'Load wedge':'Load octahedron').click();await button(page,i%2?'High detail':'Low detail').click()}
    await ready(page,'wedge','high');await page.getByRole('checkbox',{name:'Text mode',exact:true}).check();await expect(scene(page)).toHaveAttribute('data-resident','0');await expect(scene(page)).toHaveAttribute('data-reserved','0');await expect.poll(()=>page.evaluate(()=>window.packBuffers.live)).toBe(0);const buffers=await page.evaluate(()=>window.packBuffers);expect(buffers.created).toBeGreaterThan(3);expect(buffers.created).toBe(buffers.deleted);expect(buffers.duplicate).toBe(0);expect(Number(await scene(page).getAttribute('data-peak'))).toBeLessThanOrEqual(524288)
    await page.getByRole('checkbox',{name:'Text mode',exact:true}).uncheck();await ready(page,'wedge','high')
  })
  test(`manifest corruption fails before activation with text and retry at${width}`,async({page})=>{
    await page.setViewportSize({width,height:900});let corrupt=true;let meshRequests=0;page.on('request',r=>{if(r.url().endsWith('.mesh'))meshRequests++})
    await page.route('**/*scene-pack-*.json',async route=>{if(!corrupt)return route.continue();const response=await route.fetch(),bytes=Buffer.from(await response.body());bytes[0]=32;await route.fulfill({response,body:bytes})});await page.goto('/pack-study.html');await expect(scene(page)).toHaveAttribute('data-status','failed');await expect(scene(page)).toHaveAttribute('data-active','');expect(meshRequests).toBe(0);await expect(scene(page)).toContainText('No scene activated');await expect(page.getByRole('status')).toContainText('manifest digest mismatch');await expect(button(page,'Load block')).toBeDisabled()
    corrupt=false;await button(page,'Retry scene pack').click();await ready(page)
  })
  test(`WebGL loss during pending work settles diagnostics and recovers at${width}`,async({page})=>{
    await page.setViewportSize({width,height:900});let held;await page.route('**/*octahedron-low-*.mesh',r=>{held=r})
    await page.goto('/pack-study.html');await ready(page);await button(page,'Low detail').click();await ready(page,'block','low');await button(page,'Load octahedron').click();await expect.poll(()=>!!held).toBe(true);await expect.poll(async()=>Number(await scene(page).getAttribute('data-reserved'))).toBeGreaterThan(0)
    expect(await page.locator('canvas').evaluate(canvas=>{const ext=canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');if(!ext)return false;ext.loseContext();return true})).toBe(true)
    await expect(scene(page)).toHaveAttribute('data-renderer','unavailable');await expect(scene(page)).toContainText('Eight corners');await expect(scene(page)).toHaveAttribute('data-pending','0');await expect(scene(page)).toHaveAttribute('data-reserved','0');await expect(scene(page)).toHaveAttribute('data-resident','0')
    await held.fulfill({status:200,body:'late invalid bytes'}).catch(()=>{});await page.unroute('**/*octahedron-low-*.mesh');await button(page,'Retry scene pack').click();await ready(page,'octahedron','low')
  })
  test(`actual WebGL loss retains explanation and retry rebuilds at${width}`,async({page})=>{
    await page.setViewportSize({width,height:900});await page.goto('/pack-study.html');await ready(page);await button(page,'Load wedge').click();await ready(page,'wedge');const lost=await page.locator('canvas').evaluate(canvas=>{const extension=canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');if(!extension)return false;extension.loseContext();return true});expect(lost).toBe(true);await expect(scene(page)).toHaveAttribute('data-renderer','unavailable');await expect(scene(page)).toContainText('Four base corners');await button(page,'Retry scene pack').click();await ready(page,'wedge');await expect(scene(page)).toHaveAttribute('data-renderer','ready')
  })
}
