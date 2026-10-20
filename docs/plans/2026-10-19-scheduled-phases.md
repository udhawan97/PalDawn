# PalDawn: next phases for scheduled implementation

Planning date: October 19, 2026, America/Chicago.
Status: proposed execution queue; implementation has not started.
Canonical checkout: `/Users/umang/developer/github/PalDawn`.

## Purpose and verified starting point

Move from the current conceptual learning app toward one coherent body → heart
→ vessel experience, while protecting learner data and keeping anatomical and
clinical publication gates explicit. Finish existing infrastructure before
adding more disease previews or starting an engine migration.

Planning inspection found:

- Local main and the live remote main both at
  `a02832659e882a2291772e46d7831a9ea6c6d34b`; working tree initially clean.
  `app/package.json` declares 0.6.1. This is source/version evidence, not a new
  release, CI, installed-app, or deployed-site verification.
- No open GitHub issues or pull requests returned for PalDawn at inspection.
  Several older worktrees exist; preserve them and check for unique relevant
  work before starting a duplicate implementation.
- Existing code already supplies ten disease previews, Curriculum 50 discovery,
  a fail-closed hypertension proposal, local study tools, a heart workbench,
  and variable-radius synthetic flow. Do not rebuild those features.
- `DiseasePackProposal` intentionally permits only planning status, no assets,
  null reviewers/digest, and `publicationEligible: false`. It is not a runtime
  manifest for approved content.
- Existing graphics plans name open junction geometry, exterior continuity,
  a shared playback frame, missing anatomy coverage, and measured performance
  as unfinished work. Source was inspected; no app test suite was run for this
  planning task. Earlier test counts are not current acceptance evidence.
- The accessible local automation is WEEKLY CAPO, active on Sundays at noon
  America/Chicago. Its existing global priority order and limit of two
  substantially worked repositories per run remain authoritative. PalDawn
  is eligible work, not a guaranteed selection every week.

Evidence anchors: [vision](../VISION.md), [graphics rebuild](../GRAPHICS-REBUILD.md),
[flow workbench](../VESSEL-FLOW-WORKBENCH.md),
[heart workbench](../HEART-GRAPHICS-WORKBENCH.md),
[curriculum](../CURRICULUM-50.md), [prior recovery handoff](2026-10-08-dev-review-sol-execution.md),
`app/src/data/diseasePack.ts`, `app/src/data/diseasePackRegistry.ts`,
`app/package.json`, and `.github/workflows/{ci,deploy,release}.yml`.
Graphify was queried for roadmap, disease-pack, study, and graphics relationships;
source corroboration governs the conclusions.

## Execution order and size

These are dependency stages, not six weeks of promised delivery. A work packet
is one independently reviewable change that may need more than one scheduled run.
Start at most one new packet per selected PalDawn run. Finish or explicitly park
an existing packet before selecting another. Never reduce acceptance to fit a run.

| Phase | Outcome | Packets / relative effort | Entry condition |
|---|---|---|---|
| P0 | Reproducible acceptance and one durable run record | 2 / small–medium | First selected run |
| P1 | Continuous synthetic branched vessel with safe flow | 3 / large | P0 engineering baseline ready |
| P2 | One deterministic timeline and reliable camera composition | 3 / large | P1 junction accepted |
| P3 | Versioned scene loading and a complete asset review package | 3 / large + external review | P2 engineering accepted; asset inventory may proceed earlier |
| P4 | One complete, accessible cardiovascular candidate journey | 2 / large | P2 + P3 runtime ready; public adoption additionally requires review |
| P5 | Measured acceptance, controlled publication, next-family decision | 3 / medium + external/device gates | P4 candidate complete |

P0 can expose unavailable native/device gates without blocking isolated synthetic
engineering. Those unmet gates stay open and block the dependent acceptance or
publication claim. An unreviewed pack never becomes public merely because the
software stages pass.

## P0 — Establish a dependable execution baseline

**Problem:** historic browser evidence and multiple worktrees make it easy to
repeat completed fixes, test the wrong artifact, or confuse unavailable tooling
with an application defect.

**P0.1 — Reconcile and reproduce.** Read current instructions and this queue,
inventory worktrees/PRs and compare current main to the planning SHA. Identify
already completed packets. In a disposable checkout with synthetic study data,
run the existing public, graphics, provenance, and license checks. Use the
matching browser artifacts; record baseline failures rather than weakening
assertions or substituting an engine silently. Reproduce only relevant
outstanding recovery/download/PWA failures before classifying them.

**P0.2 — Make the next run resumable.** Add one concise acceptance/run record
under `docs/plans/`, linked here, with exact commands, environment, artifacts,
remaining manual checks, current packet and next action. If a reproducible
runner defect exists, repair that narrow cause and test its failure path.
Do not build a new orchestration framework or migrate learner storage.
Include a gate matrix: gate, applicable packet, baseline/candidate result,
evidence, and owner/prerequisite. Mark the engineering baseline ready only when
the required automated engineering checks pass; separately list unavailable
native/device gates and which later acceptance claims they block.

**Acceptance:** clean public and graphics builds; exact stock-browser results
identified by engine/version; two-tab conflict, 150-record capacity, multibyte
backup, modal focus, cache-failure, and PWA handshake contracts remain covered.
Actual native downloads, installed-PWA restart, VoiceOver, and physical touch
have separate results or explicit unverified entries. No test touches personal
study data. A repeat run can locate the exact pending packet without inference.

**Likely scope:** `app/tests/review-*.spec.mjs`, existing PWA/browser harnesses,
`app/playwright*.mjs`, the new run record. Change test infrastructure only when
evidence demonstrates a need.

**Stop / rollback:** if fixtures cannot be safely isolated or dependencies are
unavailable, preserve evidence and record the exact missing prerequisite.
Restore the prior test helper through a scoped revert if a change reduces
coverage or alters assertion intent. No automatic workspace cleanup.

## P1 — Connected synthetic vessel geometry

**Problem:** overlapping closed tubes cannot demonstrate an open junction or
safe particle handoff. Current variable-radius work is useful but incomplete.

**P1.1 — Branch contract.** Extend the existing route/radius model with explicit
branch IDs, parent attachment, junction domain, orientation, radius continuity,
entry/exit ownership, and deterministic seeded routing. Start with one synthetic
Y junction. Define units and tolerances in the packet before implementation.
Reject cycles, absent parents, duplicate IDs, disconnected branches, attachment
outside the parent domain, non-finite values, non-positive radii, zero-length
branches and unsupported radius discontinuities. Define supported junction
angles and radius ratios in the packet and reject unsupported geometry.
Keep the three existing single-route
profiles working.

**P1.2 — Junction surface.** Build a connected lumen and wall with an actual
opening; derive camera and particle paths from the same spatial definition.
Check normals, winding, seams, unintended caps, intersections and finite mesh
data. Do not add deforming walls to the first junction packet.

**P1.3 — Flow handoff.** Move each seeded cell across exactly one branch choice;
use full cell extent plus clearance for wall containment, including bends and
junction transitions. Specify entry/exit fade or occlusion so wrapping is not
visible. Detail changes preserve particle identity for shared instances.

**Acceptance:** independent geometry probes and boundary cases demonstrate
containment through the junction, not just centerline agreement with the same
formula. Identical seed/time yields identical assignments and positions;
backward seek is repeatable; no disappear/reappear gap at handoff; no wall
crossing, NaNs or visible wrap. Browser pixel checks prove motion/pause/seek
and preserve reduced motion, keyboard access and recovery.

**Likely scope:** `app/graphics/flowModel.ts`, `FlowWorkbench.tsx`,
`mesh-builder.mjs`, `verify-flow.mjs`, `graphics/tests/flow.spec.mjs`.
Keep all geometry synthetic and absent from the public app build.

**Stop / rollback:** if a valid open junction cannot pass full-extent probes,
retain the single-vessel workbench and park branch flow. Remove only the new
fixture/entry via scoped revert. Do not rename synthetic geometry as the LAD,
assign physiological branch fractions, or claim validated blood flow.

## P2 — Shared playback and camera composition

**Problem:** separate animation clocks and camera assumptions prevent reliable
scrubbing and consistent explanatory scenes.

**P2.1 — Pure frame contract.** Define a versioned, development-only scene
specification and pure frame resolver using the existing graphics model.
Output shot, teaching time, camera target/pose, visible layers, flow/deformation
phase, caption and source identifiers. Do not wire new clinical content into
the public app. Use one synthetic three-shot example before the full storyboard.

**P2.2 — Playback lifecycle.** All animated consumers read the same resolved
time. Pause/inspect/resume, backward seek, restart, backgrounding and quality
changes cannot advance an independent clock. Loading a required asset pauses
before entry; stale async loads cannot replace the newly selected scene.
Reduced motion uses stable shot changes and retains the same text.

**P2.3 — Framing.** Reuse `cameraFit.ts` and actual transformed bounds. Account
for the scene rectangle left by drawers, captions and controls, in portrait
and landscape. Bound free inspection and provide a clear return-to-journey.

**Acceptance:** compare full resolved state at a timestamp reached directly,
forward, backward and after restart. At minimum cover start/end, exactly on and
either side of every shot boundary, loading/retry, visibility changes and
rapid repeated scene/quality changes while loading.
Use a documented numeric tolerance only for rendering arithmetic; IDs/order
remain exact. Test 320px portrait, phone landscape and desktop, with overlays
open, reduced motion and text mode. The selected object remains within the
unobscured viewport without near-plane clipping.

**Likely scope:** new small modules under `app/graphics/`, existing workbench
controls, `cameraFit.ts`, graphics behavior tests. Public state stores are
integrated only in a later accepted packet; avoid parallel timeline stores.

**Stop / rollback:** if any animation remains clock-independent or a failed
load advances the narrative, keep the old standalone viewer entry. Revert the
new integration without changing study storage or existing routes.

## P3 — Scene-pack integrity and asset readiness

**Problem:** a planning dossier cannot safely serve as an executable asset
manifest; a polished render also does not resolve missing rights or anatomy.

**P3.1 — Separate runtime manifest.** Preserve the existing proposal schema.
Define a distinct development scene-pack contract with immutable pack/version,
digest, app compatibility, units, coordinate frame, bounds, anchors, LOD budgets,
sources, attribution, scoped review records, and text/reduced-motion alternatives.
Use synthetic fixtures to implement validation; reject incompatible versions,
duplicate/unknown IDs, absent references and digest mismatch before activation.
Manifest integrity is not medical approval.

**P3.2 — Bounded loader.** Load only the active scene and declared transition
neighbors; cancel superseded requests and dispose unused resources. Keep the
previous usable scene or text fallback on corruption, timeout, missing bytes
and WebGL loss. Set conservative byte/texture/residency ceilings before the
first runtime pack loads, including transient overlap of old and replacement
scenes. Refine them from measured exports before enabling additional packs.
No arbitrary remote
pack URLs, new backend or new dependency without the existing adoption process.

**P3.3 — Review package.** Reconcile the existing heart/chest coverage ledger
with the seven-shot storyboard. For every displayed object, record editable
source, creator, exact license/lineage, changes, digest, missing geometry,
assigned review scope, and front/back/side clay and material views. Gather
geometry corrections from an actual qualified reviewer when available.
Do not invent a reviewer or contact anyone without authorization.

**Acceptance:** malformed, corrupt and unavailable synthetic packs fail closed;
rapid switch/retry cannot leak stale assets or exceed the recorded residency
limit; public build excludes candidate entries/data. Asset checklist names
all missing chambers/valves/chest/route details used by the storyboard.
Engineering can pass while the asset/clinical columns remain blocked.

**Likely scope:** development loader and manifest modules, existing graphics
manifest/build tools, `pipeline/provenance/`, asset coverage documents.

**Stop / rollback:** unavailable rights or qualified review blocks adoption,
not honest preparation. Keep the last known usable pack and manifest; no
replacement of immutable published assets. No purchases or vendor engagement.

## P4 — Complete the cardiovascular candidate

**Problem:** isolated high-detail scenes do not yet form a coherent educational
journey from location to interior and back.

**P4.1 — Compose the storyboard.** Integrate locate, reveal, exterior inspection,
pump cutaway, surface route, magnified entry, and return into the shared
timeline. Use only available assets and label missing shots as unavailable;
do not substitute decorative geometry and mark a shot complete. Preserve the
explicit educational cutaway and scale/time conventions. A proposed 90-second
duration is editorial pacing, not biological elapsed time.

**P4.2 — Usable study route.** Provide captions, both reading depths, text-only
equivalent, sources/review status, keyboard controls, reduced-motion shot
navigation, pause/inspect/resume and loading/error recovery. Preserve the
existing ten conceptual previews, deep links, study notes and backups.
Use existing authored content where possible. Any new medical statement or
visual implication requires refreshed primary-source evidence and scoped
qualified-human review before public adoption.

**Acceptance:** uninterrupted playthrough plus fixed-time views; complete
keyboard route and actual Safari interaction; missing asset, back/forward,
quality change, resize, WebGL loss, reload, and return-to-context work.
Both reading depths refer to the same shot and causal meaning. Unreviewed
geometry/content remains a development candidate excluded from public output.
All seven shots must be functional and content-complete to mark P4 complete.
Unavailable shots keep the phase partial; independently useful engineering
and fallback behavior may be accepted without closing the whole journey.

**Likely scope:** graphics journey entry and controls first; public
`HumanSystemsScene.tsx`, `VoyageScene.tsx`, `SceneCanvas.tsx`,
`DiseaseExplorer.tsx` and state integration only after the adoption gate.

**Stop / rollback:** if review is pending, finish the synthetic candidate and
record exactly which shots cannot be accepted. Public adoption is a separately
reviewed packet and must retain the existing conceptual/text route as fallback.
No storage migration is part of this phase.

## P5 — Quality proof and controlled delivery

**P5.1 — Measure and refine.** Establish clay/material comparisons and measure
the whole journey, especially transitions, on named desktop and physical-mobile
targets. Record hardware, OS/browser, SHA, viewport/DPR, tier, network profile,
warmup, sample duration, at least three runs and raw results per target.
Report each run's p95; do not hide a failed run by averaging.

Existing targets remain: desktop/mobile p95 ≤16.7/33.3 ms, triangles ≤1.5M/400K,
draw calls ≤300/120, core JS ≤512,000 gzip bytes, first interactive scene
<5s/<8s on the declared fast-4G profile. Define first-interactive measurement
and pack residency limits in the packet. These are targets, not current results.
Tune lighting/materials/LOD only against a measured problem; maintain semantic
identity across quality tiers. Native VoiceOver, touch and installed-PWA
acceptance require actual target-surface evidence.

**P5.2 — Integration and delivery.** Revalidate every content/asset review,
provenance/license gate, compatibility case, production build and required CI
at the exact candidate. Inspect deployment triggers before merge. Public-app
changes on main can trigger Pages automatically. Source integration, Pages
deployment, release publication and installed acceptance are separate states.
Follow the existing automation's release authority only when meaningful value
and all required gates justify it. This plan itself authorizes no release tag.
Verify tag/asset/site identity and post-delivery behavior where applicable.
P5.2 owns the separately reviewed public-adoption packet described in P4;
keep it separate from candidate engineering. Require all seven shots complete
and accepted, plus the applicable content, asset, native-target, performance
and deployment gates before public exposure. P5.1 may gather measurements on
a partial candidate, but must label them partial and cannot close whole-journey
acceptance or authorize the next-family decision.

**P5.3 — Next-family decision.** After the cardiovascular template passes,
choose one next organ family from existing curriculum coverage and source/asset
readiness. Carry its own dossier, geometry, performance, accessibility and
qualified-review gates. Do not automatically expand all forty planned entries.
Adaptive retrieval learning and WebGPU/TSL remain separate future proposals:
neither is necessary to finish this vertical slice.

**Rollback:** retain known-good source and artifact identifiers. Revert the
scoped adoption and redeploy through the normal checks when authorized; do not
retag or overwrite immutable releases. No learner-data reset. If migration is
later required, it needs a separate reviewed compatibility/rollback contract.

## Verification commands and evidence rules

Inspect current scripts before every run. Provision only permitted dependencies
using the pinned lockfile and matching browser versions. Use disposable runtime
state, synthetic data and available isolated profiles. Do not use another
worktree's private acceptance data. Commands below run in `app/`:

```sh
npm test
npm run test:browser
npm run pwa:test:browser
npm run graphics:build
npm run graphics:test
npm run licenses
```

The public Playwright config can reuse an existing local server. Use a fresh
available port and verify that the server serves the exact candidate build,
or explicitly disable reuse in the isolated runner. Never accept results
against an unidentified process that happens to occupy the expected port.

For public integration, repeat the affected public build/browser checks with
`VITE_BASE_PATH=/PalDawn/`; `npm test` includes the build. The graphics build
uses its own config and root path. PWA tests require the historical baseline
commit referenced by their harness, so preserve Git history. Run provenance
from the repo root with `node pipeline/provenance/run-checks.mjs`.
Anatomy-specific changes additionally require the existing prepare/build/test
candidate workflow; do not infer candidate coverage from public tests.

Run focused checks during development and required full suites for integration.
Record baseline and candidate failures separately. Missing binaries, device
access or reviewer availability are unmet gates, not passed tests. Native Safari
acceptance uses the installed Safari Browser Use plugin and safe test fixtures;
Playwright WebKit is an additional regression engine, not native Safari proof.
After code changes run `graphify update .` and a scoped query, corroborated
against source. Refresh before release; update failure blocks release.

## Council gate for every packet

Before implementation, freeze a packet containing user benefit, source
baseline, touched boundaries, exclusions, dependencies, acceptance cases,
commands, rollback and stop conditions.

Run exactly two full council rounds with four independent roles in each:
Evidence, Coverage, Risk and Outcome. Reviewers inspect the same packet
independently; do not feed them other reviewers' comments. With limited
concurrency, run roles in batches. They must each return APPROVE,
APPROVE_WITH_NITS or BLOCK with concrete corrections.

Round 1 challenges the packet. Reconcile against evidence and revise it.
Round 2 checks the revised packet. Resolve all valid blockers; obtain targeted
acceptance for any material blocker fix after Round 2. If actual reviewers
are unavailable, hold the packet instead of manufacturing a council result.
No council can self-certify clinical/anatomical review.

After implementation, apply the same two-round gate to the actual diff,
behavioral evidence and completion report. Bind acceptance to candidate SHA
or tree digest and report digest. New material changes invalidate affected
acceptance. A council-approved roadmap is not an implementation approval.

## Scheduling, handoff and finite-run rules

Use the existing weekly CAPO run; retain its cadence, status, model and
notification settings. Do not create a competing PalDawn schedule. This queue
supplements CAPO's global prioritization and repository limit.
Daily Elf and Mobster saved instructions were not inspected here; this plan
does not claim to have updated them.

Every selected run:

1. Recheck current source, remote, PRs, worktrees and the latest packet receipt.
   Reconcile completed work before choosing a packet. Preserve unrelated work.
2. Confirm no other run owns the same packet. Use the durable packet record
   with run identity, worktree, start time and status. A stale or ambiguous
   owner requires reconciliation; never forcibly take over an active checkout.
   Reread ownership immediately before claiming the packet. A document is not
   an atomic lock; serialize claims through the existing run coordinator or
   park the packet if concurrent ownership cannot be resolved.
3. Resume the current packet or choose the first ready one. Use a dedicated
   worktree if implementation could overlap other work. Review its plan before
   editing. Implement one bounded packet, then validate and review its result.
4. At the run budget boundary, preserve a coherent candidate and precise next
   command. Do not merge incomplete work, rush gates or start a second packet.
5. Update this queue's status table and the linked run record with baseline
   SHA, candidate SHA/tree digest, scope, actual command outcomes, evidence
   locations, council summary, integration/CI/deployment/release states,
   blocker owner/prerequisite and next action. Store synthetic fixtures only;
   keep private logs and reviewer transcripts outside public documentation.
6. For the same failure, record signature, cause hypothesis, prior attempts
   and new evidence. Do not rerun an unchanged failed approach. If blocked by
   an external prerequisite, work only on an independently ready packet or
   leave the repository unchanged. Report meaningful progress, failure,
   completion or required owner action; avoid unchanged-status noise.

Keep this document as the canonical queue; other plans remain design evidence.
Add links, not a second competing roadmap. Do not send messages to other chats
or people as part of the handoff without explicit authorization.

| Phase | Initial state | Next action |
|---|---|---|
| P0 | Ready for packet planning | Reconcile current work and reproduce baseline |
| P1 | Waiting on P0 engineering baseline | Specify one synthetic Y junction |
| P2 | Waiting on P1 | Specify pure frame contract |
| P3 | Asset inventory ready; runtime waits on P2 | Audit missing coverage; preserve proposal schema |
| P4 | Waiting on P2/P3 | Compose candidate only after prerequisites |
| P5 | Waiting on P4; human/device gates open | Measure and verify before publication |

## Proposed scheduled-run instruction addition

For PalDawn, use `/Users/umang/developer/github/PalDawn` and read
`docs/plans/2026-10-19-scheduled-phases.md` as the canonical next-phase queue.
Preserve the global priority order and limit of two substantial repositories.
When PalDawn is selected, reconcile completed work and packet ownership, then
resume one pending packet or implement the first ready packet. Complete its
two-round, four-role plan council before editing and its implementation council
before integration. Record exact evidence and the next action in the queue's
linked run record. Keep synthetic graphics and unreviewed anatomy/content in
development-only builds; never treat council approval as qualified medical
review. Do not repeat completed phases, bypass unavailable gates, create
duplicate schedules or change the existing cadence. Notify only for meaningful
progress, completion, failure or required owner action.
