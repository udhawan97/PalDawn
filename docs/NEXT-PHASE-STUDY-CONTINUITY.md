# Next phase: Study Continuity

Status: public-app slices 1–4 implemented on `stay-calm-its-codex/study-continuity`; Anatomy Lab persistence remains a follow-on. This document does not authorize a release.

## Recommendation

Make the existing disease previews useful across repeated study sessions. A learner should be able to open an exact mechanism step, save an observation, return later, compare the two existing explanations, and export selected study material with its sources.

Deliver four public-app slices in order. Treat Anatomy Lab persistence as a separate follow-on. Confidence below means implementation confidence based on current source, not medical validation or a measured delivery estimate.

| Order | Feature | Learner benefit | Confidence | Relative effort |
|---|---|---|---|---|
| 1 | Exact step links | Open, copy, and share a specific condition/step | High | Small–medium |
| 2 | Saved study and resume | Keep notes, saved steps, personal checkpoints, and place | Medium–high | Medium–large |
| 3 | Focused reading and comparison | Read the route comfortably and compare explanation depth | High | Medium |
| 4 | Source-linked study export | Take selected work into Markdown or a printable study sheet | High after slice 2 | Small–medium |
| Later | Anatomy study persistence | Retain the research queue and saved structures across reloads | Medium–high | Medium |

If reducing scope, finish slices 1–2 completely before adding more. Persistence includes recovery and portability; these are part of the feature, not deferred polish.

## Verified starting point

Inspected local `main` at `62158f0c35227626d0863949fedb153a9db35886`. Working tree was clean before this planning document. No current hosted-site, CI, runtime, or medical-source validation was performed for this plan. Recheck the starting revision before implementation.

- `app/src/data/diseases.ts` supplies existing disease IDs, stable step IDs, Plain English/Clinical terms, cautions, named structures, and source IDs. Reuse these fields without adding medical prose.
- `app/src/state/atlas.ts` keeps explorer state in Zustand and history state. It updates the existing URL without encoding a shareable disease/step route.
- `app/src/platform/localData.ts` persists First Light settings, position, bookmarks, and workspace. Its note/checkpoint validation is tied to First Light stage IDs. It already has reset generations, interrupted-transaction recovery, and backup schemas 1/2.
- `app/src/ui/FlightDeck.tsx` coordinates history/hash handling, pending saves, and PWA update preparation. New Atlas persistence must join this lifecycle.
- `app/src/ui/DiseaseExplorer.tsx` already supports source navigation, a scene-free route, and switching explanation depth. A reading feature should extend these, not create another fallback system.
- `app/src/platform/share.ts`, `downloads.ts`, and `study.ts` already provide sharing, downloads, and First Light study export patterns.
- Anatomy Lab's reading queue and per-reference saved structures live in module/component memory in `app/src/anatomy/AnatomyStudy.tsx`. `ResearchDesk.tsx` already exports its session queue.
- Anatomy Lab remains a separate local preview. Public-build exclusion and qualified-review requirements remain in force.

Graphify navigation used existing vocabulary: learner, workspace, reading, study, progress. Findings above were corroborated against source; the graph query was a navigation aid.

## Slice 1 — Exact step links

**Experience:** “Copy link to this step” opens the same condition, authored step, and valid highlighted structure in a fresh tab. Reuse native sharing with the existing copy fallback.

**Implementation contract**

- Use a distinct hash namespace such as `#atlas/<disease-id>/<step-id>` with an optional validated structure parameter. Preserve legacy First Light `#stage/...` routes and the `/PalDawn/` base path. Do not add a routing dependency.
- Build/parse routes in a small pure module. Serialize IDs, never array indexes or displayed labels. Validate membership against the bundled catalog; a structure must belong to the selected step.
- Treat the URL as the explicit destination. A valid incoming route takes priority over any saved resume position.
- Opening the explorer pushes one history entry; step changes replace that entry, preserving today's bounded history behavior. Back/Forward restores the route. Closing a direct-entry link returns to the in-app overview rather than navigating away from the site; only Back an entry demonstrably created by this app session.
- Invalid/removed targets show a concise unavailable-link message and a safe route to the overview. Do not silently open unrelated content. Malformed percent encoding must not throw.
- Shared URLs contain only route fields, never notes, local checkpoints, arbitrary query strings, or recovery flags. Cancelled native sharing is not an error.

**Acceptance**

1. A copied link opens the exact step in a fresh context at both `/` and `/PalDawn/`.
2. Direct-entry close, app-open close, Back/Forward, search arrivals, and legacy stage links behave consistently.
3. Invalid disease/step/structure IDs cannot crash the app or select an unrelated structure.
4. The route remains usable without WebGL, with reduced motion, and by keyboard.

**Primary seams:** `state/atlas.ts`, history effects in `ui/FlightDeck.tsx`, `ui/DiseaseExplorer.tsx`, `platform/share.ts`; tests near `tests/disease-atlas.spec.mjs` and `scripts/test-atlas-wayfinding.mjs`.

## Slice 2 — Saved study and resume

**Experience:** Each disease step offers Save, a private note, and an explicit “Mark studied” control. A compact “Your study” panel lists saved steps and provides “Continue where you left off.”

**Scope and data**

- Store one last Atlas position and bounded per-step records keyed by disease ID plus step ID. Reuse the 1,200-character note limit. Bound record count and import size; no unlimited session history.
- Keep saved state, notes, and personal checkpoints independent. Unsaving a step does not erase its note. Reaching the last step does not mark the route studied or imply mastery.
- Show notes and saved/studied filters within a single panel. Add one compact resume action to the overview; do not redesign the landing page or add streaks, scores, or gamification.
- Persist narration preference. Resume is user-triggered on a normal visit and never overrides an explicit deep link. Resume into a paused/non-rotating presentation.
- Create a separate typed Atlas record rather than broadening First Light stage validation to arbitrary strings. Register its storage with the existing transaction/reset/export/recovery mechanisms; do not write directly to localStorage from UI components.
- Extend backup export to a new schema version (currently 2; proposed 3), retaining readers for versions 1/2. Import remains preview-then-replace. The preview explicitly states which scopes will be replaced; legacy backups have an empty Atlas scope. Offer backup export before replacement through the existing flow.
- Handle existing pending reset/import receipts deliberately: old receipts omit the new key. Preserve their recorded intent; never classify all old receipts as corrupt simply because the key list grew. Add migration fixtures before changing this contract.
- Keep bounded unresolved records recoverable/exportable if content IDs disappear. Label them unavailable; never attach notes to a different step or silently discard them on load.
- Join PWA update preparation and pending-save checks. Failed writes leave a recoverable in-memory draft with a visible unsaved state; never show “Saved” until storage succeeds.
- Cross-tab policy: detect an external change before replacing an edited record. Preserve the local draft and offer reload/copy recovery; no silent overwrite or stale-data resurrection after reset/import. Do not build a general synchronization engine.

**Acceptance**

1. Save/note/mark studied, switch conditions, reload, and resume: all targets and values are correct.
2. Export/import round-trips Atlas and existing First Light work. Legacy backup replacement has an accurate preview and deterministic result.
3. Quota denial, malformed data, unknown IDs, interrupted reset/import, and a second stale tab cannot silently lose or resurrect work.
4. PWA update with an unsaved draft is blocked; successful save permits update and restores work afterward.
5. Notes render as text, never HTML; notes and progress never enter URLs or diagnostics. Keyboard focus returns correctly when the study panel closes.

**Primary seams:** `platform/localData.ts`, `platform/pwa.ts`, `ui/FlightDeck.tsx`, `state/atlas.ts`, a small Atlas-study state module and panel. Reuse existing transaction tests rather than replacing the storage architecture.

## Slice 3 — Focused reading and comparison

**Experience:** A “Read this pathway” view presents the existing steps in order. Learners can choose Plain English, Clinical terms, or Compare, and return to the corresponding 3D step.

- Render existing authored strings and their exact source links/cautions. No generated summaries, new definitions, scored questions, or inferred cross-disease comparisons.
- Desktop Compare presents both tracks side by side; narrow screens stack them with clear labels and reading order. Keep step selection synchronized with the explorer.
- Keep save/note/checkpoint controls consistent with slice 2. Reuse the same underlying record and component behavior.
- Reuse the existing text/renderer lifecycle so reading does not require a running 3D canvas. Do not change the user's global motion/quality preference merely by entering reading mode.
- Preserve caution and pending-review copy near the relevant content. Provide one clear return action and restore the selected step/focus.

**Acceptance:** Both tracks match bundled content exactly; changing reading mode cannot change step or lose a draft; sources and cautions survive every mode; usable at 320px, at 200% zoom, with keyboard and without WebGL. Check actual native Safari in addition to Playwright WebKit.

**Primary seams:** `ui/DiseaseExplorer.tsx`, `App.tsx`/existing renderer selection only as needed, `styles.css`, existing disease data. Extract only components shared by this feature; no whole-app refactor.

## Slice 4 — Source-linked study export

**Experience:** Export selected saved steps or the current pathway as Markdown; open a print-friendly study sheet using the browser's print function.

- Include condition/step titles, selected existing explanation track(s), exact step-linked sources, cautions, and the unreviewed educational status.
- Private notes are opt-in, default off, with a preview indicating whether they are included. Personal checkpoints are labeled as self-study marks.
- Show unavailable saved targets and their recoverable notes explicitly. Do not substitute current text from another target.
- Reuse download helpers. Build print styling over the reading content; no PDF library, backend, automatic external fetch, or new content license adoption.
- Keep JSON backup distinct from the study export: Markdown/print is for reading, JSON is for restoring local data.

**Acceptance:** Only selected material is exported; source IDs resolve to the correct links; private-note defaults are honored; Unicode and Markdown-like note text are safe; print preview is legible without clipped passages or navigation controls. Verify one actual download and native Safari print preview.

**Primary seams:** a bounded Atlas export function beside `platform/study.ts`, `platform/downloads.ts`, the study panel, and print CSS.

## Follow-on — Persist Anatomy Lab study work

Implement only after the public phase passes. Persist the reading queue and per-reference saved concept IDs; add unread/read marks, move up/down controls, and a scoped clear action. Camera pose and full viewer/session restoration are out of scope.

- Keep this feature under the Anatomy preview boundary. Public builds must not import the research catalog, anatomy code, or prepared packs through shared storage validation.
- Store identifiers and status only. Validate concept IDs after the matching reference inventory loads; distinguish “inventory not loaded” from “concept unavailable.” Never map male/female structures by name.
- Provide explicit Anatomy backup/export/clear controls and document their scope. Reuse existing recovery primitives where safe without creating public-build anatomy imports. Test same-origin reset/update behavior before claiming integration.
- Preserve unavailable IDs for recovery; storage failure retains the session queue with an honest status. Existing source attribution and organ/system association labels remain intact.
- Verify queue retention across reload/reference switches, ordering, unavailable packs, failed storage, and default-build exclusion. Update the docs that currently promise session-only storage.

## Defer from this phase

New disease lessons or drug guidance; AI answers/tutoring; scored medical assessment; additional anatomy assets or public anatomy publication; physiological simulation; a graphics-engine rebuild; cloud accounts/sync; live PubMed ingestion; new dependencies. Each adds uncertainty beyond the verified navigation/study seams. Reviewed clinical content remains a separate human-review workstream.

## Execution and verification for Sol

1. Recheck repository instructions, branch status, current source, and Graphify. Start a branch/worktree with the `stay-calm-its-codex/` prefix; preserve unrelated work.
2. Establish the existing baseline. Implement slices 1–4 sequentially, with bounded commits. For slice 2, settle schema/receipt compatibility and failure tests before adding the UI.
3. Add behavioral tests for the acceptance criteria. Cover new pure route/storage/export helpers with focused deterministic checks and the full learner flow with the existing browser suite.
4. From `app/`, run `VITE_BASE_PATH=/PalDawn/ npm test` and `VITE_BASE_PATH=/PalDawn/ npm run test:browser`. Browser configuration currently blocks service workers, so it cannot establish update safety by itself. Extend/run the dedicated `scripts/test-pwa-browser-lifecycle.mjs` harness for the new persistence behavior; report browser and harness coverage separately.
5. From the repository root, run `node pipeline/provenance/run-checks.mjs` and `git diff --check`. Update the getting-started guide and feature documentation to match implemented behavior.
6. Run Graphify incremental update after code changes and corroborate a scoped query. Before any separately authorized release, a failed refresh is a release blocker under project instructions.
7. Use the prescribed Obscura-first UI workflow, falling back to Safari if necessary. Final native Safari acceptance should cover exact links, notes/resume, recovery, reading/compare, real export, and print preview. Check narrow layouts, 200% zoom, reduced motion, and no-WebGL behavior. Emulation does not establish physical-device acceptance.
8. Report implemented scope, tests, native acceptance, and remaining limitations. Do not tag, release, deploy, push, or merge based solely on this planning request; pushing `main` can trigger Pages publication.

Completion scenario: open an exact diabetes step link, compare the existing explanations, save a private note, mark the step studied, reload, resume correctly, export selected content with optional notes and its sources, and prove the record survives backup/restore and a safe app update.

## Copy-paste prompt

Implement the public-app Study Continuity phase in `/Users/umang/developer/github/PalDawn`, following `docs/NEXT-PHASE-STUDY-CONTINUITY.md`. Complete slices 1–4 in order. Begin by rechecking current source and establishing the baseline, then implement and verify each slice, including storage migration/recovery and browser acceptance. Preserve First Light data, legacy routes, medical-review boundaries, and Anatomy Lab's default-build exclusion. Reuse the current stack and existing helpers. Keep Anatomy persistence as a follow-on. Finish with reviewable changes and an evidence-backed report; do not merge, push, deploy, or release unless I separately authorize it.
