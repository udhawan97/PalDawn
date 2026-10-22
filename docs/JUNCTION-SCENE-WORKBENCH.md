# Connected scene workbench — synthetic P0–P2

This local engineering study follows one opening into two exits, then inspects
the central lane from inside one branch. Shape, size, density, branch allocation
and teaching seconds are arbitrary. It is not reviewed anatomy or physiology.

## Run the study

With Node.js 22+ and the existing locked dependencies, run from `app/`:

```sh
npm ci
npm run graphics:dev
```

Follow the heart page's synthetic-flow link, then **Connected junction study**,
or open `/junction-study.html` on the development server. `graphics:build` writes
all four studies to ignored `dist-graphics/`. The regular `build` writes only
the public application to `dist/`; Pages does not publish the workbenches.
No service worker, learner notes, study storage or third-party model is used by
the junction fixture.

## Inspect and recover

- Seek either direction through **Overview**, **Junction** and **Inside** shots
  at 0, 4 and 8 seconds of the finite 12-second passage. Playback never wraps.
- **Inspect freely** pauses the passage. Choose a view or detail tier, then
  **Return to journey** restores the directed camera at the same teaching time.
  It stays paused until playback is explicitly requested.
- Reduced motion disables continuous playback and keeps the slider and shot
  controls available. **Text mode** retains captions, sources and scene notes.
- Hiding the document pauses playback. A failed renderer offers a retry at the
  selected frame and text continuation; source/browser tests are separate from
  native Safari animation, VoiceOver and physical-device acceptance.
- `?fixture=deferred` is a synthetic readiness test. Tests intercept its local
  request to delay or fail a shot, prove superseded replies cannot take control,
  and hold the last readable frame until a requested scene is ready. This is
  not the P3 production pack loader.

## Existing modules and test surfaces

| Module | What its existing interface hides |
| --- | --- |
| `branchModel.ts` | Fixed Y contract, stable identity and branch ownership, deterministic route/frame and safe lane |
| `branchGeometry.ts` | One emitted connected cutaway wall and open ports |
| `sceneFrame.ts` | Teaching-time shot, caption, flow time, camera and framing policy |
| `playback.ts` | Play/pause, inspection, text/reduced-motion and request-token interlocks |
| `cameraFit.ts` | Actual canvas aspect and padded projected-bounds fitting |
| `JunctionWorkbench.tsx` | React/Three resources, presentation, browser events and visible controls |

Deleting these modules would spread their behavior across renderers and checks.
The fixed fixture does not justify a general branching network or scene loader.

From `app/`, run `npm test`, `npm run graphics:build` and
`npm run graphics:test`. Deterministic checks reject unsupported branch inputs,
probe the emitted mesh for topology/openings/full-extent clearance, compare
repeated direct/forward/backward frames, and cover request lifecycles and camera
clearance. Browser checks use rendered controls and pixels, actual GPU/CPU
parity probes, two engines, narrow layouts, failure/retry and exact return poses.
Automated samples establish bounded engineering evidence, not a general proof
for arbitrary geometry or a measured performance budget.

## Release boundary

P0–P2 source work is integrated; [the execution record](plans/2026-10-21-sol-execution-record.md)
records the candidate and remaining holds. P3 integrity/loading is implemented in the separate [scene-pack lab](SCENE-PACK-WORKBENCH.md).
P4–P5, qualified anatomical/clinical
review, public adoption, native animation/pixels, VoiceOver, physical touch,
installed-PWA acceptance and measured whole-journey performance remain separate
acceptance states. This source-only release supplies no native installer,
signing, notarization or separately published reference packs.
