import { defineConfig, devices } from '@playwright/test'

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
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})
