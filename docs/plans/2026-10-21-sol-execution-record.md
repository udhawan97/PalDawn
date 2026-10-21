# P0–P2 execution record

Started October 21, 2026 (America/Chicago). Owner: this user-started Codex run.
Branch: `stay-calm-its-codex/next-phases-20261021`; isolated checkout:
`/Users/umang/developer/worktrees/PalDawn-next-phases`.
Baseline and exact tested application candidate: `588cfb64b2af16e1dd2a57528ad9f52b3a0157dc`,
matching origin/main. Only this documentation record was added during the P0
run; no tested application bytes were modified.
Latest user instruction authorizes execution, push and merge, including the
known automatic Pages effect of app-path integration. No release tag is requested.

Plan: [P0–P2 handoff](2026-10-21-sol-next-phases.md), reviewed digest
`a6e0855be890c69835adb2d885480ddaf89c9d64384e1237fe703fd960fa1031`.
Preparation receipt: [two-round review](2026-10-21-sol-next-phases-review.md).
No competing current packet record or open PR was found at start.

## P0.1 — Baseline reproduction (engineering accepted)

Environment: macOS 26.5.2 (25F84), arm64; Node 26.4.0, npm 11.17.0;
Playwright 1.62.1; Chromium 151.0.7922.34 (revision 1234), WebKit 26.5
(revision 2336), from the pinned Playwright browser manifest. CI uses Node 22 and will verify runtime compatibility.
Lockfile SHA-256: `fdad7b5c0290dd5417cdea99bc29ffd20ef97df88665430127d53a05884416e6`.
PWA historical commit `38294634d9f35778b2519bc9a33f95e9bbcfbc20` exists.

Inventory: main was clean. Three older review worktrees have uncommitted work;
clinical-atlas and foundation-plus-4 each have four commits absent from main.
Their changes concern earlier clinical/public-app work, not this synthetic Y
junction/playback batch. Old temporary review attachments are missing. All are
preserved. Two unmerged automation branches change CONTRIBUTING or public CSS;
they are outside this batch. No cleanup or unrelated integration was performed.

Raw logs/traces stay outside public docs. Local evidence directory:
`/tmp/paldawn-next-phases-20261021` (ephemeral; sanitized outcomes below are durable).

| Gate | Outcome | Evidence file |
|---|---|---|
| Pinned install | Passed | npm-ci.log |
| Provenance | Passed | baseline-provenance.log |
| Public source/build/contracts | Passed | baseline-npm-test.log |
| Public Chromium/WebKit | 330 passed (9.8m) | baseline-browser.log |
| PWA lifecycle | Passed | baseline-pwa.log |
| Graphics build | Passed | baseline-graphics-build.log |
| Graphics Chromium/WebKit | 28 passed (44.7s) | baseline-graphics-browser.log |
| Licenses | Passed | baseline-licenses.log |

Initial browser launch failed because matching Playwright binaries were absent.
Stopped that attempt, installed the pinned Chromium/WebKit binaries and reran.
No assertions or harness source changed. Node-version difference remains recorded.
Install audit reports pre-existing advisories in Vite/source-map-js; the pinned
stack is preserved and no audit gate is claimed passed by this execution.

Native Safari 26.5.2: seek, profile selection, play/pause and detail controls
responded on the task-owned graphics preview. Background-tab motion/pixels were
not established. VoiceOver, physical touch, native downloads and installed-PWA
restart: unverified. They remain target-surface holds, separately from automated
engineering acceptance. No clinical, asset or whole-journey performance approval.

## P0.2 — Resumable record (accepted)

This file records ownership, baseline, gates and next action. No runner repair
has been required. Every passed command in the table exited 0. Rollback: scoped revert of record/queue updates only.
Next: run the implementation council for
P0.1/P0.2 before marking the baseline engineering ready and entering P1.
Next packet: P1.1. Exact first focused validation command from `app/`:
`node --experimental-strip-types graphics/verify-branch.mjs` (after adding the
branch contract/check script).

## P1/P2 — Active

P0 engineering accepted; P1 geometry/flow candidate under review. Source
integration, candidate CI, main CI, deployment and release remain pending.

### Frozen construction detail for P1.2 (before implementation)

Use the existing Three.js stack to polygonize one continuous implicit wall
volume on a regular grid, using a consistent six-tetrahedra split per cell and
welded positional vertices. Inner/outer Y fields are unions of three circular
ray corridors, clipped only by their external port planes and the upper
inspection plane. The wall volume is outer-minus-inner. This creates an open
lumen with annular external rims and connected inspection-cut edges, rather
than three intersecting closed meshes. A small smooth union is confined to the
junction's overlapping corridors; external radii stay 0.9/0.6 units.

Root starts at Z=-6. Daughter external ports are at Z=6, on rays ±35 degrees
from +Z; each has more than four straight units outside the junction domain.
Grid step is 0.06 units; wall thickness is 0.18 units. Route tangents blend
only within Z=[-1,1], inside the declared Z=[-2,2] junction domain. Cells use
a deliberately narrow central lane, with 0.18-unit bounding radius and
0.08-unit clearance. No radius/angle tuning beyond the fixed contract.

Acceptance supplements field checks with triangle-distance sweeps, welded-edge
incidence, component/Euler checks, degenerate-face checks and port/interior ray
probes. Sweeps bound between-sample motion using the maximum path displacement;
the clearance check uses actual emitted triangles. If these independent probes
cannot establish clearance/topology, P1.2 stays blocked and no flow is wired.

P0 commands: `npm ci`; root `node pipeline/provenance/run-checks.mjs`; app
`npm test`, `CI=1 PLAYWRIGHT_PORT=44173 npm run test:browser`,
`npm run pwa:test:browser`, `npm run graphics:build`, `npm run graphics:test`,
`npm run licenses`. All completed with exit 0 after browser provisioning.
Served public manifest digest: `51c93297f7be5e06cee581d6f8aa5d22ae5254d94ffc5b08df9fb27eeeb012da`;
graphics flow HTML digest: `1c89c7082752996049b58bb1e2984233854b9683eaa804653e41b412c43f53ee`.
Both served bytes matched their isolated build outputs.

## P0 implementation council receipt

Frozen reviewed docs candidate: `99fbb2701f91869ffa77d9e7e13df7e0fe39ad2e`;
record snapshot SHA-256: `4ffe3676fcaf3a81993751fc1ab6a0627c0f870ca51029551fae2a0964f87edb`.
Four independent roles reviewed both P0 packets in each of two rounds.

| Role | P0.1 round 1 / 2 | P0.2 round 1 / 2 |
|---|---|---|
| Evidence | APPROVE_WITH_NITS / APPROVE | BLOCK / APPROVE_WITH_NITS |
| Coverage | APPROVE_WITH_NITS / APPROVE | BLOCK / APPROVE_WITH_NITS |
| Risk | APPROVE / APPROVE | APPROVE_WITH_NITS / APPROVE |
| Outcome | APPROVE / APPROVE | APPROVE_WITH_NITS / APPROVE_WITH_NITS |

Record linkage, exact browser versions, candidate identity and next command were
corrected before confirmation. Stale queue wording is corrected with this receipt.
No valid P0 blocker remains; native and clinical holds are unchanged.
P1.1 focused branch validation/build is active in this isolated branch.

## P1.1 — Branch contract engineering accepted

Frozen confirmation candidate: `828097aeb6e10b5dc9c9b6b5abc4e17524fccc22`.
Four independent Evidence/Coverage/Risk/Outcome executions in each of two rounds:
round 1 all BLOCK on sparse-array validation; round 2 APPROVE, APPROVE_WITH_NITS,
APPROVE, APPROVE respectively. Fixed dense-index validation, radius samples and
port ownership; bounded route progress to prevent coordinate overflow. The
coverage nit added tangent probes at the actual piecewise joins, 5/12 and 7/12.
`node --experimental-strip-types graphics/verify-branch.mjs` and graphics build
passed (exit 0). This accepts the fixed synthetic contract only.

## P1.2/P1.3 — Candidate geometry and flow (council pending)

`graphics:verify` includes the new independent junction verifier. Mesh: 253,702
triangles, one connected component, Euler 2, every edge has two opposite-wound
faces, no degenerate emitted faces, finite attributes and outward wall volume.
506 actual-triangle clearance sweeps found minimum distance 0.5910 units.
Required extent/clearance/lane/inter-sample bound totals under 0.325 units.
The between-sample displacement bound is 0.02442 units. Port ray probes pass;
all seeded passage samples retain identity, plane clearance and handoff visibility.

A 0.12-unit grid failed topology; refinement to 0.06 units plus deterministic
near-zero snapping removed aliasing/sliver defects. Assertions remain strict.
Winding uses adjacent-edge orientation, signed volume and independent straight
inner/outer normal checks; exact analytic-field gradients are not an oracle for
faces of the discretized junction. No clinical geometry claim is made.

Focused browser suite: 6 passed across Chromium/WebKit (20.6s), covering rendered
motion/pause/backward seek, tier restoration, four-side views/wireframe, reduced
motion, hidden document, keyboard slider, text fallback, empty storage and WebGL
retry. Graphics build and pure contract checks pass. The above/below clay views
were visually inspected; the lumen is open and the external wall is continuous.
Raw images/logs remain in local output/evidence directories.

Next: two-round P1.2/P1.3 implementation council, then P2 pure scene-frame work.

### P1.2/P1.3 round-1 corrections

Initial review accepted mesh engineering with documentation nits and blocked
flow acceptance: CPU-uploaded matrices did not satisfy the frozen analytic GPU
contract, and whole-frame equality did not establish CPU/GPU positional parity.
Replaced matrix uploads with an instanced analytic GPU branch shader sharing
explicit seeded inputs. Actual WebGL transform-feedback checks compare that
shader against CPU frames to 1e-4 units, including both branches and precise
handoff boundaries. Isolated diagnostic rendering compares actual colored GPU
pixels against projected CPU centers before/at/after handoff, in both tiers;
raster centroid tolerance is 3 device pixels, separately from numeric tolerance.
Restart/seek and WebGL retry now require pixel-identical paused reconstruction.
Keyboard slider time is asserted explicitly.

Revised focused browser suite: 10 passed (34.9s), Chromium and WebKit, exit 0.
Triangle sweeps now cover the complete visible progress interval [.04,.96],
including entry/exit fades, with unchanged strict full-extent margin.
Commands: `npm run graphics:build`; `npm run graphics:verify`;
`node --experimental-strip-types graphics/verify-junction.mjs`;
`npx playwright test --config playwright.graphics.config.mjs graphics/tests/junction.spec.mjs`.
Logs: p1-build.log, p1-verify.log, p1-junction-check.log, p1-browser.log under the
local evidence directory. All completed checks passed; no native/clinical or
performance gate is inferred. Frozen implementation candidates and council
verdicts are recorded below on acceptance.
