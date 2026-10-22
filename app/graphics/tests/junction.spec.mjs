import { test, expect } from '@playwright/test'
import { Matrix4 } from 'three'
import { branchCellFrame, branchForId, branchSeed, branchShader } from '../branchModel.ts'

const scene = page => page.getByRole('region', { name: 'Interactive junction study' })
async function settled(page) {
  await expect(scene(page)).toHaveAttribute('data-renderer', 'ready')
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}
async function ready(page) { await page.goto('/junction-study.html'); await settled(page) }
async function seek(page, time) { await page.getByLabel('Study time', { exact: true }).fill(String(time)); await settled(page) }

test('connected junction renders from four sides and flow reconstructs the same frame', async ({ page }, info) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message))
  await page.setViewportSize({ width: 1440, height: 900 }); await ready(page); await seek(page, 6)
  const canvas = scene(page).locator('canvas'), initial = await canvas.screenshot()
  await seek(page, 8); expect((await canvas.screenshot()).equals(initial)).toBe(false)
  await seek(page, 6); expect((await canvas.screenshot()).equals(initial)).toBe(true)
  await page.getByRole('button', { name: 'Low', exact: true }).click(); await settled(page)
  expect((await canvas.screenshot()).equals(initial)).toBe(false)
  await page.getByRole('button', { name: 'High', exact: true }).click(); await settled(page)
  expect((await canvas.screenshot()).equals(initial)).toBe(true)
  await page.getByRole('button', { name: 'Restart passage', exact: true }).click(); await settled(page)
  await expect(scene(page)).toHaveAttribute('data-time', '0.000')
  await seek(page, 6); expect((await canvas.screenshot()).equals(initial)).toBe(true)
  await page.getByRole('button', { name: 'Play passage', exact: true }).click()
  await expect.poll(async () => Number(await scene(page).getAttribute('data-time'))).toBeGreaterThan(6.2)
  await page.getByRole('button', { name: 'Pause passage', exact: true }).click(); await settled(page)
  const paused = await canvas.screenshot(); await page.waitForTimeout(100)
  expect(paused.equals(initial)).toBe(false)
  expect((await canvas.screenshot()).equals(paused)).toBe(true)
  for (const view of ['Above', 'Below', 'Left', 'Right']) {
    await page.getByRole('button', { name: view, exact: true }).click(); await settled(page)
    await canvas.screenshot({ path: `../output/playwright/junction/${info.project.name}-${view.toLowerCase()}.png` })
  }
  await page.getByLabel('Wireframe', { exact: true }).check(); await settled(page)
  await canvas.screenshot({ path: `../output/playwright/junction/${info.project.name}-wireframe.png` })
  expect(errors).toEqual([])
})

test('reduced motion, keyboard controls, hidden documents and text remain available', async ({ page }) => {
  await ready(page); await seek(page, 6)
  await page.getByRole('button', { name: 'Play passage', exact: true }).click()
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')) })
  await expect(page.getByRole('button', { name: 'Play passage', exact: true })).toBeVisible()
  const time = await scene(page).getAttribute('data-time')
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')) })
  await page.waitForTimeout(100); await expect(scene(page)).toHaveAttribute('data-time', time)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.getByRole('button', { name: 'Play passage', exact: true })).toBeDisabled()
  await seek(page, 6)
  const slider = page.getByLabel('Study time', { exact: true }); await slider.focus(); await page.keyboard.press('ArrowLeft'); await settled(page)
  await expect(scene(page)).toHaveAttribute('data-time', '5.999')
  await page.getByLabel('Text mode', { exact: true }).check()
  await expect(scene(page)).toHaveAttribute('data-renderer', 'text')
  await expect(page.getByRole('heading', { name: 'One parent, two exits' })).toBeVisible()
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([])
})

test('context recovery preserves time and detail', async ({ page }) => {
  await ready(page); await seek(page, 6)
  await page.getByRole('button', { name: 'Low', exact: true }).click(); await settled(page)
  const before = await scene(page).locator('canvas').screenshot()
  const supported = await scene(page).locator('canvas').evaluate(canvas => {
    const extension = canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')
    if (!extension) return false; extension.loseContext(); return true
  })
  test.skip(!supported, 'Context loss extension unavailable')
  await expect(page.getByRole('alert')).toContainText('The junction view is unavailable')
  await page.getByRole('button', { name: 'Retry junction view' }).click(); await settled(page)
  await expect(scene(page)).toHaveAttribute('data-time', '6.000'); await expect(scene(page)).toHaveAttribute('data-quality', 'low')
  expect((await scene(page).locator('canvas').screenshot()).equals(before)).toBe(true)
  await page.waitForTimeout(100)
  expect((await scene(page).locator('canvas').screenshot()).equals(before)).toBe(true)
})

test('GPU branch arithmetic matches CPU frames within 1e-4 units', async ({ page }) => {
  await ready(page)
  const cases = []
  for (const id of [0, 1, 20, 79, 80, 239]) {
    const handoff = (.8 - branchSeed(id)[0]) / 1.6 * 12
    for (const time of [0, 3, handoff - .001, handoff, handoff + .001, 9, 12]) cases.push({ id, time, seed: branchSeed(id) })
  }
  const results = await page.evaluate(({ source, cases }) => {
    const gl = document.createElement('canvas').getContext('webgl2')
    if (!gl) throw new Error('WebGL2 probe unavailable')
    const compile = (type, text) => {
      const shader = gl.createShader(type); gl.shaderSource(shader, text); gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader))
      return shader
    }
    const vs = compile(gl.VERTEX_SHADER, '#version 300 es\nprecision highp float;\n' + source.replaceAll('attribute ', 'in ') + '\nout vec4 sampled; void main(){sampled=vec4(branchCenter(),branchScale()); gl_Position=vec4(0.0);}')
    const fs = compile(gl.FRAGMENT_SHADER, '#version 300 es\nprecision highp float; out vec4 color; void main(){color=vec4(1.0);}')
    const program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.transformFeedbackVaryings(program, ['sampled'], gl.INTERLEAVED_ATTRIBS); gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program))
    gl.useProgram(program)
    const input = gl.createBuffer(), output = gl.createBuffer(), vao = gl.createVertexArray(), feedback = gl.createTransformFeedback()
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, input)
    const attribute = gl.getAttribLocation(program, 'branchSeed'); gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute, 4, gl.FLOAT, false, 0, 0)
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, feedback); gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, output); gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, 16, gl.DYNAMIC_READ); gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, output)
    gl.enable(gl.RASTERIZER_DISCARD)
    const result = cases.map(item => {
      gl.bindBuffer(gl.ARRAY_BUFFER, input); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(item.seed), gl.STATIC_DRAW)
      gl.uniform1f(gl.getUniformLocation(program, 'studyTime'), item.time)
      gl.beginTransformFeedback(gl.POINTS); gl.drawArrays(gl.POINTS, 0, 1); gl.endTransformFeedback()
      const value = new Float32Array(4); gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, value); return [...value]
    })
    gl.disable(gl.RASTERIZER_DISCARD); gl.deleteBuffer(input); gl.deleteBuffer(output); gl.deleteTransformFeedback(feedback); gl.deleteVertexArray(vao); gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs)
    return result
  }, { source: branchShader, cases })
  cases.forEach((item, index) => {
    const cpu = branchCellFrame(item.id, item.time), expected = [...cpu.center.toArray(), cpu.scale]
    expected.forEach((value, component) => expect(Math.abs(results[index][component] - value)).toBeLessThan(1e-4))
  })
})

test('isolated GPU pixels follow identifiable CPU positions in both branches and tiers', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  for (const branch of ['left', 'right']) {
    const id = Array.from({ length: 80 }, (_, i) => i).find(id => branchForId(id) === branch)
    await page.goto(`/junction-study.html?probe=${id}`); await settled(page)
    const handoff = (.8 - branchSeed(id)[0]) / 1.6 * 12
    for (const time of [handoff - .001, handoff, handoff + .001, handoff + 1]) {
      await seek(page, time.toFixed(3))
      const actualTime = Number(await scene(page).getAttribute('data-time'))
      const matrices = JSON.parse(await scene(page).getAttribute('data-camera'))
      const expected = branchCellFrame(id, actualTime).center.clone().applyMatrix4(new Matrix4().fromArray(matrices[1])).applyMatrix4(new Matrix4().fromArray(matrices[0]))
      for (const tier of ['Low', 'High']) {
        await page.getByRole('button', { name: tier, exact: true }).click(); await settled(page)
        const pixel = await scene(page).locator('canvas').evaluate((canvas, point) => {
          const gl = canvas.getContext('webgl2'), data = new Uint8Array(canvas.width * canvas.height * 4)
          gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data)
          const x = (point[0] + 1) / 2 * canvas.width, y = (point[1] + 1) / 2 * canvas.height
          let count = 0, sx = 0, sy = 0
          for (let row = Math.max(0, Math.floor(y - 20)); row < Math.min(canvas.height, y + 20); row++) for (let column = Math.max(0, Math.floor(x - 20)); column < Math.min(canvas.width, x + 20); column++) {
            const i = (row * canvas.width + column) * 4, r = data[i], g = data[i + 1], b = data[i + 2]
            if (r > 100 && r > g * 1.8 && r > b * 1.8) { count++; sx += column + .5; sy += row + .5 }
          }
          return { count, error: Math.hypot(sx / count - x, sy / count - y) }
        }, expected.toArray())
        expect(pixel.count).toBeGreaterThan(2)
        // Raster coverage is quantized; numeric GPU positions are separately
        // checked at 1e-4 units by transform feedback above.
        expect(pixel.error).toBeLessThan(3)
      }
    }
  }
})
