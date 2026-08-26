import { defineConfig, devices } from '@playwright/test'

const basePath = process.env.VITE_BASE_PATH ?? '/'
const previewPort = process.env.PLAYWRIGHT_PORT ?? '4173'
if (!/^\d+$/.test(previewPort)) throw new Error('PLAYWRIGHT_PORT must be numeric')
const baseURL = new URL(basePath.endsWith('/') ? basePath : `${basePath}/`, `http://127.0.0.1:${previewPort}`).href

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'line',
  outputDir: 'test-results',
  use: {
    baseURL,
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${previewPort} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})
