# Foundation+ acceptance evidence

Recorded locally on 2026-08-21 against the council-corrected candidate before main
integration. All routes below used the production Pages base path `/PalDawn/`.

## Automated gates

- `VITE_BASE_PATH=/PalDawn/ npm test` passed TypeScript, the production build,
  the five-stage synthetic release contract, all fourteen Foundation+ source and
  build contracts, and executable state tests. The state tests exercise corrupt
  persisted input, durable two-key reset, non-autoplay resume, malformed hashes,
  five-step reduced-motion completion, cross-tab reset suppression, and restored
  completion state.
- `npm run test:browser` exercises skip-target focus, narrow-screen completion
  focus, completed-session restoration, 44 px settings selects, and a two-tab
  reset race in headless Chromium. Both CI and Pages deployment run this suite.
- Built JavaScript was 334,507 bytes gzip against the existing 500 KiB budget.
- `node pipeline/provenance/run-checks.mjs` passed every valid, invalid, and live
  record. No anatomy, binary asset, or runtime dependency was added. The one new
  test-only dependency, `@playwright/test`, has a pinned Apache-2.0 provenance
  record and lockfile integrity.
- `npm run licenses` reported 94 packages: 92 allowed, 2 existing MPL review
  entries, and 0 denied.

## Browser acceptance

Headed Chrome exercised the built app served by Vite preview. WebKit was also
used for interaction and responsive checks, but WebKit automation is not actual
Safari acceptance.

| Area | Observed result |
|---|---|
| Responsive states | Intro, entered 3D voyage, and text voyage passed at 320, 375, 414, 768, 1280, 1440, and 1920 px with no horizontal overflow. Visible links, buttons, and the scrubber had at least a 44 px CSS target (43.5 px tolerance for fractional layout). Text voyage rendered zero canvases. |
| Skip navigation | First Tab focused “Skip to introduction”; Enter focused `#intro-title`. After entry, Enter focuses the programmatically focusable `#flight-controls` target. |
| Resume and hashes | Scrubbing to `600` produced `#stage/flow-corridor`; reload showed the bounded resume prompt and restored `600`. Arrival → Replay changed the hash to Approach; reload did not reopen Arrival. A malformed encoded stage hash left the intro usable. |
| Reduced motion | Five primary-control advances traversed Approach, Surface trace, Portal, Flow corridor, and Arrival, then produced the completion summary at progress `1000`. |
| Background pause | A dispatched hidden/visible lifecycle event paused playback and showed the explicit banner. Resuming through either Continue or the banner restored playback and removed the stale banner. This validates the event path, not OS-level tab scheduling. |
| Scene recovery | A cancelable `webglcontextlost` event showed recovery; retry recreated the scene; a repeated loss still recovered; text fallback retained Portal at progress `422` and removed the WebGL canvas after React settled. |
| Settings and local data | Version-1 settings survived reload; invalid enum/type values fell back to defaults. Reset confirmation cleared both PalDawn data keys, removed the stage hash, reloaded a second open tab, and remained clear after that tab's persistence interval. |
| Exports | Transcript copy fallback, text download, print dispatch, diagnostics JSON, and local-data JSON were exercised. Diagnostics identified `foundation+` and `local_only: true`; the transcript retained the synthetic and emergency-services boundaries. |
| Fullscreen | Headed Chrome entered and exited the Fullscreen API successfully. |
| Offline first install | A fresh origin remained navigation type `navigate` (no unsolicited reload), became controlled, retained “Offline voyage ready,” and created only its fingerprinted PalDawn cache. |
| Worker update | Two builds using QA-only salts produced cache IDs `724617eb7313` and `fc15ba643a22`. Update check created a waiting worker without mutating the active cache; user-triggered activation reloaded once and deleted only the stale PalDawn cache. |
| Offline reload | After update activation, a network-offline reload remained controlled and rendered the First Light intro from the same-origin cache. No third-party runtime resource was requested. |

## Known limitations

- The console has no application errors. It retains the pre-existing Three.js
  `THREE.Clock` deprecation warning; this work does not claim a warning-free console.
- Obscura rejected the private localhost address, and actual Safari automation
  could not start because ScreenCaptureKit returned capture error `-3811`.
  Chrome/WebKit evidence therefore must not be represented as Safari fidelity.
- No tag or GitHub release is part of Foundation+. A push touching `app/**` on
  `main` will invoke the repository's existing GitHub Pages workflow.
