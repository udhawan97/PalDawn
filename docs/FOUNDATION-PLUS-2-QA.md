# Foundation+2 acceptance evidence

Recorded locally on 2026-08-21 against the isolated Foundation+2 candidate.
All production-route commands used the GitHub Pages base path `/PalDawn/`.

## Automated gates

- `VITE_BASE_PATH=/PalDawn/ npm test` passed TypeScript, the production build,
  the five-stage synthetic release contract, all fourteen retained Foundation+
  contracts, six Foundation+2 contracts, and executable runtime-state tests.
- Built JavaScript was 336,370 bytes gzip against the existing 500 KiB budget.
- `CI=1 VITE_BASE_PATH=/PalDawn/ npm run test:browser` passed 11/11 isolated
  Chromium tests. They cover playback persistence, search focus and stage jumps,
  bookmark persistence/export/restart/reset and live cross-tab add/remove,
  native-share/copy branches, install help/dismiss/accept/standalone branches,
  retained focus/completion/target-size checks, and the retained cross-tab reset
  race.
- `node pipeline/provenance/run-checks.mjs` passed 41 checks: 3 valid fixtures,
  14 expected invalid-fixture rejections, and 24 live records. No dependency,
  anatomy asset, or clinical content was added.
- `npm run licenses` reported 95 packages: 93 allowed, 2 existing MPL review
  entries, and 0 denied.

## Browser observation

Headed Chromium exercised the built desktop settings view and the entered voyage
and transcript drawer at 320×568. The new controls remained readable without
horizontal overflow. Accessibility snapshots exposed named search, bookmark,
share, playback, install, and restart controls. There were no application console
errors; the retained Three.js `Clock` deprecation warning remained.

## Council corrections

- Bookmark persistence now rejects unknown stage IDs in both load and save paths.
- Cross-tab bookmark add and remove behavior is directly browser-tested.
- A dismissed install prompt is consumed instead of being presented as reusable.
- Unsupported-browser help is conditional, and standalone recognition is tested.
- Playback-rate behavior has a deterministic state-level assertion in addition
  to the persisted control and scene wiring.
- Current provenance documentation reports the post-Foundation+ record count;
  the v0.1.0 release snapshot remains historical.

## Known limits

- Native sharing and install-prompt outcomes are browser-capability mocks in the
  automated suite. No real OS share sheet or completed app installation is
  claimed.
- The deterministic pacing test validates route-state math and wiring; it is not
  a wall-clock performance measurement.
- Chromium automation is not actual Safari acceptance. Safari remains unverified.
- The existing Vite chunk-size warning, Three.js `Clock` warning, and two MPL
  review-tier transitive packages remain nonblocking and unchanged.
- Foundation+2 creates no tag or GitHub release. A mainline app push uses the
  repository's existing Pages workflow.
