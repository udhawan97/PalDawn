import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// A separate, local-only workbench. The normal app build never uses this entry.
export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [react()],
  server: { host: '127.0.0.1', fs: { allow: [resolve('..')] } },
  preview: { host: '127.0.0.1' },
  build: {
    outDir: 'dist-graphics',
    target: 'es2022',
    rollupOptions: { input: [resolve('heart-study.html'), resolve('flow-study.html')] },
  },
})
