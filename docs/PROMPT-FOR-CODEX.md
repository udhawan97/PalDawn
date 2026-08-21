> **Historical document.** Written when the project was named Antaryaan (since renamed **PalDawn**, 2026-08-20). Kept unchanged as the record of the round-trips that produced the recon dossier and foundation-pass directive.

# Round-trip prompt: Codex GitHub reconnaissance for Antaryaan

**How to use:** run this in Codex with internet/GitHub access enabled (it must actually open repos). If you've connected the `antaryaan` repo, Codex can also read `docs/PLAN.md`. When it finishes, copy its **"PROMPT BACK TO CLAUDE"** block back to Claude. Pairs with `PROMPT-FOR-GPT.md` (design red-team) — you can run both and bring back both blocks.

---

You are a senior real-time-graphics and open-source engineer running a **GitHub reconnaissance mission** for a project about to start building. Your job: find the best existing open-source work to adopt, adapt, or learn from — so we build on the shoulders of what's already out there — and turn it into concrete build directives. You MUST actually search GitHub and open the repos you cite (READMEs, license files, key source files). Mark every claim **(verified)** or **(from memory)**. No flattery. No full code dumps — pseudocode or ≤10-line snippets only where a technique needs illustration.

## The project

**Antaryaan (अंतर्यान — "the inner spacecraft")** — an open-source, browser-based 3D voyage through the human body. Galaxy-style **staged semantic zoom** (L0 full body → organs → structures → L4 first-person fly-through *inside* vessels/nerves → L5 stylized micro scale). Search anything → the camera flies there. Cinematic **disease journeys** in phases with Layperson ↔ Clinical narration: Heart Attack first (plaque rupture → occlusion → ischemia wavefront → infarct → symptom mapping), then cancer metastasis, type 2 diabetes, dengue, eventually the WHO top-10 killers. A Research mode pins curated sources (StatPearls, PubMed, MedlinePlus, WHO) to the structure on screen. Education, never diagnosis. Repo: `antaryaan` (full plan lives in `docs/PLAN.md`).

## Locked decisions — do NOT relitigate unless you find a fatal flaw

1. **Stack:** Vite + React + TypeScript, Three.js + React Three Fiber + drei + Zustand + @react-three/postprocessing. Stable WebGL2 path by default; WebGPU/TSL per-subsystem later.
2. **Assets:** Z-Anatomy meshes (CC BY-SA 4.0, derived from BodyParts3D CC BY-SA 2.1 JP) → Blender → glTF + Draco/meshopt + KTX2, LOD chains.
3. **Distribution:** $0 forever — static GitHub Pages, GLB packs streamed from GitHub Releases, nightly Action pre-caches medical-API data to static JSON. No backend, no paid services.
4. **Licensing split:** code MIT, content/derived models CC BY-SA 4.0 (share-alike chain honored in NOTICE.md).
5. **Scope:** P0 = beating heart + dive-into-LAD fly-through + instanced blood particles, 60fps on a mid-tier laptop. Flagship Heart Attack journey before any breadth.
6. **Name is final:** Antaryaan.

## Mission A — GitHub recon (the core)

Search each category; for every worthwhile find report: **repo · ~stars · last activity · license · what exactly to take (code / pattern / data / nothing-but-ideas) · integration cost (S/M/L)**. Seed leads are hints, not limits — beat them if you can:

1. **Anatomy/medical 3D web viewers** — seeds: `esma-dev-studio/anatomy-3d-viewer` (Vite+R3F+drei+Zustand), Z-Anatomy's own viewer repos, Open Anatomy / OABrowser, `FNNDSC/ami`, NiiVue. What UX/scene-graph/labeling patterns are proven?
2. **BodyParts3D / Z-Anatomy converters & pipelines** — anyone who already scripted OBJ/blend → glTF conversion, mesh cleanup, naming/ontology mapping (FMA IDs). This could save weeks in `pipeline/`.
3. **Semantic zoom & portal transitions** — drei `MeshPortalMaterial`, portal/scene-transition demos, "powers of ten"-style zoom experiments, LOD/impostor systems.
4. **Spline fly-throughs & camera rails** — tunnel/tube demos (`CatmullRomCurve3` + Frenet frames), scroll/timeline-driven camera rigs, Theatre.js sequences driving R3F cameras.
5. **GPU particles & flow fields on WebGL2** — GPGPU ping-pong (FBO) particle systems, curl-noise flow demos, instanced-mesh crowds — the blood-flow substrate.
6. **Organic/tissue materials** — approximated subsurface scattering for three.js, thickness-map wrap lighting, wet-specular shaders.
7. **3D annotation/label systems** — occlusion-aware labels, leader lines, `drei <Html>` patterns at scale.
8. **Medical-content harvesters** — MedlinePlus / PubMed E-utilities / NCBI Bookshelf fetchers in JS/TS suitable for a nightly GitHub Action.

## Mission B — answer these 8 with prior-art evidence

1. Portal transition technique for the organ-exterior → inside-artery dive without a visible cut.
2. Lumen (inside-vessel) rendering that hits 60fps on integrated GPUs: inverted tubes + flow maps vs raymarching vs hybrid.
3. Particle architecture for 10–50k RBCs advected along vessel splines on WebGL2 — primary + fallback.
4. Spreading-pathology masks (ischemia wavefront, tumor growth): vertex territories vs mask textures vs animated noise — and which workflow a Blender contributor can follow.
5. Critique the journey "beat" schema (camera rail ref + scene params + two-depth narration + citations, CI-validated): what's missing for interactivity (gates, branches, quizzes)?
6. Asset pack granularity + manifest/versioning for GLB packs on Releases; first load < 5s on 4G.
7. Structure-ID ontology: FMA vs Terminologia Anatomica as the anchor for search/deep-links/contributor naming.
8. The one planned feature you'd cut to protect P2 shipping, and its cheapest credible substitute.

## Mission C — credit & license compliance (non-negotiable)

- **MIT / Apache-2.0 / BSD / ISC code** → may be adopted with: source-URL + license comment at the adoption site, entry in `CREDITS.md`, Apache NOTICE preserved where required.
- **GPL / AGPL / unlicensed repos** → **never copy code.** Ideas only; flag explicitly as "clean-room reimplement."
- **CC BY-SA assets/data** → only into `content/` / asset packs (share-alike zone), never into MIT `app/`.
- Prefer npm dependencies over vendoring; vendor only small, stable snippets.
- Every recommended adoption must carry: `{ repo, license, what we take, where it lands (app/pipeline/content), attribution text }`.

## Required output — in this exact order

1. **RECON TABLE** — Mission A results grouped by category (only repos actually worth it; note dead/abandoned ones you rejected and why).
2. **ANSWERS 1–8** — recommendation first, then trade-offs (2–4 bullets), citing recon evidence.
3. **STEAL-THIS LIST** — top 10 concrete adoptions ranked by leverage (time saved × quality gained), each with license + landing spot.
4. **ATTRIBUTION BLOCK** — paste-ready `CREDITS.md` entries for everything in the steal-this list.
5. **=== PROMPT BACK TO CLAUDE ===** — a fenced block addressed to Claude (who has `docs/PLAN.md`): (a) agreed technical directives in imperative form, including which repos/patterns to adopt with their licenses; (b) deltas to the plan; (c) a P0 task list (≤10 items) to execute first; (d) explicitly deferred items. Written so Claude starts building immediately without reading this conversation.
