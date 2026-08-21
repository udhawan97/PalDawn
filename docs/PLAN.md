# 🌅 PalDawn (पाल · dawn) — The Companion Voyage

**An evidence-linked causal voyage through disease.** PalDawn (formerly Antaryaan, renamed 2026-08-20) is not another general 3D anatomy atlas — organ explorers with hotspots, layers, and quizzes already exist in the open. Its narrow launch category: the learner **enters the body spatially, watches cause become effect over time**, switches the same visual beat between Layperson and Clinical narration, and can resolve **each factual claim to a curated source**.

> Launch promise: **“Fly through a heart attack from plaque rupture to tissue death.”**

> *pāl* (पाल) — guardian, protector, companion · *pal* (पल) — a moment · *dawn* — where every voyage begins. A family name lives inside this one, and its bearer flies every journey as **SPD**, the co-pilot.

Scope of the uniqueness claim: a bounded GitHub reconnaissance (2026-08-16, `docs/research/github-recon-evidence.md`) found no inspected open-source project providing this end-to-end combination; that is **not** asserted as proof that no competing product exists.

- **License:** code MIT · PalDawn-authored and compatible derived content/asset packs CC BY-SA 4.0; upstream material additionally retains its exact source license and lineage record
- **Hosting:** 100% free tier — static GitHub Pages; immutable versioned GLB packs later streamed from GitHub Releases; no backend, no paid services
- **Status:** Foundation pass complete (scaffold + provenance gate). No anatomy assets, no clinical content yet.
- **Not medical advice.** Education only — never diagnosis or personalized triage. Any user-facing context about a *suspected heart attack* must direct the person to **contact local emergency services immediately**.

---

## 1. Product pillars

| Mode | What it is | Who it serves |
|---|---|---|
| 🎬 **Journeys** (the wedge) | Cinematic causal phases of a disease — plaque rupture → thrombus → occlusion → ischemia → infarction — with synchronized Layperson ↔ Clinical narration and claim-level citations | Everyone |
| 🕳️ **Inside mode** | First-person fly-through *inside* vessels/airways/nerves — the part that makes cause-and-effect spatial | Everyone |
| 🧭 **Atlas** | Full-body semantic zoom + search → fly-to (P2; commodity on its own — recon showed polished organ explorers already exist) | Everyone |
| 🔬 **Research mode** | Curated source metadata + canonical links pinned to the structure on screen | Clinicians + students |

**Depth dial:** every beat carries two narration tracks (Layperson ↔ Clinical) over the same scene.

**SPD — the co-pilot.** Every journey is flown with a companion character, **SPD** (in-universe: *Somatic Pathfinding Droid*; the initials privately honor the founder's father, the app's namesake). SPD narrates both depth tracks, points at what the camera is seeing, and carries the safety lines — wherever suspected-heart-attack symptoms are discussed, it is SPD who says **"contact your local emergency services immediately."** SPD explains; SPD never diagnoses. **Later:** EN + हिन्दी i18n, PWA offline.

---

## 2. The zoom model

Staged semantic zoom — L0 body → L1 system → L2 organ → L3 structure → L4 inside (lumen) → L5 stylized micro — with portal-style transitions during camera motion. No engine streams 9 orders of magnitude in one mesh; every product that feels continuous stages it. A HUD scale bar keeps the science honest. An explicit **semantic-stage state machine** owns L0–L5; geometric LOD (`THREE.LOD` hysteresis) is a rendering detail beneath it, never the stage driver.

### The P0/P1 anatomy route (representative, data-driven)

Canonical route in data: **left aortic sinus / aortic root → left coronary ostium → left main coronary artery → LAD**.

- The **ostium is not exposed on the heart exterior**. P0 therefore approaches along the **exterior epicardial vessel** and **portals into the proximal LAD**. If a later sequence enters through the ostium, it must enter the **aortic-root lumen first**.
- **Coronary anatomy varies** between people; the route is presented as *one representative/common* anatomy, and the P1 journey as *one representative/common acute-MI mechanism* — not the definition of every heart attack.
- Route data uses project IDs (`structure:coronary.lad`). FMA IDs, TA2 IDs, mesh IDs, mapping provenance/status/confidence, and reviewer live in **separate fields**; FMA↔TA2 equivalence is **never inferred by label matching**.

---

## 3. Engine decision (locked) and P0 exclusions

Council review (3 lenses, unanimous): **Three.js + React Three Fiber**, stable **WebGL2** path for P0; WebGPU/TSL stays deferred. Full stack (locked): **Vite + React + TypeScript + three + @react-three/fiber + @react-three/drei + Zustand + @react-three/postprocessing.**

Do not introduce libraries outside the locked stack or the adoption-candidate list (§7) without new primary-source evidence and separate authorization.

**Explicitly excluded from P0:** AMI, NiiVue, `r3f-scroll-rig`, `three.quarks`, ShaderParticleEngine, lamina, Theatre.js (Studio is AGPL; core stays out of P0 regardless). `three-custom-shader-material` is considered **only if** a measured stock-material prototype fails a defined requirement.

---

## 4. Graphics approach — P0 technique directives

1. **Materials:** stock `MeshPhysicalMaterial` first (normal map, roughness, restrained clearcoat). Authored thickness-map SSS (three.js `SubsurfaceScatteringShader` pattern) is reserved for the hero heart exterior later, and only against a measured baseline.
2. **Lumen (inside-vessel):** rasterized **inward-facing swept tube** along the shared route, stock material + cheap fog. **No raymarching in P0.**
3. **Portal transition:** prototype drei `MeshPortalMaterial` with a **preloaded/aligned lumen scene** and a measured dual-scene blend; fallback is an **opaque-wall/fog swap**. The dive must survive reduced-motion (see §6: a non-fly-through route must exist).
4. **Blood:** analytic WebGL2 instanced RBCs — static per-instance attributes (phase, speed, radial offset, roll, seed) + uniform time sampling one shared route/frame lookup; **no per-frame CPU matrices, no GPGPU** until measured behavior requires history-dependent simulation (clot interaction, turbulence). 10K/25K/50K tiers and a 5–10K point-sprite fallback are **provisional until measured**.
5. **One normalized route/frame lookup** feeds the deterministic camera rail, the inward-facing tube, wall-flow UVs, and blood placement — a single source of truth for “where is s ∈ [0,1] on this vessel.”
6. **Pathology as data:** spreading states (ischemia wavefront) as material masks driven by scene params. The proposed RGBA mask-channel packing and pack budgets are **experiments, not facts**, testable only after the asset pipeline exists; medically reviewed pathology authoring stays deferred.

---

## 5. Performance gates (preserved) and the proof protocol

| Budget | Desktop target | Mobile floor |
|---|---|---|
| Frame rate | 60 fps | 30 fps |
| Frame-time proof metric | **p95 ≤ 16.7 ms** | **p95 ≤ 33.3 ms** |
| On-screen triangles | ≤ 1.5 M | ≤ 400 K |
| Draw calls | ≤ 300 | ≤ 120 |
| Core JS | ≤ 500 KB gzipped | same |
| First interactive scene | < 5 s (declared fast-4G profile) | < 8 s |
| KTX2 textures | ≤ 2K hero / ≤ 1K standard | ≤ 1K |

**A valid performance report must name:** hardware, OS, browser + version, viewport, DPR, build SHA, quality tier, network profile, warm-up procedure, run count, raw results, and measurement method. Browser CPU/GPU memory is reported **as an estimate** whenever direct measurement is unavailable. Particle counts, pathology RGBA packing, and GLB pack-size figures remain **provisional until measured**. The v0.1.0 desktop WebKit measurements and their explicit unproven gates are recorded in `docs/performance/v0.1.0.md`; they do not validate physical-mobile, fast-4G, Safari, anatomy, or clinical-content performance.

**Comfort/accessibility gates (preserved):** reduced motion, FOV/vignette comfort controls, captions/transcripts, keyboard operation, color-independent pathology cues, respectful no-gore presentation.

---

## 6. Content architecture

```
content/
├─ topics/      # per-structure/condition MDX (content tooling: P1+ candidate, not locked)
├─ journeys/    # journey scripts (schema below)
└─ schema/      # JSON Schemas; CI-validated
```

**Journey schema v0 (minimal linear; backlog item 9):** schema version; immutable pack IDs + digests; prefetch list; entry/exit actions; timeline/rail reference; scene parameters; two-depth narration; **claim-level references**; deterministic gates/`next`; and a **reduced-motion route** (a non-fly-through path through the same beats). **Deferred:** branches, variables, choices, quizzes, assessment, general checkpointing.

**Content state:** every factual beat is a clearly marked **unpublished placeholder** until reviewed by a named qualified human — recording reviewer, date, status, claim scope, and sources. **Citations do not constitute medical approval.** The assistant building this project cannot self-certify medical or anatomical accuracy.

---

## 7. Sources, licensing reality, and adoption candidates

### Knowledge sources — what may actually be ingested

| Source | May use | Must not |
|---|---|---|
| **MedlinePlus** health-topic summaries (public domain) | Yes, under its content rules, credited exactly: `Source: MedlinePlus, National Library of Medicine.` | A.D.A.M. content, ASHP monographs, protected images |
| **PubMed / NCBI Bookshelf / StatPearls** | Metadata + canonical links (StatPearls is CC BY-NC-ND) | Ingesting abstracts or prose into the content pack |
| **WHO fact sheets / GHO** | Cited epidemiology claims | — |
| **OpenStax A&P** (CC BY 4.0) | With attribution | — |

### 3D assets — per-object approval only

**Z-Anatomy is not approved wholesale:** its repository-level CC BY-SA declaration coexists with listed **CC BY-NC / NC-SA third-party models** (e.g., inner ear, kidney). Objects are approved **individually**, each with a provenance record tracing to BodyParts3D CC BY-SA 2.1 JP, Z-Anatomy's own CC BY-SA 4.0 work, or another compatible license. If no suitable object passes, the fallback is a **from-scratch, visibly synthetic/non-anatomical engineering placeholder**, labeled as such and excluded from anatomical/clinical claims (not yet created).

### Provenance precedes adoption

Before any direct dependency, vendored code, asset, dataset, or content item is installed/imported/adapted/used, a **passing provenance record** is created under `pipeline/provenance/records/` (schema + deterministic validator + fixtures live there; Node built-ins only). Fail-closed on unresolved license/creator/source. Denylist: GPL/AGPL code, CC BY-NC family, unlicensed material. CC BY-SA never lands in MIT code zones. Transitive npm packages are covered by the preserved lockfile + `app/scripts/license-inventory.mjs` denylist check, not hand records. Qualified-human review is required only for medical/anatomical subjects; pure code/tooling records use `not_applicable` + rationale.

### Adoption candidates — pinned; **reverify at use, then record, then adopt**

| Candidate | License | Role | Pin |
|---|---|---|---|
| glTF Transform | MIT | asset validation/optimization/compression | `b539631e` |
| Blender glTF-IO (bundled exporter) | Apache-2.0 | export boundary; never vendored | `0bcc09ef` |
| meshoptimizer / gltfpack | MIT | benchmarked optimizer/simplifier candidate | `97bbdce4` |
| drei `MeshPortalMaterial` | MIT | exterior→lumen transition pattern | `ffa15b95` |
| three.js curves/`TubeGeometry`/`CurveModifier`/SSS example | MIT | route/frame + later material references | `e98a462c` |
| BodyParts3D (Moerman repo) | code MIT / data CC BY-SA 2.1 JP | FMA-ID inventory + mesh-defect knowledge | `f0eeb6e8` |
| three-mesh-bvh | MIT | later static-mesh occlusion/picking | `75a70462` |
| Z-Anatomy models | per-object approval only | audited heart/coronary meshes, TA2 terms | `ebdd5edf` |
| cyanheads PubMed client patterns | Apache-2.0 | deferred clean subset: request queuing/NCBI normalization | `24117581` |

---

## 8. Phases

| Phase | Scope | Exit |
|---|---|---|
| **P0 · Technical slice** | Beating-heart **exterior**; follow the visible **epicardial coronary route**; **portal into the proximal LAD**; **rasterized LAD lumen**; **analytic blood-flow architecture**; **reduced-motion route**; **asset/provenance gate**; **measured WebGL2 performance** (per §5 protocol) | The dive runs end-to-end on approved/synthetic assets with a valid performance report |
| **P1 · Heart-only Heart Attack journey** | Plaque rupture → thrombus → LAD occlusion → ischemia wavefront → infarction → symptom mapping; Layperson/Clinical narration; claim-level citations; framed as **one representative/common acute-MI mechanism** | A named qualified reviewer approves every published beat |
| **P2 · Full-body L0–L3 atlas + search breadth** | Semantic zoom over the body, search → fly-to, structure IDs at scale | Search any covered structure → cinematic arrival + cited info |
| P3+ · Roadmap | Further journeys along WHO top causes of death (2021 GHE: ischaemic heart disease, COVID-19, stroke, COPD, lower respiratory infections, lung cancers, Alzheimer's/dementias, diabetes, kidney diseases; 10th slot pending verification) + Dengue regional spotlight; Research mode; i18n; PWA | — |

**v0.1 interpretation:** First Light completes the P0 **systems** acceptance
path using the permitted visibly synthetic fallback. It does not claim a
beating-heart anatomy model, a representative LAD route, or medically
meaningful flow. Those parts remain blocked on compatible per-object assets
and qualified-human review.

### Ordered technical backlog

1. ✅ Universal provenance schema, allowlist, deterministic validator, valid/invalid fixtures.
2. ✅ Minimal locked-stack WebGL2 scaffold: Pages base-path support, quality-tier shell, reduced-motion setting, typecheck, production build.
3. ✅ Audited nine exact Z-Anatomy objects plus one explicit aortic-root absence; all remain blocked. Created the permitted visibly synthetic fallback for v0.1.
4. ➖ Deterministic Blender → GLB pipeline deferred until an external asset is separately approved; v0.1 has no binary asset to process.
5. ✅ Synthetic pulsing-shell stock-material, lighting, tier, and post-processing baseline. Anatomical beating-heart material work remains deferred.
6. ✅ One normalized lookup feeds camera rail, guide, swept inward corridor, and analytic flow placement. Medical structure IDs/mappings remain separate and unresolved.
7. ✅ Bounded `MeshPortalMaterial` preview plus opaque fog-swap reduced-motion fallback.
8. ✅ Analytic WebGL2 instanced **synthetic flow markers** use static attributes + uniform time with 750/2,000/4,000 tiers and no per-frame CPU matrices. Blood/pathology simulation remains deferred.
9. ✅ Bounded five-stage linear journey data, deterministic next/previous, two narration depths, transcript, and stage-cut reduced-motion route. Clinical claims/references are absent by design.
10. 🔄 v0.1 exterior/portal/corridor measurements are recorded in `docs/performance/v0.1.0.md`; pathology-channel transport and reviewed pathology authoring remain deferred.

---

## 9. Medical guardrails

- **Education only; never diagnosis or personalized triage.**
- Any user-facing context about a suspected heart attack directs the person to **contact local emergency services immediately**.
- **Citations ≠ medical approval.** Factual beats stay clearly-marked unpublished placeholders until a **named qualified human** reviews them (reviewer, date, status, claim scope, sources recorded).
- The AI assistant may not self-certify medical or anatomical accuracy.
- MedlinePlus usage follows its content rules with the exact credit line; PubMed/Bookshelf/StatPearls/A.D.A.M./ASHP prose is never ingested — metadata and canonical links only.
- Anatomy is presented as representative; variation is stated.

---

## 10. GitHub plan

Repo layout, workflows (`ci.yml`, `deploy.yml`; local files only, no hosted run proven), owner CODEOWNERS routing over `content/`, `data/`, provenance, and workflows, issue templates (bug / journey proposal / accuracy report), Discussions for recruiting medical reviewers, big-binary strategy (GLB packs on Releases, never in git; LFS avoided), branch protection, and the launch sequence (three.js showcase → Show HN → med-ed channels) remain the plan. CODEOWNERS is not a medical-review gate: a qualified-reviewer team and branch-protection requirement must be configured before medical content can publish. The audit pass did not commit, push, deploy, or configure GitHub settings.

---

## 11. Top risks

| Risk | Mitigation |
|---|---|
| Scope explosion | Depth-first: P0 slice → P1 single journey. Backlog items 3–10 stay deferred until their turn. |
| License contamination (NC objects inside Z-Anatomy; share-alike in code zones) | Per-object provenance records; validator rejects NC + share-alike-in-code; directory-scoped licenses. |
| Medical-accuracy reputation | Named-reviewer gate; placeholder status until approved; emergency-services directive; accuracy issue template. |
| WebGPU churn | Locked WebGL2 for P0; WebGPU/TSL deferred. |
| Fresh-major-version stack (Vite 8, TS 7) | Exact pins + lockfile; typecheck/build verified this pass; upgrade deliberately. |
| GH Pages bandwidth | Assets on Releases/CDN; Pages carries only code+content. |
| Solo burnout | Recruit shader artist + medical reviewer during P0–P1. |

---

## 12. Release status

**v0.1.0 · First Light (2026-08-20):** the foundation became a complete
synthetic technical voyage. The release retains the locked WebGL2 stack and
provenance gate; adds the shared route, procedural shell, portal/fog handoff,
inward corridor, analytic flow, five-stage state machine, SPD narration,
transcript, accessibility/comfort controls, release-contract tests, CI, and
Pages publication. The exact bundle and runtime measurements are in
`docs/performance/v0.1.0.md`.

Still absent by design: third-party 3D assets, approved anatomy, medical
content, patient data, pathology, clinical claims, and qualified-human medical
review. The release is P0 systems proof only; the P1 Heart Attack journey stays
blocked.

---

## Attribution & sources

- Recon evidence: `docs/research/github-recon-evidence.md` (pinned primary sources)
- Mortality data: [WHO — Top 10 causes of death](https://www.who.int/news-room/fact-sheets/detail/the-top-10-causes-of-death)
- Candidate upstreams: see §7 table and `CREDITS.md`; per-dependency license texts in `app/THIRD_PARTY_LICENSES.md`; provenance records in `pipeline/provenance/records/`
