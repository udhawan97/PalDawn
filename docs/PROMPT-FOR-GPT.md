> **Historical document.** Written when the project was named Antaryaan (since renamed **PalDawn**, 2026-08-20). Kept unchanged as the record of the round-trips that produced the recon dossier and foundation-pass directive.

# Round-trip prompt: Antaryaan design review

**How to use:** paste everything below the line into ChatGPT (or any frontier model). It will critique the plan, answer the open technical questions, and end with a **"PROMPT BACK TO CLAUDE"** block. Copy that block back to Claude to kick off the build.

---

You are acting as a **skeptical principal graphics engineer and game director** doing a design review before a solo-founder open-source project commits to its architecture. Be adversarial where it matters, concrete everywhere. No flattery, no hedging, no code — architecture and technique only. If you assert a fact about a library or platform, mark it (verified) or (from memory).

## The project

**Antaryaan (अंतर्यान — "the inner spacecraft")** — an open-source, browser-based 3D exploration of the human body. Galaxy-style semantic zoom: full body → organ system → organ → *inside* vessels/nerves (first-person fly-through) → stylized micro scale. Search any topic and the camera flies there. Cinematic **disease journeys** play out in phases with two-depth narration (Layperson ↔ Clinical): heart attack first (plaque rupture → occlusion → ischemia wavefront → infarct → symptom mapping), then cancer metastasis, type 2 diabetes, dengue, eventually all WHO top-10 killers. A Research mode pins curated sources (StatPearls/PubMed/MedlinePlus/WHO) to whatever structure is on screen. Education, never diagnosis.

## Decisions already locked (do NOT relitigate unless you can show a fatal flaw)

1. **Stack:** Vite + React + TypeScript, Three.js + React Three Fiber + drei + Zustand + @react-three/postprocessing. Stable WebGL2 renderer path as default; WebGPU/TSL adopted per-subsystem (particles first) as R3F v10 hardens. A 3-perspective council review chose this unanimously over Babylon.js (contributor ecosystem ~47× larger on npm; medical-viz precedent is overwhelmingly Three.js; single-renderer WebGL2 fallback).
2. **Assets:** Z-Anatomy meshes (CC BY-SA 4.0, derived from BodyParts3D CC BY-SA 2.1 JP) processed in Blender → glTF + Draco/meshopt + KTX2, LOD chains. Directory-scoped licensing: code MIT, content/models CC BY-SA 4.0.
3. **Distribution:** 100% free tier. Static site on GitHub Pages; big GLB packs on GitHub Releases (fetched at runtime, optionally via jsDelivr); nightly GitHub Action pre-caches API data (MedlinePlus, PubMed E-utilities, StatPearls, WHO) into static JSON. No backend, ever, in v1.
4. **Zoom model:** staged semantic zoom (L0 body … L5 micro) with portal-style transitions during camera motion — NOT one continuous mesh. HUD scale bar.
5. **Scope discipline:** P0 = beating heart + dive-into-LAD fly-through + instanced blood particles at 60fps mid-tier laptop. P2 = the complete Heart Attack journey. Breadth only after that.
6. **Name is final:** Antaryaan.

## Open questions — give a concrete recommendation with trade-offs for each

1. **Portal transitions:** best technique for the L2→L4 dive (organ exterior → inside the artery) without a visible cut — cross-fade dual scenes? camera-inside-mesh with backface lumen shell? render-target portal? What do space-scale games actually do that transfers?
2. **Lumen rendering:** inside-vessel look — inverted-normal tube meshes with parallax + flow maps vs SDF raymarching vs impostor volumetrics. Which hits 60fps on integrated GPUs while still looking "insane"?
3. **Particle architecture:** advecting 10–50k instanced RBCs along arbitrary vessel splines on WebGL2 (no compute shaders) — GPGPU ping-pong textures vs CPU spline sampling + instance matrix updates vs baked flow textures. Recommend one primary + one fallback.
4. **Ischemia wavefront:** data-driven material masks for spreading pathology (infarct territory, tumor growth, capillary leak) — vertex-color territories vs mask textures vs 3D noise field with threshold animation. Which authoring workflow can a Blender-artist contributor actually follow?
5. **Scene/state schema:** critique the journey "beat" format (camera rail ref + scene params + two-depth narration + citations, JSON-Schema validated in CI). What's missing for interactivity (quizzes? branch points? "look at X" gates)?
6. **Asset packs:** per-body-system GLB packs on GitHub Releases fetched at runtime — sane pack granularity? manifest/versioning scheme? How to keep first-load < 5s on 4G while the full atlas is ~hundreds of MB?
7. **Search → fly-to:** structure ID graph + client-side MiniSearch — what ontology should anchor IDs (FMA? Terminologia Anatomica?) so med contributors and future integrations don't fight the naming?
8. **The one thing you'd cut:** given a solo builder + volunteers, which planned feature most endangers P2 shipping, and what's the cheapest credible substitute?

## Required output format

1. **RED-TEAM CRITIQUE** — top 10 weaknesses/risks in the plan, ranked by expected damage, one line each: risk → consequence → cheapest mitigation.
2. **ANSWERS** — the 8 questions above, numbered, concrete recommendation first, then trade-offs (2–4 bullets each).
3. **WHERE I'D OVERTURN** — anything (except locked items) you'd change, with the evidence bar you'd need.
4. **=== PROMPT BACK TO CLAUDE ===** — end with a fenced block addressed to Claude (who has the full build plan in `docs/PLAN.md` of the repo). It must contain: (a) the agreed technical decisions from your answers in imperative form, (b) deltas/amendments to the plan, (c) a concrete P0 task list (≤10 items) Claude should execute first, (d) open items explicitly deferred. Write it so Claude can start building immediately without re-reading this conversation.
