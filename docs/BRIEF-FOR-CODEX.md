# PalDawn — full project brief for Codex

**How to use:** paste everything below the line into Codex. It transfers the founder's vision, all research and decisions to date, the current repository state, and the working model. Codex's reply should follow §10 and end with a **"PROMPT BACK TO CLAUDE"** block you bring back here.

---

> **RENAME (2026-08-20):** the project formerly named **Antaryaan** is now **PalDawn** — *pāl* (पाल: guardian, companion) + *dawn*; a family tribute. Historical documents (your recon dossier, the provenance records, older prompts) still say Antaryaan — same project, same repo. New identity element: the in-app guide is a companion character named **SPD** (*Somatic Pathfinding Droid*), the journeys' narrator/co-pilot; SPD carries the emergency-services safety line and never diagnoses.


You are being briefed on **PalDawn** for long-term collaboration. You have worked on this project before in a separate session (you produced its GitHub reconnaissance dossier and the bounded foundation-pass directive); this brief restores that context plus everything that happened since. Read it fully before producing anything.

## 1. The founder's idea (UD — project owner)

A browser-based 3D voyage through the human body, built like a game, aimed at both curious people and clinicians:

- **Galaxy metaphor.** The whole body is a universe. Search any topic — dengue, heart attack, diabetes, a nerve — and the camera flies from the full body down into the system, the organ, the vessel, the tissue, the way you'd zoom from a galaxy into a planet.
- **You are inside.** Not a rotating model on a pedestal: you fly *through* arteries and nerves while the body functions around you — heart beating, vessels pumping, blood cells drifting past the camera.
- **Disease journeys in phases.** Where does dengue go first, organ by organ? How does a heart attack unfold minute by minute, and why do you feel it in your left arm? Diabetes, cancer — staged, causal, cinematic.
- **Two audiences, one app.** Everyday users get symptom-and-ailment education ("I've been suffering — where does this actually affect me?"); doctors and students get a research-grade mode where any topic resolves to curated scientific sources with the *explanation shown spatially*, not just a list of links.
- **Non-negotiables:** graphics as good as the web allows ("don't compromise — go all out"), runs in any modern browser, free-tier hosting forever, fully open source on GitHub so anyone can download, run, and contribute.
- **Name (final):** **PalDawn** — *pāl* (पाल: guardian, protector, companion) + *pal* (पल: a moment) + *dawn*. A family tribute; the guide character **SPD** carries the same honor inside the app.

## 2. Positioning (research-derived — protect this niche)

Recon showed polished organ explorers with hotspots, layers, isolate modes, and quizzes are already commodity open source. PalDawn therefore does **not** launch as "another 3D anatomy atlas." Its category: an **evidence-linked causal voyage through disease** — the learner enters the body spatially, watches **cause become effect over time**, flips the same visual beat between **Layperson ↔ Clinical** narration, and can resolve **each factual claim to a curated source**.

Launch promise: **"Fly through a heart attack from plaque rupture to tissue death."**

Uniqueness is claimed only in bounded form: the inspected open-source projects did not provide this end-to-end combination. Never assert universal uniqueness.

## 3. Research already done (and where it lives in the repo)

1. **Engine council review** (three independent lenses: graphics engineering, OSS ecosystem, shipped medical-3D precedent) → **unanimous: Three.js + React Three Fiber** over Babylon.js. Deciding evidence: ~47× larger npm contributor ecosystem, near-total Three.js precedent among web medical-3D viewers, and the single-renderer WebGL2 story.
2. **Your GitHub reconnaissance dossier** — `docs/research/github-recon-evidence.md` (pinned commits, verified claims). Its key catches now govern the project:
   - **Z-Anatomy is not approved wholesale**: its repo-level CC BY-SA 4.0 coexists with listed third-party **CC BY-NC / NC-SA models** (inner ear, kidney). Assets are approved **per object** with lineage traced to BodyParts3D (CC BY-SA 2.1 JP), Z-Anatomy's own work, or another compatible license.
   - **Theatre.js Studio is AGPL** → excluded from P0 (boundary *idea* retained clean-room: authored tracks → immutable JSON → small deterministic runtime).
   - **StatPearls is CC BY-NC-ND** → metadata + canonical links only, never prose. **MedlinePlus health topics are public domain** under its content rules with the exact credit `Source: MedlinePlus, National Library of Medicine.` PubMed/Bookshelf prose is never ingested.
   - Clean-room-only prior art (no license / ambiguous): esma-dev-studio anatomy viewer (state/UX pattern), oabrowser (multi-parent hierarchy model), Makio64 cinematic zoom (camera channels, log-distance interpolation — MIT, adaptable with attribution).
   - Technique directives: drei `MeshPortalMaterial` for the exterior→lumen dive (fallback: opaque-wall/fog swap); rasterized inward-facing swept lumen, **no raymarching in P0**; **analytic instanced blood** (static per-instance attributes + uniform time over one shared route/frame lookup), GPGPU only if measured behavior requires history; stock `MeshPhysicalMaterial` first, thickness-map SSS reserved for the hero heart later.
3. **Journey roadmap anchor:** WHO top causes of death (2021 GHE — ischaemic heart disease, COVID-19, stroke, COPD, lower respiratory infections, lung cancers, Alzheimer's/dementias, diabetes, kidney diseases; 10th slot pending verification), plus **Dengue** as a regional spotlight for India. Heart attack ships first; breadth only after.
4. **Foundation pass executed** (by Claude, from your prompt-back directive, in the real repo): details in §5.

## 4. Locked decisions — do not relitigate without a fatal-flaw case

1. Stack: **Vite + React + TypeScript + three + @react-three/fiber + @react-three/drei + Zustand + @react-three/postprocessing**. Stable **WebGL2** for P0; WebGPU/TSL deferred.
2. Distribution: static **GitHub Pages**; immutable versioned GLB packs later streamed from **GitHub Releases**; no backend, no paid services, ever, in v1.
3. Licensing: **MIT** for app/pipeline code; PalDawn-authored and compatible derived content/asset packs **CC BY-SA 4.0**; upstream material retains its exact source license + lineage record. CC BY-SA never lands in MIT code zones.
4. **Provenance precedes adoption** — every direct dependency/asset/content item needs a passing provenance record *before* use (validator described in §5). Fail closed on unresolved license/creator/source. Denylist: GPL/AGPL code, CC BY-NC family, unlicensed.
5. **P0 exclusions:** AMI, NiiVue, r3f-scroll-rig, three.quarks, ShaderParticleEngine, lamina, Theatre.js. `three-custom-shader-material` only if a measured stock-material prototype fails a defined requirement.
6. Canonical anatomy route (representative; variation always stated): **left aortic sinus/aortic root → left coronary ostium → left main → LAD.** The ostium is not exposed on the exterior, so P0 approaches along the exterior epicardial vessel and **portals into the proximal LAD**; any later ostium entry goes through the aortic-root lumen first. Project IDs like `structure:coronary.lad`; FMA/TA2/mesh IDs in separate fields with mapping provenance; **never infer FMA↔TA2 equivalence by label matching**.
7. Phases: **P0** technical slice (beating-heart exterior → epicardial route → portal → rasterized LAD lumen → analytic blood → reduced-motion route → provenance gate → measured WebGL2 performance) · **P1** heart-only Heart Attack journey (one representative acute-MI mechanism, claim-level citations, named-reviewer gate) · **P2** full-body L0–L3 atlas + search. Name final: **PalDawn** (renamed from Antaryaan, 2026-08-20). Journey narration is delivered by the SPD co-pilot character.

## 5. Current repository state (verified 2026-08-16)

`/Users/umang/developer/github/PalDawn` (folder renamed along with the project) — git initialized, branch `main`; may or may not be pushed to GitHub yet (ask UD if you need access).

- `docs/PLAN.md` — corrected full plan (positioning, route, perf gates + p95 proof protocol, guardrails, adoption candidates with pins, ordered backlog).
- `docs/research/github-recon-evidence.md` — your dossier.
- `pipeline/provenance/` — universal record **schema**, deterministic **validator** (Node built-ins only), run-checks suite, 3 valid + 7 invalid fixtures, and 13 passing records covering the app's direct npm dependencies. **All 23 checks pass**, verified in the sandbox *and* on the owner's machine. Fail-closed rules enforced: license allowlists per landing zone, share-alike-in-code-zone rejection, premature-`used` rejection, named-review requirements for medical subjects, `not_applicable`+rationale for pure code.
- `app/` — locked-stack WebGL2 scaffold, exact pins (react 19.2.8, three 0.185.1, fiber 9.7.0, drei 10.7.8, postprocessing 3.0.5, zustand 5.0.15, vite 8.2.1, TS 7.0.2 + types), preserved lockfile, transitive license inventory (90 packages, 0 denied; `webgl-constants` resolved as MIT with recorded tarball evidence; MPL-2.0 lightningcss noted as build-time review-tier), full direct-dep license texts in `THIRD_PARTY_LICENSES.md`, Pages base-path support, quality-tier shell, reduced-motion setting. Renders a clearly labeled **non-anatomical calibration object** only. Typecheck ✅, production build ✅, core JS **316.62 KB gz** (gate: ≤500 KB).
- `NOTICE.md` / `CREDITS.md` — repaired: Z-Anatomy/BodyParts3D moved to **"Planned / not yet incorporated"**; "Used" lists only what's really in the repo.
- **Not yet existing:** anatomy assets, clinical content, performance measurements, medical review, deployed site. Workflows in `.github/` are present but dormant.

## 6. Open backlog (ordered; 1–2 done)

3. **Per-object approval of a heart/coronary asset set** from Z-Anatomy (pin `ebdd5edf…`) — or authorize the visibly synthetic fallback.
4. Deterministic Blender → GLB → glTF-Transform pipeline (pins in `docs/PLAN.md` §7), manifests/digests, round-trip tests.
5. Beating-heart stock-material/LOD/lighting/post baseline.
6. Shared normalized route/frame lookup (camera rail, lumen tube, wall-flow UVs, blood placement).
7. `MeshPortalMaterial` portal prototype + fallback.
8. Analytic instanced blood (provisional 10K/25K/50K tiers + point-sprite fallback).
9. Minimal linear journey schema (versioned; pack IDs/digests; prefetch; entry/exit actions; two-depth narration; claim-level references; deterministic gates; reduced-motion route; branches/quizzes deferred).
10. Independent benchmarks (exterior / portal / lumen) per the p95 protocol.

## 7. Guardrails binding on everything you produce

Education, never diagnosis or triage; any suspected-heart-attack context directs the person to **contact local emergency services immediately**; citations ≠ medical approval; every factual beat stays a marked unpublished placeholder until a **named qualified human** reviews it (reviewer, date, status, claim scope, sources); no AI self-certification of medical/anatomical accuracy; anatomy presented as representative with variation stated; never copy GPL/AGPL/unlicensed code (ideas only, flagged clean-room); prefer packages over vendoring; every adoption carries source URL + license at the site, a CREDITS.md entry, and a provenance record; mark every factual claim **(verified)** with a link or **(from memory)**; never fabricate measurements, reviewers, or results.

## 8. Working model

- **UD** — owner: approves adoptions, sets priorities, runs the round-trips between AIs.
- **Claude (Fable, Cowork session)** — executes bounded passes in the real repository, runs validators/builds, lands files, reports honestly against stop conditions.
- **Codex (you)** — deep verified research, license/provenance audits, adversarial design review, and bounded parallel missions. Your outputs come back to Claude via a **"PROMPT BACK TO CLAUDE"** block: (a) imperative directives, (b) plan deltas, (c) a ≤10-item task list, (d) explicitly deferred items.

## 9. Default next mission (UD may override in his message)

**Backlog item #3 — per-object heart/coronary asset audit.** Read-only against pinned upstreams; import nothing. For each object needed by P0 (heart exterior surfaces; aortic root/ascending aorta; left main; LAD; plus LCx/RCA for visual context): identify the exact object in Z-Anatomy `ebdd5edf…`, trace lineage (BodyParts3D CC BY-SA 2.1 JP / Z-Anatomy original / third-party — fail closed on NC or untraceable), record TA2 terms (Z-Anatomy `TA2.csv`) and FMA IDs (Moerman `FMA.csv`, pin `f0eeb6e8…`) in separate mapping fields with method + confidence, note mesh-defect risks, and produce **draft provenance records** (JSON per `pipeline/provenance/schema.json`: `medical_scope: true`, `usage_status: "planned"`, `approval.status: "pending"`, `review.applicability: "required"`, `review.status: "pending"`, digests as sha256 or `git-blob-sha1:` with method noted) that pass `node pipeline/provenance/validate.mjs`. Deliver an audit dossier in your recon style + the record files.

## 10. How to respond to this brief

1. **CONTEXT CHECK** — ≤10 bullets proving absorption; flag any gap, contradiction, or decision you'd challenge (with the evidence bar you'd need).
2. **MISSION OUTPUT** — execute §9 (or UD's override) at recon-dossier rigor.
3. **=== PROMPT BACK TO CLAUDE ===** — fenced block per §8.
