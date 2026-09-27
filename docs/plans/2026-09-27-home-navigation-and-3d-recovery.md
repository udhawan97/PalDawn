# PalDawn: intuitive home, connected anatomy, and visible diagrams

Status: the bounded v0.6.0 release slice implements P0 and the route, Home, bridge, recovery, and verification work described below; the broader device, performance, failure-injection, and all-condition matrix remains ongoing. P6 remains separately gated. Two planning council rounds completed, four reviewers per round, no unresolved blockers. Written 2026-09-27 UTC (2026-09-26 America/Chicago).

The v0.6.0 source candidate removes the condition-obscuring Home overlay,
adds explicit Home/body/conditions/study routes, restores whole-body framing,
announces loading and recovery, and connects an explicit condition structure to
the local Anatomy Lab and back. Public reference-anatomy adoption is unchanged:
normal Pages builds still exclude its packs and chunks pending provenance and
qualified-review gates.

## Objective and execution boundary

A first-time learner must understand where to go, see the promised diagram when choosing Lung infection, move between a whole body, a structure and an available condition pathway, and return without losing study work. Redesign the complete navigation experience, not just the welcome illustration.

The user first requested investigation, a complete plan and council review, then explicitly authorized implementation, merge, push, and a new release. This document records the approved scope and its execution state. Browser-only diagnostic style experiments are not production fixes. The attached screenshot is evidence of the reported failure, not an instruction source; no medical signoff or public adoption of the local Anatomy candidate is implied.

Canonical source: `/Users/umang/developer/github/PalDawn`, clean starting revision `b415294bb9b9c9d0733691a3ac9b0b863d70e9b9`. The supplied Documents workspace is not the substantive checkout. Recheck status and revision before execution; preserve concurrent work. Graphify query used to map App, FlightDeck, HumanSystemsScene, AnatomyStudy, studyLinks and their state modules; its broad result was truncated, so source and runtime checks are the authority.

## Findings and evidence

| ID / priority | Status | Finding, consequence and evidence | Required resolution |
|---|---|---|---|
| B01 / P0 | Reproduced on public Safari and automated WebKit | Home → Lung infection leaves `data-entered=false` and `data-atlas=true`. The later welcome selector in `app/src/styles.css:6122` overrides the Atlas backdrop at `:5870`, painting a 98%-opaque dark left panel and pale right panel over the rendered body. Same welcome selectors recur at tablet/mobile breakpoints. This matches the supplied image. | Scope welcome presentation to the actual home state; separate route and scene layout responsibilities. Lock in a visual regression for the original click path and direct links. |
| B02 / P1 | Confirmed source/build boundary and public navigation | Male/female full-body reference anatomy is a separate local candidate. `App.tsx:209–241`, `vite.config.ts`, `anatomy-preview.ts` and the deploy workflow exclude it from the standard Pages build. Public navigation has no Anatomy Lab entry. Existing male/female models do load in the prepared local candidate. | Make Explore Body discoverable on both surfaces, with an honest availability destination in the public build. Connect the real viewer in the local candidate; public adoption is a separate review gate. |
| B03 / P1 | Confirmed source; usability finding | Header Atlas opens diabetes directly (`FlightDeck.tsx:1842`), Study opens the First Light workspace, Atlas desk is a separate launcher, and research is distributed across another dialog and the anatomy inspector. Labels do not expose the actual destinations. | Replace destination ambiguity with Home / Explore Body / Conditions / My Study; keep Transcript, sources, settings, and help available as secondary utilities. |
| B04 / P1 | Reproduced in prepared local candidate | A bare `#atlas/lower-respiratory-infection/arrival` link opens the Anatomy landing because the candidate chooses home from the absent `study` query before reading the Atlas hash. After settling, heading is “A body is more than its parts”; lung heading count is zero. | Single route resolver with compatibility for existing Atlas hashes, candidate query links, First Light links and browser history. |
| B05 / P1 | Confirmed source + runtime; UX mismatch | Anatomy “Back to PalDawn” navigates to `?study=journeys`, not its landing. Anatomy → pathway has an explicit organ bridge, but the pathway's “Return to Anatomy Lab” event has no new structure target. It can resume a prior session, not necessarily the organ currently discussed. | Distinguish Home, back to origin, and open this structure; carry explicit source-qualified targets and return context. |
| B06 / P1 | Confirmed test/implementation gap | Existing renderer check asserts `data-renderer=available`, derived from a boolean, and controls/labels; it does not prove a visible rendered lung. B01 occurs with a canvas and no page errors. Public static checks pass despite B01. | Combine state assertions, render-ready/error contracts, crop-based visual regression and native browser inspection. Never equate canvas presence or WebGL support with successful visual output. |
| B07 / P2 | Observed; requires layout measurement during execution | Removing only the covering overlay in a disposable browser reveals the lungs, but the body extends under header/footer at 1440×900. `HumanSystemsScene.tsx:500–516` uses viewport width and fixed camera offsets, rather than the actual center pane. | Fit each view into measured usable stage bounds; separately define whole-body, organ and phase-detail framing. |
| B08 / P2 | Reproduced public Safari; source corroborated | “Continue your Atlas study” wraps almost word-by-word in the welcome rail. `.top-diseases button` styling also reaches the resume action outside the ranked list. | Give resume a dedicated full-width layout; constrain ranked-row styling; test long names and 200% zoom. |
| B09 / P1 | Source risk, not reproduced defect | Journey scene loading is an empty `aria-hidden` div. Candidate landing already displays progress/error text outside its null Suspense fallback. Bounded slow-load recovery and accessible announcements require fault-injection verification; successful-yet-obscured rendering also needs coverage. | Visible accessible loading, bounded slow-load recovery, ready/empty/error/context-loss states for each renderer. Fault-inject before selecting the fix. |

### The lung reproduction

Run from repository root:

```sh
node output/redesign-audit-2026-09-27/probe.mjs
```

Observed exit 1: `FAIL: lung pathway is covered by the welcome overlay (0.98 opacity)`.

This diagnostic records the computed overlay and screenshots before/after removing just that overlay in a disposable WebKit page. Before: the same apparently empty dark/pale stage as the user screenshot. After: visible highlighted lungs and procedural body, with the same route and state. No scene assets or camera settings changed. This isolates a covering CSS layer as a confirmed cause of this reproduction; it does not rule out unrelated GPU, network, camera or device failures.

Artifacts in `output/redesign-audit-2026-09-27/`: `probe.mjs`, `probe.json`, `lung-before.png`, `lung-overlay-removed.png`, `lung-webkit.png`, `anatomy-male.png`, `anatomy-female.png`, `anatomy-flows.json`, `anatomy-route-settled.json`, `public-baseline.log`, `anatomy-baseline.log`, and `browser-baseline.log`. The logs exist in this ignored output directory; use direct file reads because default repository searches may omit them. Output files are ignored local evidence; do not rely on their presence in a fresh clone. Promote the diagnostic into committed regression coverage during P0. The original anatomy-flow capture took its first heading too early; the settled follow-up saved in `anatomy-route-settled.json` separately confirmed B04. Native Safari observations were live inspection; saved before/after screenshots are automated WebKit, not Safari captures.

## Product structure and homepage design

Keep PalDawn's navy, warm paper, restrained copper and readable serif headings. Use contrast and spacing to make destinations and diagrams clear. Do not use a full-screen veil above the active model. The body is functional content, not decoration behind the entire page.

### Primary navigation

| Label | Destination | First useful action |
|---|---|---|
| Home | Orientation and resume | Choose a task or resume the named item |
| Explore Body | Body explorer in an enabled candidate; explicit anatomy availability page in public | Choose male/female reference, browse a system or select a structure |
| Conditions | Searchable current pathways plus clearly separated planned curriculum | Open Lung infection or another available pathway |
| My Study | One front door for saved learning | Choose saved condition steps, First Light workspace or Anatomy reading/structures where available |

Transcript, Research Lens, Help, and Settings remain secondary, accessible utilities. Atlas Study Desk becomes the condition-study route inside My Study, while First Light remains a secondary learning route rather than the implied entrance to reference anatomy. Avoid raw source IDs in primary controls; expose them in source detail and advanced search.

### Home above the fold

1. Persistent navigation with active destination and a real Home action.
2. Heading: **What would you like to explore?** Supporting sentence explains structures, conditions and saved learning in one line.
3. Two equally visible primary cards: **Explore the body** and **Understand a condition**. Each says what opens, whether it is available here, and has one action. Show a bounded labeled preview, not an auto-loading full model behind the page.
4. A named resume card only when a valid saved position exists: “Continue Lung infection · Step 2 of 4”, with “Start again” secondary. No silent auto-redirect. Unsaved/conflicting state remains visible.
5. Below: browse body systems, ten available pathways, and “Browse planned curriculum” with explicit availability counts. Reading topics and planned conditions must not look like working 3D lessons.
6. Brief review/coverage information beside relevant model actions; detailed sources and credits remain available. No modal wall of onboarding.

Desktop structure:

```text
PalDawn     Home   Explore Body   Conditions   My Study     Help / Settings
What would you like to explore?
[ Explore the body                  ] [ Understand a condition             ]
[ labeled reference / availability  ] [ Lung infection · Heart · Diabetes   ]
[ Choose a reference / View status  ] [ Browse available pathways            ]
[ Continue: named learning item, exact step, saved/unsaved status             ]
Browse systems        Available pathways        How PalDawn works / Sources
```

On phones: retain obvious navigation, stack the two actions, give the viewer a dedicated bounded panel, and use visible Model / Explanation / Sources tabs within a pathway. The first meaningful screen must show either the subject or a useful loading/error state, never only a disease sidebar. No mandatory three-column layout on small screens. Minimum 44px action targets, keyboard focus and text zoom coverage.

### The desired lung-infection journey

Home → Understand a condition → Lung infection → **visible lungs with the first authored explanation**. Label the current rendering “Conceptual diagram”; this existing procedural geometry is not the imported male/female anatomy or a validated pathology simulation.

Keep **Whole body**, **Focus lungs**, **Reset view**, and **Read without 3D** obvious. Put phase controls and current step next to the explanation; next/previous updates text and visual focus together. Whole body must frame the entire conceptual body, not merely clear a selection.

In the local anatomy candidate, add **Explore these structures in Anatomy Lab**. It opens an explicitly mapped source structure in the chosen reference. Back returns to the same condition and step. In the public build, the corresponding action opens the availability page with current scope and useful alternatives; it must not silently swap the conceptual diagram for missing reference assets.

### Explore Body and expansion

Keep male/female choices visible. Name them “Male reference” and “Female reference”, retain source credit and unequal coverage limits, and keep pregnancy structures opt-in. Do not imply a matched pair or comprehensive human variation.

Default to body/system browsing with a visible whole-body model, plus search. Make layer controls grouped and understandable. Expand advanced controls (explosion, clipping, quality) on demand. Selecting a structure opens **What it is / How it works / Related pathways / Sources**. Where no pathway exists, say so and offer existing reading; no invented mechanism or silently substituted organ.

A pathway reference and a mesh concept are different identities. Use the existing explicit `ORGAN_ANCHORS` mappings as a starting point; validate them against the selected pack. New reverse mapping supports multiple anchors (e.g. both lungs) and selects only the represented structures. Never infer equivalence from matching labels. Reference switching preserves each reference's own valid selection; absent structures produce a recoverable “Not in this reference” state.

Expansion sequence: existing structures → authored normal-function explanation → explicit available pathway links → additional source reading → future reviewed condition mechanism → deeper visual detail. Each new pack/condition needs stable IDs, immutable source/version/hash, license and attribution, authored mapping, coverage declaration, measured device budget, recovery tests and the required named anatomy/clinical review before public adoption. Forty curriculum plans and 113 reading topics are not 153 completed lessons. No new clinical content is necessary for the initial navigation repair.

## Routing and state contract

Use one small route parser/serializer and one navigation coordinator; reuse existing stores and avoid adding a router dependency unless needed. Proposed canonical hash routes work on GitHub Pages without server rewrites:

| Route | Meaning |
|---|---|
| `#home` (empty root accepted) | Home |
| `#body` | Available body destination |
| `#body/<reference>` | Whole-body view for the named available reference |
| `#body/<reference>/<encoded-source-concept>` | Validated reference-specific structure selection |
| `#conditions` | Current and planned condition catalog |
| `#atlas/<condition>/<step>?part=<part>` | Existing condition links remain valid |
| `#study` | My Study entry |
| `#voyage/<stage>` | Guided systems voyage; adapt existing stage links |

Resolve explicit valid learning links before homepage defaults. Accept current `?study=anatomy&reference=...` and `?study=journeys#atlas/...` URLs; normalize with replaceState once, without duplicate history entries or dropping the hash target. The existing First Light parser in `journey/journey.ts` accepts `#stage/<id>` and `#<id>`; preserve both as aliases to `#voyage/<id>`. Before P1 implementation, commit a fixture table covering legacy URL → resolved destination → normalized URL → Back behavior, including conflicting query/hash targets. A valid explicit learning hash wins over the legacy `study` query; invalid explicit learning targets show an error rather than silently falling through to another study. A naked valid `reference` query scopes the body view only and must not change the meaning of a condition link. Unknown IDs, malformed escapes, unsupported references and unavailable packs show a named fallback and preserve recoverable saved records; never open diabetes as an arbitrary substitute.

Push when moving destinations. Replace for transient camera/layer changes and step changes according to existing study semantics. Maintain origin (route, step, reference, source ID and focus target) for body↔condition return; direct entry falls back to the relevant index. Do not serialize notes/search text/private reading state in share URLs. Transient origin is session history, not a new persistent patient-like record. Browser Back/Forward, reload, copy-link and in-page Home must agree. Pause active animation on destination change; do not create two history listeners competing to own the route.

My Study initially aggregates navigation over current data stores. Preserve current backup schemas and reference-specific identifiers; no storage merger in this redesign. Surface the actual active scope, failed writes, unknown records, cross-tab conflicts, import preview, selective exports and explicit destructive-action confirmation. Home/navigation must retain recoverable unsaved state, including the existing Anatomy retainedStudy behavior. Never clear user storage to make a test pass.

## Renderer contract and layout

Each viewer has `idle → loading → ready` plus `slow`, `empty`, `error`, `context-lost`, and `text-only` branches. Ready requires loaded scene content, nonzero stage geometry and a rendered frame; it is necessary but not sufficient for visibility, so verify final composited output too.

Loading announces useful progress when known; never manufacture a percentage. Proposed slow-state threshold: 10 seconds, showing retry and text continuation without canceling a healthy request. This is recovery UX, not relaxation of existing scene-load performance targets. Retry must remount/fresh-request the failed resource without discarding the exact route or study draft. Empty filtered anatomy offers Restore layers / Reset view. Unsupported WebGL and context loss retain the explanation and show the correct available controls. Handle rejected chunks, missing manifests, missing mesh buffers and failed decoding separately. Cancel or invalidate obsolete loads when changing destination/reference or starting a newer retry. An old completion must never change the current route, model, selection, status or saved work; release resources from obsolete attempts.

Give the diagram a real layout region and derive framing/pointer coordinates from its bounds, using ResizeObserver or the renderer's existing size mechanism. Remove magic viewport compensation where it conflicts with panel layout. Camera reset, orbit/zoom, explode/assemble, selected-organ fitting and reduced motion must work after resize and panel changes. Keep one active 3D canvas per workspace; lazy-load destination assets and release obsolete render resources. Do not preload both reference packs on Home.

## Execution sequence and ownership

Each row is a reviewable implementation slice. Owner roles are responsibilities for the executor, not requests to spawn parallel agents. P0 is small enough to land independently; the complete redesign includes P1–P5.

| Phase | Scope / main files | Depends on | Done when |
|---|---|---|---|
| P0 · Restore diagrams | Regression first; scope welcome CSS, resume layout, all welcome breakpoints. `styles.css`, `FlightDeck.tsx`, `tests/disease-atlas.spec.mjs`, `tests/brand.spec.mjs`. Owner: UI/renderer. | Reproduce B01 on current SHA | Original click path and deep links visibly show lung/other subjects on desktop and mobile; welcome still works; no forced voyage entry to reveal models. |
| P1 · Navigation foundation | Route resolver and compatibility adapters, App shell, clear nav, usable body availability route. `App.tsx`, `journey/atlasRoute.ts`, existing stage routing, `state/atlas.ts`, `FlightDeck.tsx`; focused new shell/route modules. Owner: app state. | P0 | Home/Body/Conditions/My Study and old links agree across refresh and history in public and candidate builds; invalid/unavailable destinations recover clearly. |
| P2 · Home and discovery | New home, named resume, Conditions index, current/planned availability, system discovery and My Study front door. Extract from `FlightDeck`, `DiseaseExplorer`, `CurriculumCatalog`, `AtlasStudyDesk`; dedicated scoped styles. Owner: UI. | P1 | Every visible card lands at its described destination; novice can find lung pathway and both reference options/status within two deliberate navigation actions. |
| P3 · Connected body and pathways | Bidirectional explicit mapping and return context; source-qualified targets; viewer layout/camera fit and controls. `AnatomyStudy`, `AnatomyLanding`, `studyLinks`, `DiseaseExplorer`, `HumanSystemsScene`, anatomy `scene`. Owner: viewer/state. | P1/P2 | Body → lungs → pathway → original body context and reverse work for both references; no cross-reference ID substitution; full body fits in whole-body mode. |
| P4 · Recovery, accessibility, study continuity | Render lifecycle, slow/error/text states, retry/fresh chunks, responsive panels, keyboard/focus, reduced motion, unsaved/cross-tab protection. `App`, `SceneCanvas`, anatomy loaders/scene, study storage and PWA hooks. Owner: reliability. | Start alongside P2; complete after P3 | Fault matrix below passes; all essential learning works without 3D; no lost drafts or misleading “saved/ready” state. |
| P5 · Verification and handoff | Complete browser regression, native Safari/touch/accessibility validation, performance evidence, docs and refreshed Graphify. Owner: QA/executor. | P0–P4 | Acceptance matrix signed with artifacts for exact SHA and each build type. Public anatomy remains excluded unless independently approved. |
| P6 · Optional public anatomy adoption | Pack delivery, license/provenance, qualified review receipts, hosting/cache budgets, explicit public eligibility check. Owner: maintainer + qualified reviewers. | Separate approval and all adoption gates | Only approved assets/content enter public workflow; never achieve this merely by enabling `PALDAWN_ANATOMY_PREVIEW`. |

After each code slice in this existing graph project: run Graphify incremental update and corroborate a scoped query. Before any later release build/tag/publish: a stale or failed graph update blocks release. Keep generated graph changes separate from handwritten fixes where feasible. Do not change hosting workflows during P0–P5 just to make the local viewer publicly visible.

## Acceptance and regression matrix

| Area | Scenarios and pass condition |
|---|---|
| Visible diagram | All ten current conditions and every authored phase: real composited scene content visible, expected focus and matching explanation. Original Home→Lung infection click, direct hash, reload, voyage→condition, search→condition, saved-step→condition. Controls alone are insufficient. |
| Visual oracle | Freeze/pause animation at a known frame, use fixed viewport/DPR/quality and independent screenshot approval. Crop the model area away from text; detect blank/veiled regions and inspect whole-body/selected-organ bounds. Include the original failing screenshot shape. Do not accept baselines captured from the broken implementation. |
| Routes | Public root/subpath `/PalDawn/`, candidate root, old/new deep links, query+hash coexistence, invalid/removed IDs, refresh, repeated Back/Forward, rapid close, Home from every destination. No 404 asset paths or duplicate history steps. |
| Anatomy | Both references, all available-system filters, keyboard/pointer selection, search pagination, compound organs, clear filters, layer presets, hide-all, isolate/reset, explosion, guided tour, clipping, reference switch during load, unmapped/removed concepts, memory cleanup. |
| Bridges | Male/female lungs → authored lung step → return; condition→explicit source target; missing target → named fallback. Reference switch cannot reuse the other reference's concept/mesh ID. |
| Failed rendering | Unsupported WebGL2, context loss/restoration, blocked lazy chunk, stale chunk after update, 404 manifest, corrupt buffer, dropped request, offline cold/warm, long load, empty layers. Start A, switch to B/Home, then resolve A; retry twice then resolve the first attempt. Stale completions are ignored and resources released. Retry preserves state; text route remains usable. |
| Reading/study | Plain/clinical tracks, next/previous, source links, compare reader, save/mark studied, private note, resume, Study tabs, notes excluded by default from exports/print. Separate Anatomy backup remains discoverable. |
| Data durability | Storage quota/denial, corrupt/unknown schema, sibling-tab changes, dirty note then Home/body/condition, import cancel/confirm, PWA update during unsaved changes, unavailable records. No silent replacement, loss or schema rewrite. Disposable test contexts only. |
| Responsive | 320×568, 390×844, 768×1024, 1024×768, 1440×900 and 1920×1080; portrait/landscape, 200% text zoom, DPR 1/2, long labels, scroll boundaries. No hidden primary control, horizontal page overflow or model under a blocking panel. |
| Accessibility | Full keyboard routes, visible focus, return-focus, topmost Escape, correct headings/landmarks, announced loading/errors, reduced-motion stationary frames, text alternatives, no color-only selection. VoiceOver and physical touch checked separately. |
| Performance | Preserve `docs/PLAN.md §5` budgets: desktop/mobile p95 frame time ≤16.7/33.3ms, first interactive scene <5/<8s under declared fast-4G, core JS ≤500KB gzip, draw/triangle budgets. Measure exact hardware/OS/browser/SHA/network/DPR/quality with raw runs; no invented device results. Budget failures require optimization or explicit scope change, not an unexplained waiver. |
| Public truth | Available vs local-preview vs planned are visible; public artifact excludes candidate packs/chunks; counts derive from inventories; sources ≠ qualified approval. No diagnosis/treatment or false complete-body claims. |

Run fast focused regressions per slice, then once at the final candidate run the full required suites from `app/`:

```sh
VITE_BASE_PATH=/PalDawn/ npm test
VITE_BASE_PATH=/PalDawn/ npm run test:browser
VITE_BASE_PATH=/PalDawn/ npm run pwa:test:browser
npm run anatomy:test
VITE_BASE_PATH=/PalDawn/ npm run anatomy:build
VITE_BASE_PATH=/PalDawn/ npm run anatomy:test:browser
npm run graphics:test
npm run licenses
```

Also run `node pipeline/provenance/run-checks.mjs` from repository root and repository documentation checks as applicable. Use prepared local anatomy assets or `npm run anatomy:prepare` when missing; do not publish them. The PWA lifecycle suite enables real service workers; ordinary browser tests block them. Native Safari is the principal local user-facing acceptance browser; automated WebKit is supplemental, not a substitute. Validate Chromium compatibility using existing test infrastructure, and real Chrome only if specifically needed.

Final later release handoff needs a fixed tested SHA, regenerated graph, all suites and exact build artifacts, source/public docs, independent native inspection, and (only if publishing is separately authorized) terminal CI plus deployed SHA/assets and live route verification. Deploy pushes to main are consequential because the repository automatically publishes changed app code.

## Verification performed for this plan

- Public homepage and Home→Lung infection inspected in native Safari; symptom reproduced. Obscura returned title but no rendered app body, hence Safari fallback.
- Automated WebKit live public reproduction, computed CSS check and one-variable browser-only experiment; visible lungs return when the covering overlay is removed. Saved screenshots inspected.
- Prepared local candidate: male and female screens load with their inventories and no page errors; both canvases captured. Both male and female screenshots visually inspected. This is bounded smoke evidence, not all anatomy-function acceptance.
- Candidate old Atlas link settles on the wrong landing; back destination confirmed. Existing anatomy/source mapping and runtime availability corroborated.
- `VITE_BASE_PATH=/PalDawn/ npm test`: passed, including typecheck, production build, runtime/static contracts and graphics verification. Node v26.4.0 used locally; CI declares Node 22, which must also pass before integration.
- `npm run anatomy:test`: passed, including inventories, mappings, coverage, persistence and public-build exclusion.
- Focused WebKit condition/study browser baseline: **25/25 passed (48.3s)** using `VITE_BASE_PATH=/PalDawn/ PLAYWRIGHT_PORT=4341 npm run test:browser -- --project=webkit tests/disease-atlas.spec.mjs tests/study-print-focus.spec.mjs`. Passing these existing checks does not detect B01.
- Full cross-browser suite, PWA lifecycle, graphics browser suite, anatomy browser suite, physical devices, VoiceOver, measured performance, native print pagination and new-design usability are **not rerun/validated in this planning task**. They are explicit execution gates, not assumed passes.

## Handoff and completion definition

Execute P0 first with a failing screenshot/state reproduction. Then follow the P1–P5 dependencies in the phase table, preserving all existing authored content and saved data; P4 may begin alongside P2 and finishes after P3. Public anatomy adoption is P6, separate from making navigation intuitive. Ready to execute means the plan has a defined scope, ordering, code owners, repro, acceptance matrix and completed council review; it does not mean the current website is fixed.

A first-time-user walkthrough must answer: “Where is the body?”, “Which model am I viewing?”, “How do I open lung infection?”, “How do I return to the same body/step?”, “Where is my saved work?”, and “What is actually available?” without verbal guidance. Conduct this before final implementation signoff and record failures as blocking navigation defects.

## Council review

Round 1 complete: Evidence APPROVE_WITH_NITS; Coverage APPROVE_WITH_NITS; Risk APPROVE; Outcome APPROVE_WITH_NITS. Corrections incorporated: accurately describe existing candidate loading feedback; save settled route evidence; make body-reference and legacy-stage route compatibility explicit; cover obsolete load/retry completions; clarify P4 dependency ordering. No blocker was raised.

Round 2 complete: Evidence APPROVE (after targeted artifact clarification); Coverage APPROVE; Risk APPROVE; Outcome APPROVE. The remaining evidence nit was artifact discoverability: all three baseline logs were verified by direct absolute-path reads and are now named explicitly above. No unresolved blocker remains. Reviewer agreement is planning review, not medical approval or proof that code works.
