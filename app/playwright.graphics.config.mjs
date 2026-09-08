import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './graphics/tests',
  workers: 1,
  reporter: 'line',
  outputDir: 'test-results/graphics',
  use: { baseURL: 'http://127.0.0.1:4318', serviceWorkers: 'block', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'vite preview --config vite.graphics.config.ts --host 127.0.0.1 --port 4318 --strictPort',
    url: 'http://127.0.0.1:4318/heart-study.html',
    reuseExistingServer: false,
  },
})
