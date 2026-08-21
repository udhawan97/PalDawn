# Credits & prior art

PalDawn builds on the shoulders of open source. This file lists what is
**actually used** (present in the repository/build, with provenance records)
separately from **candidates and influences** (nothing incorporated). Adoption
rules: `docs/PLAN.md` §7 and `pipeline/provenance/README.md`. Do not move an
item to "Used" before it is present, recorded, and verified.

## Used — direct npm dependencies (code, MIT/Apache-2.0)

Pinned exact versions; integrity digests in `app/package-lock.json`; one
provenance record each under `pipeline/provenance/records/`; full license
texts in `app/THIRD_PARTY_LICENSES.md`.

- react 19.2.8, react-dom 19.2.8 — © Meta Platforms, Inc. and React contributors — MIT — https://github.com/facebook/react
- three 0.185.1 — © three.js authors — MIT — https://github.com/mrdoob/three.js
- @react-three/fiber 9.7.0 — © Poimandres contributors — MIT — https://github.com/pmndrs/react-three-fiber
- @react-three/drei 10.7.8 — © Poimandres contributors — MIT — https://github.com/pmndrs/drei
- @react-three/postprocessing 3.0.5 — © Poimandres contributors — MIT — https://github.com/pmndrs/react-postprocessing
- zustand 5.0.15 — © Poimandres contributors — MIT — https://github.com/pmndrs/zustand
- vite 8.2.1 — © VoidZero Inc. and Vite contributors — MIT — https://github.com/vitejs/vite
- @vitejs/plugin-react 6.0.5 — © VoidZero Inc. and Vite contributors — MIT — https://github.com/vitejs/vite-plugin-react
- typescript 7.0.2 — © Microsoft Corporation — Apache-2.0 — https://github.com/microsoft/TypeScript
- @types/react 19.2.18, @types/react-dom 19.2.4, @types/node 26.2.0 — DefinitelyTyped contributors — MIT — https://github.com/DefinitelyTyped/DefinitelyTyped
- @playwright/test 1.62.1 — © Microsoft Corporation and Playwright contributors — Apache-2.0 — test-only browser acceptance tooling — https://github.com/microsoft/playwright

Transitive packages are covered by the preserved lockfile plus the denylist
inventory (`app/third-party-license-inventory.json`; currently 95 packages,
0 denied, regenerated on every gate).
Notes: `webgl-constants@1.1.1` (via drei → detect-gpu) declares no
license field but ships a verbatim MIT LICENSE in its published artifact
(resolution evidence recorded in `app/scripts/license-inventory.mjs`);
`lightningcss` (Vite build-time, MPL-2.0) is review-tier, build-tooling only,
not bundled into shipped output.

## Used techniques from recorded dependencies

First Light directly uses three.js curve, tube, instancing, material, fog, and
lighting APIs; drei `MeshPortalMaterial` and line helpers; and
@react-three/postprocessing Bloom on the high tier. These ship through the
pinned packages above—no upstream example source was copied or vendored.

## Candidates — pinned, **nothing incorporated yet**

Reverify README/license/source at the pinned ref, create a passing provenance
record, then adopt. See `docs/PLAN.md` §7 for pins: glTF Transform (MIT),
Blender glTF-IO (Apache-2.0, used only as Blender's bundled exporter),
meshoptimizer/gltfpack (MIT), three.js SSS example patterns (MIT), BodyParts3D via the Moerman repo (code MIT /
data CC BY-SA 2.1 JP), three-mesh-bvh (MIT), Z-Anatomy models (per-object
content approval only), cyanheads PubMed client patterns (Apache-2.0).

## Clean-room influences — ideas only, no code or assets copied

Recorded per `docs/research/github-recon-evidence.md`; these projects are
unlicensed, license-ambiguous, GPL/AGPL, or simply studied as prior art:

- Human Anatomy 3D Viewer by esma-dev-studio — UX/state-pattern reference only. https://github.com/esma-dev-studio/anatomy-3d-viewer
- Open Anatomy Browser by Michael Halle — hierarchy/atlas data-model reference only. https://github.com/mhalle/oabrowser
- Z-Anatomy Blender add-ons (GPL-3.0) — workflow ideas only; no GPL source copied. https://github.com/Z-Anatomy/Blender-addons
- Cinematic Zoom by David Ronai (@makio64, MIT) — camera-channel/log-distance interpolation principles; if code is ever adapted, attribution and MIT notice land at the adaptation site. https://github.com/Makio64/threejs-cinematic-world-zoom
- Theatre.js — editor/runtime-separation boundary idea only; AGPL Studio code is never copied. https://github.com/theatre-js/theatre

## 3D assets

No third-party 3D asset is incorporated. First Light's visible model is
procedural project code, not an anatomy asset. See `NOTICE.md`.
