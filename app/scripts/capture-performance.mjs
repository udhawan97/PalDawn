import { execFileSync, spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, webkit } from 'playwright'

const PORT = Number(process.env.PALDAWN_PERF_PORT ?? 4174)
const BASE_PATH = process.env.VITE_BASE_PATH ?? '/PalDawn/'
const BASE_URL = new URL(BASE_PATH.endsWith('/') ? BASE_PATH : `${BASE_PATH}/`, `http://127.0.0.1:${PORT}`).href
const BROWSER_NAME = process.env.PALDAWN_PERF_BROWSER ?? 'chromium'
const browserType = { chromium, webkit }[BROWSER_NAME]

if (!browserType) {
  throw new Error('PALDAWN_PERF_BROWSER must be chromium or webkit')
}

const percentile = (values, amount) => {
  const sorted = values.toSorted((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * amount) - 1)]
}

const summarize = (samples) => ({
  frames: samples.length,
  mean_ms: Number((samples.reduce((sum, value) => sum + value, 0) / samples.length).toFixed(3)),
  p50_ms: Number(percentile(samples, 0.5).toFixed(3)),
  p95_ms: Number(percentile(samples, 0.95).toFixed(3)),
  p99_ms: Number(percentile(samples, 0.99).toFixed(3)),
  max_ms: Number(Math.max(...samples).toFixed(3)),
  over_20_ms: samples.filter((value) => value > 20).length,
  over_33_3_ms: samples.filter((value) => value > 33.3).length,
})

const waitForServer = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(BASE_URL)
      if (response.ok) return
    } catch {
      // The preview process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Preview did not become ready at ${BASE_URL}`)
}

const preview = spawn(process.execPath, [
  new URL('../node_modules/vite/bin/vite.js', import.meta.url).pathname,
  'preview',
  '--host', '127.0.0.1',
  '--port', String(PORT),
], {
  env: { ...process.env, VITE_BASE_PATH: BASE_PATH },
  stdio: 'ignore',
})

let browser
try {
  await waitForServer()
  browser = await browserType.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  await page.addInitScript(() => {
    localStorage.setItem('paldawn:settings:v1', JSON.stringify({
      state: {
        qualityTier: 'balanced',
        reducedMotion: false,
        comfortVignette: true,
        highContrast: false,
        showTelemetry: true,
        captionScale: 'standard',
        playbackRate: 1,
      },
      version: 1,
    }))
  })

  const stages = ['surface-trace', 'portal', 'flow-corridor']
  const captures = []
  for (const stage of stages) {
    await page.goto(`${BASE_URL}#stage/${stage}`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /Begin the voyage|Resume at/ }).first().click().catch(() => {})
    await page.waitForTimeout(250)
    const runs = []
    for (let run = 1; run <= 3; run += 1) {
      console.log(`measuring ${BROWSER_NAME} · ${stage} · run ${run}/3`)
      const samples = await page.evaluate(async ({ warmupFrames, sampleFrames, batchTimeoutMs }) => {
        const frames = (count) => new Promise((resolve, reject) => {
          const timestamps = []
          const timeout = window.setTimeout(
            () => reject(new Error(`Timed out while waiting for ${count} animation frames`)),
            batchTimeoutMs,
          )
          const next = (timestamp) => {
            timestamps.push(timestamp)
            if (timestamps.length >= count + 1) {
              window.clearTimeout(timeout)
              resolve(timestamps)
            }
            else requestAnimationFrame(next)
          }
          requestAnimationFrame(next)
        })
        await frames(warmupFrames)
        const timestamps = await frames(sampleFrames)
        return timestamps.slice(1).map((timestamp, index) => timestamp - timestamps[index])
      }, { warmupFrames: 120, sampleFrames: 180, batchTimeoutMs: 30_000 })
      runs.push({ run, ...summarize(samples), raw_frame_ms: samples.map((value) => Number(value.toFixed(3))) })
    }
    const runtime = await page.locator('#runtime-telemetry').evaluate((element) => ({ ...element.dataset }))
    captures.push({ stage, runs, runtime_estimate: runtime })
  }

  const buildSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  const browserVersion = browser.version()
  const environment = await page.evaluate(() => ({
    user_agent: navigator.userAgent,
    platform: navigator.platform,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    device_pixel_ratio: window.devicePixelRatio,
  }))
  const report = {
    report: 'PalDawn local performance capture',
    claim_status: 'measurement artifact only; not a release or device-performance claim',
    build_sha: buildSha,
    browser: BROWSER_NAME,
    browser_version: browserVersion,
    network_profile: 'local loopback, unthrottled',
    method: { warmup_frames: 120, runs_per_stage: 3, frames_per_run: 180 },
    environment,
    captures,
  }
  const outputDirectory = new URL('../test-results/performance/', import.meta.url)
  await mkdir(outputDirectory, { recursive: true })
  const stem = `paldawn-${buildSha.slice(0, 8)}-${BROWSER_NAME}`
  await writeFile(new URL(`${stem}.json`, outputDirectory), `${JSON.stringify(report, null, 2)}\n`)

  const rows = captures.flatMap(({ stage, runs }) => runs.map((run) =>
    `| ${stage} | ${run.run} | ${run.frames} | ${run.mean_ms} | ${run.p50_ms} | ${run.p95_ms} | ${run.p99_ms} | ${run.max_ms} | ${run.over_20_ms} | ${run.over_33_3_ms} |`,
  ))
  const markdown = [
    '# PalDawn local performance capture',
    '',
    `Build: \`${buildSha}\` · Browser: ${BROWSER_NAME} ${browserVersion}`,
    '',
    '> Measurement artifact only. This does not prove Safari, physical-mobile, fast-4G, anatomy, or clinical-content performance.',
    '',
    '| Stage | Run | Frames | Mean | p50 | p95 | p99 | Max | >20 ms | >33.3 ms |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...rows,
    '',
  ].join('\n')
  await writeFile(new URL(`${stem}.md`, outputDirectory), markdown)
  console.log(`performance capture: ${captures.length} stages · ${BROWSER_NAME} ${browserVersion} · test-results/performance/${stem}.{json,md}`)
} finally {
  await browser?.close()
  preview.kill('SIGTERM')
}
