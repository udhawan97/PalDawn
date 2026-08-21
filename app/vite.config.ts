import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project-site support: set VITE_BASE_PATH=/paldawn/ at build
// time (deploy workflow, later). Default '/' keeps local dev/preview simple.
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react()],
  build: { target: 'es2022', sourcemap: false },
})
