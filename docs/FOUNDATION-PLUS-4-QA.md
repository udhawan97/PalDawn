# Foundation+4 acceptance evidence

Recorded locally on 2026-08-21 against the isolated Foundation+4 candidate.
All production-route commands used the GitHub Pages base path `/PalDawn/`.

## Automated gates

- `VITE_BASE_PATH=/PalDawn/ npm test` passed TypeScript, the split production
  build, canonical content-pack digest verification, the five-stage synthetic
  release contract, all retained Foundation contracts, and executable runtime
  state/import tests.
- Aggregate JavaScript was 346,573 bytes gzip against the existing 500 KiB
  budget. The immediate interface entry chunk is 68.30 KiB gzip; the WebGL
  graph is loaded separately.
- `CI=1 VITE_BASE_PATH=/PalDawn/ npm run test:browser` passed 34/34 tests: the
  same 17 scenarios in Chromium and WebKit. Coverage includes keyboard and
  narrow-screen routes, completion, migration-aware persistence, cross-tab
  reset/bookmark/note/checkpoint synchronization, transcript and workspace
  search, exports, backup replacement, install/share capability boundaries,
  and 44 px settings targets.
- `node pipeline/provenance/run-checks.mjs` passed every fixture and all 24 live
  records. `npm run licenses` found 93 allowed, two unchanged MPL-2.0 review
  packages, and no denied package. `npm audit --omit=dev` found zero
  vulnerabilities.
- `graphify update .` refreshed the repository graph, and scoped post-refresh
  queries connected `JOURNEY` through `FlightDeck.tsx` to `WorkspacePanel()`
  and resolved the lazy scene/performance nodes.

## Browser and visual observation

- Obscura was attempted first but rejects private-loopback URLs. Safari was
  attempted next, but macOS screen capture failed with `SCStreamErrorDomain
  -3811`; native Safari acceptance therefore remains unverified.
- Playwright Chromium was then used for the visual pass and Playwright WebKit
  for the second interaction engine. The 1440×900 introduction, Portal flight,
  workspace-search drawer, and 320×568 responsive view were inspected.
- The copper/cyan route language, synthetic instrument rings and core, progress
  rail, comparison surfaces, and search result hierarchy remained readable.
  No application console error appeared. The existing Three.js `Clock`
  deprecation warning remains.

## Performance artifact

The exact app/capture commit `2ec16b5cc504386da33f48d9f4763844d2c6a97a`
was built and served locally. Playwright WebKit 26.5 reported the Apple GPU at
1440×900, 1× DPR, balanced tier, and unthrottled loopback. Each stage received
120 warm-up frames followed by three 180-frame runs.

| Stage | Run p95 range | Mean range | Max | >33.3 ms | Runtime estimate |
|---|---:|---:|---:|---:|---|
| Surface trace | 17–18 ms | 16.661–16.667 ms | 20 ms | 0 | 60 fps · 18 calls · 47,700 tris |
| Portal | 17–18 ms | 16.656–16.667 ms | 19 ms | 0 | 60 fps · 1 call · 2 tris |
| Flow corridor | 17 ms | 16.667 ms | 18 ms | 0 | 60 fps · 1 call · 2 tris |

The measured cadence supports this local synthetic scene, but the strict
desktop `p95 <= 16.7 ms` proof gate is **not confirmed** because p95 was 17–18
ms. A Chromium performance attempt correctly timed out under its forced
SwiftShader software renderer; Chromium interaction acceptance still passed,
but Chromium GPU performance is inconclusive. The raw WebKit JSON and Markdown
were generated under ignored `app/test-results/performance/` paths.

## Storage and content boundary

- Current records include product, journey ID, immutable pack ID, digest, and
  reset generation. Malformed current records fail closed; legacy v1 records
  migrate without leaving the active app on global keys.
- Import accepts only schemas 1–3, `local_only: true`, allowlisted preferences,
  bounded progress, known stage IDs, and notes capped at 1,200 characters.
  Schema 3 also requires the exact product, journey, pack, and digest.
- A 256 KiB pre-read limit, preview, and explicit confirmation precede
  replacement. Private notes stay local and are never app evidence or review.
- The content pack remains `synthetic_engineering_only`, publishes no medical
  claims, and has no anatomy or third-party asset.

## Known limits

- Playwright WebKit is not native Safari; Playwright Chromium in this run is
  not a hardware-GPU performance environment.
- No physical mobile, fast-4G first-scene, memory, native install, or assistive-
  technology session was measured.
- Local notes are not encrypted and must not contain sensitive information.
- The Vite per-chunk warning and Three.js `Clock` deprecation warning remain
  nonblocking. The aggregate release budget still passes.
- Foundation+4 creates no tag or GitHub release. A mainline push uses the
  repository's existing CI and Pages workflows.
