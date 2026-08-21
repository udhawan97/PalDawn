# Foundation+3 acceptance evidence

Recorded locally on 2026-08-21 against the isolated Foundation+3 candidate.
All production-route commands used the GitHub Pages base path `/PalDawn/`.

## Automated gates

- `VITE_BASE_PATH=/PalDawn/ npm test` passed TypeScript, the production build,
  the five-stage synthetic release contract, all retained Foundation+ and
  Foundation+2 contracts, six Foundation+3 contracts, and executable runtime
  state tests.
- Built JavaScript was 338,834 bytes gzip against the existing 500 KiB budget.
- `CI=1 VITE_BASE_PATH=/PalDawn/ npm run test:browser` passed 16/16 isolated
  Chromium tests. The five Foundation+3 tests cover comparison and note focus,
  persistence and live cross-tab notes/checkpoints, Markdown export, invalid
  import rejection, preview/cancel/confirm replacement, restored preferences,
  and a 320×568 no-overflow check.
- `npm ci` installed the unchanged 95-package dependency tree and reported zero
  vulnerabilities. No package or lockfile dependency changed.

## Browser observation

- Obscura was attempted first but its connector rejected the private-loopback
  preview URL. Safari was attempted next but the macOS session was locked, so
  actual Safari acceptance remains unavailable.
- Headed Chromium then exercised the built desktop and 320×568 workspace.
  Accessibility snapshots exposed the five-stage navigator, both authored
  tracks, bounded note, checkpoint state, summary, and export controls. Desktop
  and mobile screenshots were inspected; the drawer remained readable without
  horizontal overflow.
- There were no application console errors. The existing Three.js `Clock`
  deprecation warning remained.

## Storage and import boundary

- Workspace records accept only known synthetic stage IDs, text notes truncated
  to 1,200 characters, personal checkpoint IDs, and reset-generation metadata.
- Notes render as text and are labeled private learner input, not evidence,
  approval, or medical review. The UI warns against patient or personal health
  information.
- Import accepts only schema versions 1 and 2, `local_only: true`, allowlisted
  preference values, bounded progress, known stage IDs, and normalized workspace
  data. A preview and explicit confirmation are required before replacement.
- Replacement rotates the reset generation so stale tabs cannot resurrect the
  pre-import state.

## Known limits

- Chromium automation is not actual Safari acceptance. Safari remains
  explicitly unverified.
- Local notes are not encrypted and should not contain sensitive information.
- The existing Vite chunk-size warning, Three.js `Clock` warning, and two MPL
  review-tier transitive packages remain nonblocking and unchanged.
- Foundation+3 creates no tag or GitHub release. A mainline app push uses the
  repository’s existing Pages workflow.
