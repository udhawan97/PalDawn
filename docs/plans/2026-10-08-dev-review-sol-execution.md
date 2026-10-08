# PalDawn review fixes — Sol execution handoff

Status: all six selected fixes implemented and independently peer-reviewed. Local acceptance passes; production verdict remains **Hold**, pending the named browser/download/native gates. Changes are uncommitted in the delivery checkout.

## Scope and starting point

The user selected all six Fix candidates from Dev Review run `20261007T214108Z-03181fd9` and asked for implementation plus an executable Sol plan. Evidence baseline: `f22c8bbc71fbc023a9ccfc8ff8336226073c8be5`. Canonical repository: `/Users/umang/developer/github/PalDawn`; the old Documents checkout is empty. Delivery checkout: `/Users/umang/developer/worktrees/PalDawn-review-20261008` (detached at baseline; uncommitted changes). Preserve all other worktrees.

Authority covers these six fixes and their regression checks. Research items, medical validation, candidate Anatomy changes, dependency downloads, commits, merges, pushes, releases and deployment are separate. Public product remains an unreviewed educational synthesis; Anatomy remains a local candidate.

## Work packages and ownership

| ID | Outcome and owned files | Worker → peer | Dependencies |
| --- | --- | --- | --- |
| S1 / DR-03181fd9-001 | Atlas conflict write veto; `app/src/state/atlasStudy.ts`, `app/scripts/test-atlas-study-safety.mjs`, `app/tests/review-atlas-safety.spec.mjs` | Architecture → Production | Baseline; precedes S2 in shared files |
| S2 / DR-03181fd9-002 | Refuse a new 151st record without eviction; same files | Architecture → Production | S1 |
| S3 / DR-03181fd9-003 | Shared finite backup byte limit; `app/src/platform/localData.ts`, `app/src/ui/FlightDeck.tsx`, `app/scripts/test-backup-size.mjs`, oversized test in `app/tests/foundation-plus-3.spec.mjs` | Product → Architecture | Baseline; precedes S5 in shared UI |
| S4 / DR-03181fd9-004 | Best-effort service-worker caching; `app/public/sw.js`, `app/scripts/test-pwa-lifecycle.mjs`; package test wiring | Production → Product | Baseline; independent of S1/S3 |
| S5 / DR-03181fd9-005 | Modal keyboard ownership; `app/src/ui/AtlasStudyDesk.tsx`, `app/src/ui/CurriculumCatalog.tsx`, FlightDeck if necessary, `app/tests/review-recovery-modal.spec.mjs` | Product → Architecture | S3 |
| S6 / DR-03181fd9-006 | Body dialog accessible name; FlightDeck and same browser spec | Product → Architecture | S5 |
| G1 | Integrated tests, graph refresh, diff review, private ledger/report, Sol handoff | Senior; all workers reconfirm final digest | S1–S6 |
| G2 | Fresh four-role, two-round council | Evidence / Coverage / Risk / Outcome | G1 exact tree and report |

Exactly three specialist developers; senior integrates. No concurrent writers to shared files. Each worker has a disposable checkout/runtime. Two correction loops maximum per slice; unresolved slices stop as Blocked/Research. Required order is worker → senior → independent peer → senior, with all receipts bound to the accepted candidate digest.

## Acceptance contracts

### S1 — Preserve conflicted Atlas drafts

Reproduce: fail A's note write; B writes different durable work; deliver B's storage event to A; restore storage. A's subsequent note, position, narration, and `persist()` calls must leave B's bytes unchanged. A can continue editing and export its draft. PWA preparation must reply `ready: false`. Deliberate reload after copying/exporting adopts durable state; ordinary single-tab retry and healthy update remain functional. Scope is public Atlas only. Do not merge records automatically or add a new persistence framework. Roll back if any write path bypasses the conflict veto, draft export loses content, or healthy retry regresses.

### S2 — Preserve all 150 existing records

Seed 150 valid records, including unavailable IDs with private notes. Adding record 151 fails with actionable feedback and leaves memory, storage and full-study export intact. Existing entries remain editable; removing one and then adding a new one succeeds. Preserve defensive normalization of oversized external input. Do not silently evict or invent unavailable-record deletion UI. Stop if product policy needs a destructive migration.

### S3 — Make valid backups restorable

Exercise maximum record/note counts with multibyte and worst-case JSON-escaped text. Export must fit a single shared finite byte limit, without note truncation. Test compact input below the old limit whose pretty export exceeds it; preview, confirm and reload must preserve normalized data. Versions 1–3 stay accepted. A file over the new limit is rejected before `File.text()` or any local mutation; parser also enforces the byte bound. Invalid JSON and explicit cancel remain safe. Stop if schema migration or unrelated backup semantics are needed.

### S4 — Cache failure must not discard a healthy response

For navigation and same-origin assets, inject cache open and write rejection after fetch200: response status/body survive. Test cache read rejection, normal cache hit, true network failure/offline shell and unavailable fallback. Preserve non-GET/cross-origin bypass, cache generation and update handshake. VM injection is not installed-PWA/quota/device proof. Roll back on update readiness, stale-generation, or offline fallback regression.

### S5 — Top modal owns keyboard input

At 320px and desktop, open Study Desk from #study and catalog from a supported opener. T, N, ?, slash and arrow keys must not change background state/focus. Tab and Shift+Tab wrap. Escape closes only the active modal and restores the visible opener. Inputs still accept text and modal/native control keys work. Exact-step selection and Back return to the intended route/opener. Preserve focused reading and nested dialog behavior. No broad keyboard shortcut disabling outside a modal.

### S6 — Body dialog is named

Home → Explore body and direct #body resolve `dialog` named “Two body views, with different jobs.” Narrow mode remains modal; close restores focus; desktop and other panel names remain correct. Use role/name assertions; do not claim screen-reader or WCAG certification from DOM checks.

## Safe execution and commands

Inspect scripts/config before executing. No dependency install or external egress by default. Keep existing dependency versions. Use fictional local data, separate disposable profiles, and an OS boundary denying external networking and user-state access while allowing required loopback. Never repurpose HOME. Never run writer-capable acceptance on the installed app, personal browser profile, or primary checkout.

This session uses a private macOS sandbox runner per worker and an integration runner. The runner starts commands in `source/app`, with clean explicit environment, task-local temp/cache/config/data, unchanged HOME, and external-network denial. Its location and exact current evidence are in the clone-local review ledger. If those temporary resources expire, recreate the same containment; do not silently drop it.

From an equivalently contained disposable `app/` checkout:

```sh
VITE_BASE_PATH=/PalDawn/ npm test
node scripts/test-atlas-study-safety.mjs
node scripts/test-backup-size.mjs
VITE_BASE_PATH=/PalDawn/ npm run test:browser -- tests/review-atlas-safety.spec.mjs tests/review-recovery-modal.spec.mjs tests/home-navigation.spec.mjs
VITE_BASE_PATH=/PalDawn/ npm run test:browser -- tests/disease-atlas.spec.mjs tests/foundation-plus-3.spec.mjs
VITE_BASE_PATH=/PalDawn/ npm run pwa:test:browser
```

The full browser matrix requires matching Playwright artifacts already installed or separately authorized provisioning. Do not relabel an executable override as the stock gate. The PWA harness needs Git history containing `38294634d9f35778b2519bc9a33f95e9bbcfbc20`, and builds baseline plus candidate under its temp root; a source-only archive is insufficient.

Then run provenance checks from repository root (`node pipeline/provenance/run-checks.mjs`) and license inventory (`npm run licenses` from app). Graphify: `graphify update .`, then a scoped query about Atlas persistence/modal/cache paths; inspect graph changes and preserve graph memory/reflections. Stale graph is a merge-gate failure. Never install a watcher/hook.

## Baseline evidence and outstanding gates

At baseline, typecheck/build/deterministic tests/provenance/license inventory passed. Explicit cached Chromium1228 Home/reader/audit sample passed 12 checks. Broader substituted-engine run: 22 passed, 7 failed (four canceled-download paths, two First Light timeouts, one backup-import failure). These are not waived or attributed to the app without diagnosis. A bounded replay with explicit download/artifact directories still canceled the Atlas backup download.

Stock WebKit expected revision2336 was unavailable; cached2311 failed the PushAPIEnabled protocol command. No native Safari, VoiceOver, physical touch, installed-PWA migration or hosted validation is established. Obscura refused loopback; contained Chromium was the safe runtime fallback, with engine substitution explicit. Native Safari acceptance needs an isolated safe profile/account and remains a separate gate.

## Verified implementation checkpoint

- S1/S2: store-owned conflict veto covers record, position, narration and PWA persist; capacity rejects new records without eviction. Four interface tests pass; baseline store fails three of those four. Real two-tab browser preparation blocks conflicted update and permits ordinary retry/reload resolution.
- S3: shared 2 MiB pre-read/parser guard. Complete 150-record plus 5-workspace-note fixtures round-trip at 594,425 bytes (multibyte) and 1,152,425 bytes (escaped controls). Maximum and compact-near-old-limit backups pass real preview/confirm/export-payload/reimport/reload checks. Native download filesystem completion is still unverified.
- S4: network responses survive cache open/write/read failures; existing worker update/generation suite plus new cache/offline/request regressions pass.
- S5/S6: modal shortcut ownership, focus wrapping/restoration, exact Study-step history, Body dialog naming and other drawer labels pass at narrow and desktop viewports.
- Integrated `npm test` passes, including both new scripts. Gzip JavaScript is 387,430 bytes against the existing 512,000-byte budget. Provenance passes; offline license inventory is 95 packages, 93 allowed, 2 review-tier MPL, 0 denied.
- Integrated explicit Chromium1228 run: 17 passes (13 new recovery/modal cases and 4 Home/navigation cases), plus 25 neighboring catalog/disease/reader/print passes. Total: 42 scoped browser passes. The neighbor run explicitly excludes three known failing native-download cases; this is not the stock browser matrix or closure of the prior seven failures.
- Graphify code update and affected persistence/cache queries pass. Graph has 1,316 nodes / 2,162 edges; parser reports 49 zero-node source files (largely data/fixture files). It is navigation evidence, not exhaustive correctness proof. No semantic claim is made for this new handoff document.
- Separate production and product peers approved the persistence and worker slices; architecture peer approved backup/modal/name slices. Final accepted digest and council receipt are stored in the private ledger; verify them before relying on this checkpoint.

## Research handoff — evidence gathering only

- Candidate Anatomy: reproduce condition → Anatomy → a different linked condition in a safely prepared local fixture; verify target hash/step and ordinary Back. Source suggests original history may win. No candidate code change without reclassification/selection.
- Candidate Anatomy conflict analogue: source-only missing write veto similar to public Atlas; requires its own runtime failure and selection. It was deliberately excluded from DR001.
- Atlas warning visibility: fake successful share then fail storage; compare `actionStatus` precedence, targeted warning and global banner. Promote only a consequential reproduced loss of warning, not source speculation.
- Supported-browser gates: provision matching artifacts only with applicable authority, replay stock suites and installed-PWA harness in isolation, then native Safari/VoiceOver and physical touch. Keep local, provider, hosted and medical claims separate.

## Sol continuation protocol

1. Read this plan, current diff/status, and the ledger using the installed dev-review helper. List runs, then show run `20261007T214108Z-03181fd9`. Verify actual revision, accepted candidate digest and report digest; do not trust a stale completion claim.
2. Keep completed fixes. Re-run only checks invalidated by new code/environment or those still pending. Resolve failures against baseline, preserving assertion intent; never weaken tests to manufacture green.
3. Diagnose unresolved browser gates within safe fixtures. If matching browser provisioning or a target surface cannot run safely, record the exact blocker; ask only for the concrete missing authority after preparing the rest.
4. Any new pre-existing defect outside the six findings needs a separate verified finding/selection before repair. Regressions introduced by these fixes are in scope.
5. Bind worker/senior/peer/senior and acceptance receipts to the exact final tree digest. Update private report and obtain four independent reviewers in each of two council rounds before sharing revised results.
6. Call Merge-ready only when selected acceptance and all required production gates pass. A plan or local build is not release approval. Preserve changes uncommitted until exact integration authority is present.

### Copy/paste prompt for Sol

> Continue PalDawn Dev Review run 20261007T214108Z-03181fd9 using docs/plans/2026-10-08-dev-review-sol-execution.md in /Users/umang/developer/worktrees/PalDawn-review-20261008. Inspect current work and receipts first. Preserve the six implemented fixes and complete any remaining named acceptance/production gates; preserve verified work and all unrelated worktrees. Use the dev-review specialist/peer/council workflow and safe disposable runtimes. Do not expand into research, commit, merge, push, release, deploy or download dependencies without the applicable authority. Report exact verified results and remaining blockers.
