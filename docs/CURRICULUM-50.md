# Curriculum 50 and multiscale engine plan

## Decision

PalDawn will grow from ten source-linked previews into a **50-condition global
burden curriculum**. “50” is a coverage target, not a claim that one universal
top-50 disease ranking exists. Global deaths, disability-adjusted life years
(DALYs), prevalence, organ-system breadth, and mechanism diversity answer
different questions and can produce different orders.

The implementation therefore keeps two facts separate:

- the ten current previews preserve the WHO 2021 global mortality ranking;
- the additional forty entries form a provisional curriculum queue, with no
  rank, educational copy, mechanism, or visual-authority claim.

The selection basis starts with the [WHO Global Health Estimates
2021](https://www.who.int/data/gho/data/themes/theme-details/GHO/mortality-and-global-health-estimates)
death and DALY views and the [IHME GBD 2021 data
resources](https://ghdx.healthdata.org/gbd-2021/results). Before any queued
condition becomes an educational journey, its exact source dossier and
selection rationale must be recorded and the medical content must pass the
existing named-qualified-review gate.

## What this slice implements

- `app/src/data/diseaseCatalog.ts` is the code-owned registry for exactly 50
  unique condition IDs across 12 system families.
- Every existing disease in `diseases.ts` maps one-to-one to an explorable
  curriculum entry.
- The remaining 40 records are planning metadata with no journey ID and
  `reviewStatus: 'not-started'`.
- The landing-page catalog separates **Explore now** from **Build queue**,
  searches condition names/system codes, filters by organ system, and exposes
  the common L0 Body → L5 Cellular depth contract.
- The catalog says “coverage plan, not worldwide rank” and keeps the zero
  reviewed-module count visible.

This slice does not add forty medical explanations, anatomy assets, diagnostic
logic, patient data, or a claim that the curriculum is clinically complete.

## One mechanism, two reading depths

Plain English and Clinical terms must continue to share the same time,
structure selection, camera, and visual state. Easy mode changes vocabulary,
scaffolding, and the amount of assumed background knowledge; it must never
change the underlying mechanism or silently remove uncertainty.

For medical students, a reviewed future condition pack should add:

1. a whole-person orientation and the affected systems;
2. a causal mechanism timeline with reversible playback;
3. organ, tissue, cellular, and—only when useful—molecular scenes;
4. normal-versus-condition comparison at the same camera and time;
5. terminology, pathology, and consequence layers;
6. claim-level sources, assumptions, variation, and reviewer scope;
7. retrieval prompts that test ordering and causal links, not trivia.

## The app should learn—but locally and honestly

PalDawn should adapt to demonstrated learning, not infer mastery from time on
screen. A later local-only learner model can record:

- which concepts a learner explicitly marked as understood or uncertain;
- answers to retrieval questions and confidence ratings;
- repeated causal-order mistakes;
- the reading depth and visual scale that helped resolve a mistake;
- a spaced-review queue derived from those explicit interactions.

The learner model must remain inspectable, exportable, and resettable. It must
not collect symptoms, diagnoses, medications, or patient information, and it
must not tell a learner that they are clinically competent.

## Rendering-engine decision

**Keep Three.js + React Three Fiber. Do not build a game engine.** PalDawn
already has the right browser-native renderer, React state model, semantic
scale state machine, deterministic mechanism resolver, accessibility shell,
and static deployment shape. Replatforming would spend the next phase
rebuilding working product infrastructure instead of producing anatomy,
histology, mechanisms, and review evidence.

The target is a game-engine-quality **content and scene pipeline**:

| Layer | Choice | Why |
|---|---|---|
| App shell | Vite + React + TypeScript + Zustand | Existing accessible controls, local study state, and deterministic navigation stay intact. |
| Runtime 3D | Three.js + React Three Fiber + drei | Direct browser integration, staged scene composition, instancing, and current WebGL2 fallback. |
| Authoring | Blender | Free/open source DCC for mesh cleanup, rigging, UVs, animation, and authored LODs. Artwork remains separately licensed from Blender itself. |
| Exchange | glTF/GLB | Versionable scene-pack boundary with explicit nodes, materials, animations, and extensions. |
| Deterministic processing | glTF Transform | Reproducible inspection, pruning, deduplication, resizing, compression, and manifest checks. |
| Geometry optimization | meshoptimizer / `gltfpack` candidate | GPU-oriented mesh optimization, simplification, quantization, and optional mesh compression. |
| Texture delivery | KTX2 + Basis Universal candidate | GPU texture delivery with device transcode paths and bounded texture tiers. |

References: [Three.js WebGPU renderer](https://threejs.org/manual/en/webgpurenderer),
[React Three Fiber performance guidance](https://r3f.docs.pmnd.rs/advanced/scaling-performance),
[Blender licensing](https://www.blender.org/about/license/), [glTF
Transform](https://github.com/donmccurdy/glTF-Transform), and
[meshoptimizer](https://github.com/zeux/meshoptimizer).

### Why not Godot now?

Godot is a credible MIT-licensed open-source game engine, but its web export is
a separate WebAssembly/WebGL application boundary. Adopting it would duplicate
the current React interaction shell, state/history model, offline behavior,
accessibility work, and browser test harness. Its current web documentation
also describes WebGL2-only rendering and platform limitations. Reconsider
Godot only if PalDawn becomes a native-first/XR product and a measured prototype
beats the browser-native stack on a named requirement.

### WebGPU migration rule

Three.js now offers `WebGPURenderer` with WebGL2 fallback and TSL materials, but
the official guide still labels it experimental and documents migration gaps
for custom shader materials and the legacy postprocessing stack. PalDawn will:

1. keep the proven WebGL2 renderer as the production baseline;
2. isolate future materials behind a small renderer-neutral parameter contract;
3. build one WebGPU/TSL vertical prototype of a cellular scene;
4. compare visual parity, p95 frame time, load cost, memory estimate, Safari,
   reduced motion, and recovery behavior;
5. migrate only if the prototype passes and the fallback remains correct.

## Multiscale scene-pack architecture

No single mesh should pretend to span a whole body and a cell. Each condition
journey references staged, versioned scene packs:

```text
condition catalog
  → reviewed journey manifest
    → semantic scale graph (L0–L5)
      → structure IDs + transition contract
        → versioned scene pack + provenance manifest
          → mechanism-frame resolver
            → renderer capability tier
```

Each scene pack must declare:

- immutable pack ID, schema version, content digest, and compatible app range;
- structure IDs and separately evidenced terminology mappings;
- source object, creator, license, attribution, transformations, and output
  digest for every imported asset;
- units, coordinate frame, scale range, bounding/containment envelope, and
  attachment anchors;
- desktop/mobile LODs, triangle/draw-call/texture budgets, and decoder needs;
- normal and condition-state channels without baking unreviewed claims into
  filenames or materials;
- reduced-motion and text equivalents;
- medical/anatomical review status, named reviewer, date, claim/visual scope,
  and unresolved limitations.

The runtime should keep only the current scale and its transition neighbors in
memory, preload the next pack, reuse geometry/materials, instance repeated
cells, and stop rendering when a scene is at rest. “More detailed” means better
shape, topology, spatial containment, material response, scale cues, and
mechanism synchronization—not an unlimited polygon count.

## Build order

### C50.0 — Curriculum registry and discovery (this slice)

Exit: 50 unique entries; 10 exact current journey mappings; 40 fail-closed
plans; system/search/status filters; desktop/mobile accessibility coverage.

### C50.1 — Disease-pack schema and hypertension dossier

Use hypertension as the next planning vertical because it exercises vessel
wall, pressure, heart, brain, kidney, and long-duration change. First deliver
the schema, source ledger, claim inventory, normal-versus-condition storyboard,
and review packet. Do not publish the journey before named qualified review.

### C50.2 — Shared cardiovascular scene family

Build reusable, provenance-approved heart, artery, arteriole, capillary, and
tissue-perfusion packs. Reuse them across ischaemic heart disease,
hypertension, stroke, heart failure, and atrial fibrillation through data—not
condition-specific forks of the renderer.

### C50.3 — Cellular visual grammar

Prototype three reusable micro-environments: vessel wall, alveolus, and
cell-signalling membrane. Establish cell density, membrane/material language,
depth cues, labels, normal/condition comparison, instancing, and performance
budgets before producing dozens of one-off cellular scenes.

### C50.4 — Adaptive learning loop

Add local retrieval prompts, confidence, misconception tags, and spaced review
over reviewed concepts. Plain and Clinical modes share mastery state but use
different scaffolding.

### C50.5 — WebGPU/TSL evidence branch

Run the bounded prototype and publish a renderer decision record. No renderer
migration occurs on visual enthusiasm alone.

## Publication gate

A queued condition can move to **Explore now** only when all of these pass:

1. selection rationale and primary-source dossier;
2. claim-level source resolution with no dangling references;
3. per-object asset provenance and compatible license evidence;
4. deterministic pack build and digest verification;
5. containment, scale, reduced-motion, keyboard, text-route, and performance
   checks;
6. named qualified review of the recorded medical and visual scope;
7. explicit remaining uncertainty and variation;
8. exact-source, CI, browser, and deployed-artifact verification.
