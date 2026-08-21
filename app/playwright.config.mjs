import { defineConfig } from '@playwright/test'

const basePath = process.env.VITE_BASE_PATH ?? '/'
const baseURL = new URL(basePath.endsWith('/') ? basePath : `${basePath}/`, 'http://127.0.0.1:4173').href

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'line',
  outputDir: 'test-results',
  use: {
    baseURL,
    browserName: 'chromium',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})
