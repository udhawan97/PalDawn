import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Fail closed on changes to the small, deliberately explicit publication path.
// This checks workflow wiring; the real migration behavior is tested by Playwright.
function checkPublicationGate(workflow) {
  const build = workflow.split('\n  build:\n')[1]?.split('\n  deploy:\n')[0]
  const deploy = workflow.split('\n  deploy:\n')[1]
  assert.ok(build && deploy, 'Pages must retain explicit build and deploy jobs')
  assert.doesNotMatch(build, /^    (?:if|continue-on-error):/m, 'the build gate must not be skipped or tolerated')
  assert.match(deploy, /^    needs: build$/m, 'Pages deployment must require the checked build')
  assert.doesNotMatch(deploy, /^    if:/m, 'Pages deployment must use the default successful-needs condition')
  const steps = build.split(/^      - /m).slice(1)
  const checkout = steps.find(step => step.startsWith('uses: actions/checkout@'))
  assert.ok(checkout, 'the build must check out the triggering commit')
  assert.match(checkout, /with: \{ fetch-depth: 0 \}/, 'PWA migration needs the historical baseline')
  assert.doesNotMatch(checkout, /\bref:/, 'another revision must not satisfy the deployment gate')
  const gateIndex = steps.findIndex(step => /^run: npm run pwa:test:browser\n/.test(step))
  const uploadIndex = steps.findIndex(step => step.startsWith('uses: actions/upload-pages-artifact@'))
  assert.ok(gateIndex >= 0 && uploadIndex > gateIndex, 'migration must pass before Pages artifact upload')
  const gate = steps[gateIndex]
  assert.match(gate, /^        working-directory: app$/m)
  assert.match(gate, /^          VITE_BASE_PATH: \/PalDawn\/$/m)
  assert.doesNotMatch(gate, /^        (?:if|continue-on-error):/m, 'migration must be unconditional and blocking')
  assert.match(steps[uploadIndex], /^          path: app\/dist$/m, 'publish only the public build')
}

const workflow = readFileSync(new URL('../../.github/workflows/deploy.yml', import.meta.url), 'utf8')
checkPublicationGate(workflow)
for (const [label, broken] of [
  ['missing gate', workflow.replace('run: npm run pwa:test:browser', 'run: echo skipped')],
  ['skipped gate', workflow.replace('run: npm run pwa:test:browser', 'if: false\n        run: npm run pwa:test:browser')],
  ['tolerated failure', workflow.replace('run: npm run pwa:test:browser', 'run: npm run pwa:test:browser\n        continue-on-error: true')],
  ['wrong revision', workflow.replace('with: { fetch-depth: 0 }', 'with: { fetch-depth: 0, ref: main }')],
  ['missing baseline', workflow.replace('fetch-depth: 0', 'fetch-depth: 1')],
  ['disconnected deployment', workflow.replace('needs: build', 'needs: unrelated')],
  ['unconditional deployment', workflow.replace('needs: build', 'needs: build\n    if: always()')],
]) {
  assert.throws(() => checkPublicationGate(broken), undefined, label)
}
console.log('Pages publication contract: PASS · exact checkout, blocking migration, public artifact and failure sensitivity')
