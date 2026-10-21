# Sol handoff: the next three PalDawn phases

Prepared October 21, 2026 (America/Chicago). Scope: implementation preparation.
This handoff expands P0–P2 of the [canonical queue](2026-10-19-scheduled-phases.md);
it does not replace that queue. No application implementation is claimed here.

## Start here

Use `/Users/umang/developer/github/PalDawn`, not the empty Documents chat folder.
Execute P0.1 first, then P0.2, P1.1–P1.3, and P2.1–P2.3 in order. Claim and
finish one packet at a time. P1 and P2 are prepared but dependency-gated.
P3–P5 remain in the canonical queue; do not pull public adoption into this batch.
The user-started interactive Sol run may execute multiple packets sequentially,
with separate reviews and evidence for each. Scheduled CAPO runs retain the
canonical limit of at most one new packet per selected run.

Paste this into Sol after selecting the model yourself:

> Execute the PalDawn handoff at
> `/Users/umang/developer/github/PalDawn/docs/plans/2026-10-21-sol-next-phases.md`.
> Read the canonical queue and review receipt first. Start with P0.1; reconcile
> current HEAD, worktrees, PRs, ownership and completed work before editing.
> Continue sequentially through P2 only while prerequisites pass. Revalidate the
> frozen packet against current source; material changes need renewed plan
> review. Use isolated synthetic state and preserve unrelated work. Complete
> acceptance and the implementation council for each packet before integration.
> Record exact evidence, open gates and the next command after every packet.
> Stop at an unmet dependency rather than weakening checks. Do not release,
> deploy, change schedules or adopt unreviewed assets/content under this handoff.
> Inspect automatic deployment triggers before any push or merge; prepare a
> verified branch when integration would deploy. Tell me what is implemented,
> tested, integrated and still blocked separately.

## Verified preparation baseline

- Local HEAD and live remote main: `61ad59bd6dbdefd10cc5801ef62f92b64dfa3d9c`;
  working tree was clean at inspection. Package version: 0.6.1.
- [CI 39372533668](https://github.com/udhawan97/PalDawn/actions/runs/39372533668)
  completed successfully for that SHA. No open PRs returned at inspection.
  This is hosted baseline evidence, not a fresh local P0 run.
- Existing worktrees were inventoried, not cleaned or declared redundant.
  Their dirty/unique-work state must be reconciled by P0 before implementation.
- `flowModel.ts` has three radius profiles, seeded identities, full-cell clearance,
  a finite 12-second passage and CPU/GPU flow calculations. Extend these.
- `FlowWorkbench.tsx` owns a playback clock; `HeartWorkbench.tsx` separately
  uses OrbitControls auto-rotation. `cameraFit.ts` already fits world-space bounds.
- Public Playwright has Chromium/WebKit projects and allows server reuse outside
  CI. Graphics uses a separate build and fixed port 4318 with reuse disabled.
- The PWA harness requires historical commit
  `38294634d9f35778b2519bc9a33f95e9bbcfbc20` and uses Chromium at `/PalDawn/`.
- `.github/workflows/deploy.yml` deploys relevant main changes, including
  `app/**`. Development-only graphics code is excluded from the public bundle,
  but changing it on main can still trigger a Pages deployment.

Graphify navigation was corroborated against these source files. No fresh app,
browser, native Safari or device tests were run to prepare this document.

## Common execution contract

Owner: the user-started Sol run after it records its identity and checkout in the
run record. No packet is claimed by this preparation. Reconcile concurrent CAPO
ownership; a Markdown status is not an atomic lock. Preserve cadence/settings.

Create an isolated worktree from freshly verified main for code work. Read all
applicable instructions. Preserve other worktrees, learner data and Git history.
Use pinned dependencies; no engine upgrade, new service, generic orchestration,
storage migration, clinical claim, third-party asset adoption or public routing.
All new scenes are visibly synthetic, development-only and text-accessible.

Each packet ends with a scoped diff, focused tests, required integration checks,
exact SHA/tree digest, evidence paths and two-round/four-role implementation
council. The preparation council covers these written contracts only. If the
baseline, implementation boundary or acceptance contract changes materially,
renew the affected plan council before editing. Keep native Safari, WebKit,
physical-device and clinical review evidence distinct.

Rollback is a scoped revert of the packet in its isolated branch after checking
dependents. Never reset learner storage, delete other worktrees, force-push main,
or treat a revert as permission to redeploy. If geometry or playback cannot meet
the gate, retain the existing standalone fixtures and park the dependent packet.

## P0 — Reproduce and record the baseline

**Benefit:** subsequent geometry work has an attributable baseline and a resumable
record rather than inherited claims from old test runs.

### P0.1 — Inventory and reproduce (small–medium)

1. Record source SHA, remote SHA, branch, clean/dirty state, worktree list, open
   PRs and packet owner. Compare relevant unmerged work before duplicating it.
2. Record Node/npm, lockfile digest, OS and exact Playwright/browser versions.
   CI specifies Node 22; preparation host is Node 26.4.0/npm 11.17.0. Use the CI
   runtime or explicitly record and investigate any runtime-dependent difference.
3. Install from `app/package-lock.json` in the isolated checkout. Verify the PWA
   historical object exists; obtain permitted missing history before testing.
4. Run the command matrix below. Record each command's exit, log, artifact path
   and served identity. Do not infer local success from the baseline CI result.
5. For each relevant failure, save a minimal synthetic reproduction and classify
   application vs runner vs unavailable prerequisite. Do not weaken assertions.

Acceptance: all required automated baseline rows pass, including the existing
two-tab conflict, 150-record limit, multibyte backup, focus/recovery, cache-failure
and PWA handshake coverage. List native download, installed-PWA restart,
VoiceOver and physical touch as pending unless actually tested. These pending
native gates block dependent acceptance/publication, not isolated P1 engineering.

Allowed changes: evidence/run record only; runner fixes belong to P0.2.
Stop: unsafe fixture isolation, missing history/binaries, unknown server identity
or a reproducible baseline failure. Preserve evidence and its owner/prerequisite.
A classified runner defect permits entering the reviewed P0.2 repair path before
P0.1 acceptance; rerun affected baseline checks afterward. Dependent feature work
remains stopped, and P1 remains blocked until P0 is engineering ready.

### P0.2 — Resumable record and proven runner repairs (small)

Create `docs/plans/2026-10-21-sol-execution-record.md` from the record schema below
and link it from the canonical queue. If P0.1 demonstrates a runner defect,
freeze a narrow repair amendment and review it before changing the harness.
Prefer an existing configuration option to a new wrapper/framework.

Acceptance: another run can identify the current packet, exact candidate, failed
gate and next command without inference. A runner repair must test its failure
path and preserve assertion intent. Mark P0 ready only after the baseline rows
pass; an unresolved application defect becomes a separately reviewed prerequisite.
Rollback: revert only a faulty helper/config repair, keeping its evidence record.

## P1 — One connected synthetic Y junction

**Benefit:** a visibly open branch and continuous, repeatable particle passage.
Dependency: P0 engineering ready. Existing single-route profiles stay usable.

### P1.1 — Freeze the branch contract (medium)

Implement a small pure branch model beside `app/graphics/flowModel.ts`.
Version 1 supports exactly one symmetric planar Y fixture: parent along +Z in
the XZ plane, two children at ±35 degrees from +Z; parent radius 0.9 arbitrary
units and child radii 0.6. This is a bounded fixture, not a general vessel tree.
Each straight section outside the junction is at least 4 units long; the shared
junction domain is Z in [-2, 2]. Use Y as up. Blend the opening within that
domain, preserving the three exterior ports and smooth route tangents.

Record immutable root/left/right IDs, parent attachment, local-to-world transform,
entry/exit port ownership and radius samples. The parent ends at the junction;
each route crosses it into exactly one child. Root owns upstream flow, the chosen
child owns downstream flow; assign the boundary once using half-open intervals.
Keep cell bounding radius 0.18 and clearance 0.08 arbitrary units initially.
CPU comparison epsilon: 1e-6 units; Float32/render comparison: 1e-4 units.
These are engineering choices, not physiological values or measured results.

Accept only this angle/radius configuration within the CPU epsilon initially.
Reject unsupported values rather than implying a wider validated domain. Reject
cycles, missing parents, duplicate IDs, disconnected branches, non-finite inputs,
non-positive radii, zero-length segments, invalid transforms, attachments outside
the parent/junction domain and abrupt radius changes. Store a stable seeded branch
choice per particle ID; illustrative 50/50 routing is not a physiological split.

Acceptance: pure positive/negative fixtures prove validation and stable routing
regardless of enumeration order, seek direction or detail tier. Preserve the
low-tier identity prefix of the high tier. No visible junction claimed yet.
Stop: contradictory coordinate/ownership definitions or unsafe clearance.

### P1.2 — Build and probe the opening (large; feasibility gate)

Build inner wall, outer wall and inspection cut edges from that branch definition.
Use a connected stitched junction surface; overlapping capped tubes do not pass.
Choose the mesh construction within the existing Three.js stack, documenting
the topology and discretization before integration. No deforming walls or new
meshing dependency. Display only in the separate graphics entry/config.

Acceptance: finite attributes/indices; consistent normals/winding; no internal
caps across either branch opening; no unintended cracks or self-intersections.
For the inspection cutaway, enumerate intentional boundary edges so an open
inspection surface is not confused with a broken seam. Topology checks on the
welded positional mesh must distinguish intended ports/cuts from internal gaps.
Probe actual triangles independently of the route/radius formula: sample swept
full-cell spheres (including clearance) through both branches, inspect minimum
wall distance and intersections, and verify entry/exit plane containment.
Adaptive subdivision must bound between-sample motion; record maximum step and
error margin. Fail if the margin cannot cover discretization uncertainty.

Use static clay views from above, below and both branches and wireframe views
to corroborate automated probes. Keep the three original profiles passing.
Stop/rollback: if a safe open mesh cannot be demonstrated, retain P1.1 as an
unwired contract, park P1.3 and retain the old single-vessel viewer.

### P1.3 — Continuous flow handoff (medium–large)

Extend the existing CPU/GPU flow paths with the same stable particle IDs and
branch selection. Maintain a continuous world-space position through the
junction and use full geometry extent plus clearance. Keep finite passages:
fade only at external entry/exit, never at the junction; never wrap visibly.
Quality switches preserve time and shared identities. Pause on profile change,
hidden documents or renderer failure; retry restores the paused frame.

Acceptance: dense time probes around each junction transition; equal seed/time
reconstructs branch and position on direct, forward, backward and restart paths.
No missing/doubled particle, handoff fade, NaN, wall crossing or visible wrap.
Compare GPU pixel behavior with CPU geometry probes; neither alone is proof.
Extend `verify-flow.mjs` and `graphics/tests/flow.spec.mjs` with both branches,
pause/seek/reduced motion/keyboard/retry and tier identity cases. Perform native
Safari acceptance on disposable loopback state before claiming Safari behavior.
P1 closes only when all three packets pass; preserve failures as explicit holds.

## P2 — A shared scene clock and reliable framing

**Benefit:** one timestamp reconstructs every visible part of a small journey.
Dependency: P1 engineering accepted. No public state-store integration.

### P2.1 — Pure scene frame (medium)

Add a versioned development-only scene spec and pure resolver under
`app/graphics/`. Use three synthetic shots: overview [0,4), junction inspection
[4,8), inside passage [8,12]. Seconds are teaching time. Clamp finite time to
[0,12]; reject non-finite time, unknown versions/IDs, gaps, overlap or nonpositive
shot duration. At 4 and 8 select the next shot; at 12 retain the final frame.

Resolve shot ID, teaching time, camera pose/target, visible layers, flow and
deformation phase, caption ID and source IDs. Use one explicitly synthetic
source identifier and neutral captions; no medical content. Initially deformation
phase is static. Define camera interpolation and per-shot flow mapping in the
spec; neither renderer nor caption view may derive a second timeline.
Declare framing targets in the spec before implementation: overview fits the
whole fixture; junction inspection fits the junction region Z in [-2, 2]; inside
passage targets a forward route cross-section at least 0.5 units ahead of the
camera, with the camera inside the safe lane. Record that cross-section's bounds
and intentional surrounding-wall clipping. Never apply whole-vessel exterior
framing to the interior shot or choose targets retrospectively to pass a test.

Acceptance: full-state comparisons at 0, 4, 8, 12 and ±1e-6 around boundaries;
direct/forward/backward/restart produce the same result. IDs/order compare
exactly; numeric rendering results use 1e-4 tolerance. A pure resolver consumes
time; it does not read wall clock, mutable UI state or initiate loads.

### P2.2 — Playback lifecycle (medium–large)

Integrate one playback owner into a development journey entry. All animated
consumers use resolved time; retire independent auto-rotation in the integrated
entry while preserving the standalone viewer. Inspect pauses narrative time;
Return to journey restores the resolved camera before explicit resume.
Hidden tab, seek, reduced motion, required-asset loading and failure pause.
No catch-up on visibility return; retry remains paused at the requested timestamp.

Use synthetic deferred-load fixtures to verify pending/ready/failed transitions.
Do not implement the P3 runtime loader here. The playback boundary accepts a
scene/request token and readiness signal; superseded async results cannot activate
an old scene. Hold the current frame before entering an unready shot; retain its
requested target for retry. Reduced motion uses stable shot/still-frame changes
and the same captions, with no automatic camera travel.

Acceptance: transition matrix for play/pause/seek/inspect/return/restart,
visibility, failed load/retry and rapidly repeated scene/quality changes.
Check captions, camera and particles against the same frame, including unready
boundary entry. Browser pixel tests must show motion and exact paused recovery.
Stop: independent clocks or narrative advancement through an unready scene.

### P2.3 — Composition and return framing (medium)

Reuse `cameraFit.ts` with transformed visible-object bounds. Compute the actual
unobscured scene rectangle after captions, drawers and controls. Prefer a canvas
layout that excludes overlays; if they overlap, fit against the remaining rect.
Handle empty/invalid bounds, zero-size surfaces and invalid view vectors safely.
Bound inspection, preserve a visible Return to journey action and refit on resize.

Acceptance: project every corner of the shot's declared framing target into the
unobscured rect with 8px CSS padding and positive near-plane clearance. For the
inside shot, also test camera clearance from the actual mesh and distinguish
declared surrounding-wall clipping from an unintentionally clipped forward target.
Test 320×568, 844×390
and 1440×900 at DPR 1 and 2, overlays open/closed, enlarged text, reduced motion
and text mode. Check camera near/far planes, not only X/Y fit. Native Safari
checks use the installed plugin; WebKit tests are additional evidence.
Record physical touch and VoiceOver separately if unavailable. P2 is complete
only when state, lifecycle and framing acceptance pass; P3 remains the next phase.

## Command matrix (inspect scripts again at execution time)

Run commands from `app/`, except provenance and Graphify at repository root.
Install with `npm ci`; provision matching Chromium/WebKit with
`npx playwright install chromium webkit` where permitted. Preserve full history.
Capture logs and exit codes per command; stop dependent commands after a failure.

| Gate | Command | When |
|---|---|---|
| Provenance | `node pipeline/provenance/run-checks.mjs` (root) | P0 and integration |
| Public source/build/contracts + geometry | `npm test` | P0 and integration |
| Public browser | `CI=1 PLAYWRIGHT_PORT=44173 npm run test:browser` | P0 and integration |
| PWA lifecycle | `npm run pwa:test:browser` | P0 and integration |
| Graphics build | `npm run graphics:build` | P0 and P1/P2 candidate |
| Graphics behavior | `npm run graphics:test` | After matching graphics build |
| Licenses | `npm run licenses` | P0 and integration |
| Pages-path public contracts | `VITE_BASE_PATH=/PalDawn/ npm test` | Before source integration |
| Pages-path browser | `CI=1 PLAYWRIGHT_PORT=44173 VITE_BASE_PATH=/PalDawn/ npm run test:browser` | After Pages-path build |
| PWA after Pages build | `VITE_BASE_PATH=/PalDawn/ npm run pwa:test:browser` | Before integration |
| Graph freshness | `graphify update .`, then a scoped `graphify query` | After code edits |

Port 44173 is a proposed test port, not a reservation: preflight availability.
`CI=1` prevents public server reuse and strictPort prevents silent port drift.
Port 4318 is fixed by the graphics config; if occupied, identify the owner and
choose a reviewed isolated override rather than killing an unrelated process.
Record checkout/build manifest digest and matching served assets for both builds.
Public and graphics outputs are distinct (`dist` and `dist-graphics`).

New pure P1/P2 checks must be connected to `graphics:verify`/`graphics:test` so
required CI actually executes them. Existing `npm test` already invokes
`graphics:verify`. Use focused checks while editing, then the full applicable
matrix once at the frozen candidate. Public output must exclude new graphics
entry points, assets, strings and imports; extend the existing exclusion checks.

Before integration, require all jobs from `.github/workflows/ci.yml`, including
the anatomy-candidate job, at the exact candidate. Anatomy changes additionally
require its prepare/build/test workflow locally. Inspect deploy triggers before
main integration; this handoff grants no deployment authority. Keep a verified
branch ready when main integration would deploy. No tag/version bump is planned.

## Execution record schema

Create one record at P0.2; append one section per packet, without private data:
Publish sanitized evidence summaries only. Keep raw browser traces, private
local paths and reviewer transcripts outside public documentation.

```text
Packet / status / user benefit:
Owner run / worktree / started / last updated:
Baseline SHA / candidate SHA or tree digest / lockfile digest:
Scope / changed files / exclusions:
Plan digest / two-round plan receipt / amendments:
Gate | command/environment | baseline | candidate | evidence | owner/prerequisite
Native Safari / VoiceOver / physical touch / installed PWA: result or unverified
Implementation council round 1 and 2 / report digest:
Source integration / candidate CI / post-integration CI / deployment / release:
Failure signature / hypothesis / attempted remedy / new evidence:
Rollback / remaining dependencies / exact next command:
```

Update the canonical queue after each accepted packet. “Prepared” means the
contract is ready; “engineering accepted” requires executed tests; “integrated”
requires source and hosted evidence. No wording here closes clinical, asset,
performance, native-device or publication gates for later phases.

For P0–P2, engineering acceptance requires the applicable automated source,
geometry and Chromium/WebKit checks. Run native Safari checks when accessible;
if unavailable, retain an explicit Safari acceptance hold. Pending native Safari,
VoiceOver, physical touch, native download and installed-PWA checks do not block
isolated synthetic engineering completion, but they block their corresponding
target-surface claims and later dependent P4/P5 acceptance/publication. Never
describe an engineering-complete packet as fully native-accepted while holds remain.
