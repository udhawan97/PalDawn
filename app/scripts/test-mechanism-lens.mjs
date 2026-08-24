import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const ROOT = new URL('..', import.meta.url)
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8')

const app = read('src/App.tsx')
const canvas = read('src/scene/SceneCanvas.tsx')
const scene = read('src/scene/HumanSystemsScene.tsx')
const explorer = read('src/ui/DiseaseExplorer.tsx')
const playwright = read('playwright.config.mjs')

assert.match(app, /lazy\(\(\) => import\('\.\/scene\/SceneCanvas'\)\)/)
assert.match(app, /Suspense fallback=/)
assert.match(canvas, /webglcontextlost/)
assert.match(scene, /BODY_DETAIL_POINTS/)
assert.match(scene, /function PhaseSignal/)
assert.match(scene, /function SystemDetailLayer/)
assert.match(scene, /camera\.position\.lerp/)
assert.match(scene, /resolveTier\(qualityTier\)/)
assert.match(explorer, /data-phase-detail=/)
assert.match(explorer, /data-focus-part=/)
assert.match(explorer, /Mechanism lens/)
assert.match(explorer, /conceptual, not anatomical scale/)
assert.match(playwright, /name: 'chromium'/)
assert.match(playwright, /name: 'webkit'/)

console.log('mechanism lens checks: lazy scene · layered procedural detail · phase signals · close focus boundary intact')
