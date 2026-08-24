import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const SERVICE_WORKER_BUILD_TOKEN = '__PALDAWN_BUILD_ID__'

function stampServiceWorker() {
  return {
    name: 'paldawn-service-worker-build-stamp',
    apply: 'build' as const,
    closeBundle() {
      const distRoot = resolve(process.cwd(), 'dist')
      const workerPath = resolve(distRoot, 'sw.js')
      const assetFiles = readdirSync(resolve(distRoot, 'assets'))
        .sort()
        .map((filename) => `./assets/${filename}`)
      writeFileSync(
        resolve(distRoot, 'asset-manifest.json'),
        `${JSON.stringify({ files: assetFiles }, null, 2)}\n`,
      )
      const buildInputs = [
        'index.html',
        'sw.js',
        'asset-manifest.json',
        'site.webmanifest',
        'icon.svg',
        'icon-static.svg',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-192.png',
        'icon-maskable-512.png',
        'apple-touch-icon.png',
        'paldawn-social.png',
        ...assetFiles.map((filename) => filename.slice(2)),
      ]
        .map((filename) => readFileSync(resolve(distRoot, filename)))
      const buildId = createHash('sha256')
        .update(Buffer.concat(buildInputs))
        .update(process.env.PALDAWN_BUILD_SALT ?? '')
        .digest('hex')
        .slice(0, 12)
      const worker = readFileSync(workerPath, 'utf8')
      if (!worker.includes(SERVICE_WORKER_BUILD_TOKEN)) {
        throw new Error('PalDawn service-worker build token is missing')
      }
      writeFileSync(workerPath, worker.replaceAll(SERVICE_WORKER_BUILD_TOKEN, buildId))
    },
  }
}

// GitHub Pages project-site support: the deploy workflow sets
// VITE_BASE_PATH=/PalDawn/. Default '/' keeps local dev/preview simple.
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react(), stampServiceWorker()],
  build: { target: 'es2022', sourcemap: false },
})
