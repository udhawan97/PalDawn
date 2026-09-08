# PalDawn graphics rebuild

**Planning baseline:** 2026-09-07, local `main` at `dad34b7`.
**Status:** implementation plan. The [first graphics workbench](HEART-GRAPHICS-WORKBENCH.md)
now supplies original editable exterior artwork and an isolated static viewer.
Anatomical acceptance, public-app adoption, blood flow, and cinematic playback
remain outstanding; no clinical approvals have been delivered.

The [R3 engineering slice](VESSEL-FLOW-WORKBENCH.md) now adds an isolated
synthetic curved cutaway and deterministic cell-shaped flow fixtures. It
exercises containment and playback without claiming R3 anatomical acceptance,
physiological validity, exterior continuity, or measured performance.

Its variable-radius continuation adds uniform, tapered, and narrowed fixtures
using one radius lookup for walls and GPU cell lanes. Full-extent containment,
profile switching, and recovery are checked before the remaining branch and
exterior-continuity work. Static radius variation is implemented; deforming
walls and branch-junction acceptance remain outstanding.

## Outcome

Replace the symbolic body map with recognizable, spatially coherent organs,
surface vessels, living tissue materials, and a carefully directed journey
from body to organ to vessel interior to microscopic detail. Establish the
quality standard with one complete heart experience before expanding across
the body. The whole-body overhaul remains the destination.

The user's Unreal Engine comparison sets the ambition for visual craft and
playback. It does not require an engine migration. Retain the current
Three.js / React Three Fiber / WebGL2 delivery path for the first milestone;
evaluate its quality using an actual representative scene on target devices.
Do not promise engine parity before that measurement.

“Every small detail” becomes **progressive anatomical depth**. At body scale,
show body proportions and spatial relationships. At organ scale, show shape,
surface structure, and vessels. At tissue and cellular scale, load dedicated
representations with explicit magnification and educational simplifications.
Avoid displaying all scales simultaneously or enlarging cells without notice.

## Evidence: why the current scene cannot meet this target

Source inspection and a local native Safari check support these findings:

| ID | Current construction / observation | Required replacement |
|---|---|---|
| G01 | `OrganGeometry` chooses sphere, capsule, torus, or torus knot. The heart uses the default sphere. | Organ-specific authored meshes with characteristic silhouettes and reviewed landmarks. |
| G02 | `Organ` combines transparent physical materials, emissive color, wireframe shells, and inner duplicate geometry. | Predominantly opaque tissue, restrained reflections, surface textures, and explicit cutaways. |
| G03 | `VesselNetwork` draws a short list of straight-segment `Line` routes; phase signals connect organ anchors independently. | Connected, branching vessels with radii, wall surfaces, verified attachment points, and meaningful route semantics. |
| G04 | `FlowField` instances tiny flat circles in cyan/gold with additive blending. | Three-dimensional red-cell geometry and contained motion in the vessel interior. |
| G05 | Organ pulse, phase-marker motion, and flow use render-clock time. Camera progress has separate ownership. | A seekable playback frame that synchronizes camera, deformation, flow, visibility, and explanation. |
| G06 | Native Safari: selecting Heart in the heart-disease preview leaves the enlarged heart partly outside the visible scene area after settling, while many transparent layers remain visible. | Camera fitting against the actual unobscured viewport and selected mesh bounds; deliberate occlusion and layer isolation. |
| G07 | No GLB/glTF/Blender anatomy assets were found in the inspected main checkout; the public directory contains app identity and shell assets. | A reproducible asset pipeline and an approved, complete first anatomy pack. |

Evidence locations: [body scene](../app/src/scene/HumanSystemsScene.tsx),
[voyage scene](../app/src/scene/VoyageScene.tsx),
[flow field](../app/src/scene/FlowField.tsx),
[shared route](../app/src/journey/route.ts),
[asset audit](research/paldawn-heart-coronary-asset-audit.md).

The Safari check used a local Vite preview at port 4317: overview → Heart
disease → Heart close focus. It was a visual baseline inspection, not a
performance benchmark or full browser acceptance run. No current-state claim
is made about another branch, the deployed website, or previous releases.

## Visual direction and definition of detail

- **Form:** asymmetric organic silhouettes; credible proportions, thickness,
  landmarks, and attachment points. A heart must read as a heart under neutral
  lighting with no labels, wireframes, orbit rings, or glow.
- **Surface:** tissue color variation, appropriate roughness, subtle wet
  highlights, and fine normal detail. Use modeled geometry for silhouette and
  deep folds; texture maps for smaller surface variation.
- **Space:** consistent body coordinates, orientation, and units; organ
  containment and intended contacts; vessels follow their host surfaces and
  move with them. Document anatomical variants explicitly.
- **Lighting:** neutral key/fill lighting and subtle separation from the
  background. Interface accent colors should not repaint tissue with each
  disease selection. Keep selection indicators distinct from anatomy.
- **Exposure:** body layers disappear or open through intentional cutaways.
  Capped section surfaces avoid hollow-looking clipping artifacts. X-ray and
  exploded views are explicit optional modes, not the default material style.
- **Motion:** local deformation and attachment constraints, controlled camera
  acceleration, readable dwell time, and a stable horizon. Avoid whole-organ
  balloon scaling as the final contraction technique.
- **Microscopy:** explain when the view changes scale, density, time, or color
  conventions. Do not present sparse educational particles as measured blood
  concentration, a transparent corridor as literal optical visibility, or an
  authored flow field as a validated physiological simulation.

## First complete experience: body → heart → blood

Proposed storyboard, with editorial durations to tune during implementation:

| Shot | Approximate duration | What the learner sees | Completion condition |
|---|---|---|---|
| 1. Locate | 8 s | Recognizable body/torso, contextual chest landmarks, a clear target region. | Orientation and target are legible at desktop and mobile sizes. |
| 2. Reveal | 10 s | Controlled chest-layer reveal leading to an opaque heart with nearby anatomy retained for context. | No overlapping transparent clutter; the heart remains fully framed. |
| 3. Inspect | 18 s | Heart exterior, surface grooves, surrounding fat, and branching coronary vessels; controlled contraction. | Shape passes neutral-light review; vessels stay attached throughout motion. |
| 4. Explain the pump | 15 s | A deliberate chamber/valve cutaway, with flow direction tied to an authored cardiac cycle. | Chambers and valve motion share one timeline; scope is reviewed before publication. |
| 5. Follow the surface route | 12 s | Return to the exterior and follow a representative coronary route toward the proximal LAD. | Camera follows the actual displayed vessel; route identity is continuously understandable. |
| 6. Enter and magnify | 18 s | Explicit transition through a teaching cutaway into a separate lumen scene; reveal 3D blood cells. | No camera penetration of opaque tissue, scale ambiguity, or abrupt asset popping. |
| 7. Resolve | 12 s | Inspect the vessel wall and cell movement, then pull back to show where this region belongs. | The learner can pause, inspect, reverse, and return to the whole-body context. |

This roughly 90-second sequence is an editorial target, not biological elapsed
time. Actual pacing depends on comprehension and comfort checks.

The exterior-to-LAD entry is an educational cutaway. It must not imply that a
coronary ostium opens on the outer heart surface. An ostial-entry alternative
requires a separately authored aortic-root lumen route, as specified in
[the existing plan](PLAN.md).

Deliver the healthy structure-and-flow sequence first. Add the representative
plaque/occlusion/tissue-response journey only after its assets, causal beats,
and review evidence exist. Keep the other existing condition previews
explicitly conceptual during this migration.

## Asset production: the critical path

The existing Z-Anatomy heart/coronary records remain planned, pending, and
blocked. The repository's pinned audit found unresolved object lineage and
license evidence, incomplete geometry, and missing qualified review. A general
upstream license notice does not resolve those object-specific findings.

**Default approach:** audit direct, individually identifiable source geometry
for coverage, then author or repair the missing hero structures. Do not import
the previously blocked pack as a shortcut. If the free-source route cannot
supply sufficient geometry and rights, present a concrete commissioned-asset
brief and cost proposal before committing money or engaging a vendor.

| Asset group | Required content | Practical acceptance |
|---|---|---|
| Body/chest context | Body surface, chest landmarks, necessary ribs and adjacent structures. | One coordinate system; reviewed proportions and organ placement; detachable reveal layers. |
| Heart exterior | Recognizable base/apex, chamber contours, surface grooves, surrounding fat and major connections. | Front/back/side turntables in flat clay and final materials; no sphere-like substitute. |
| Heart interior | Separate chambers, walls, valve structures, and only the internal detail actually used by shot 4. | Labeled structure coverage; section-ready geometry; deformation does not create holes or implausible intersections. |
| Vessels | Hero coronary route and supporting arterial/venous context. | Continuous branches, taper, attachment, radius data, and a clear distinction between shown and omitted anatomy. |
| Lumen/wall | Branch-aware interior and cutaway wall layers for the hero route. | No flipped surfaces, open seams, or flow crossing solid wall boundaries. |
| Blood cells | Authored 3D red-cell shape; other cell types only when the lesson requires them. | Shape and relative scale reviewed; texture and motion remain legible without emissive glow. |
| Maps/deformation | Base color, normal, roughness, applicable occlusion/thickness data, and cardiac deformation controls. | Baked maps survive export; motion is reproducible; vessels follow the same deformation. |

For each object record: immutable source/version/path, creator and license
evidence, source digest, modifications, structure ID, anatomical scope and
variation, coordinate transform and units, material ownership, export recipe,
output digest, and exact review scope/status. Keep ontology mappings separate
from object identity. Record newly authored geometry and texture provenance too.

Pipeline deliverables: editable source → topology/UV/deformation checks →
deterministic GLB export → appropriate compression and detail tiers → validated
pack manifest → runtime load. Capture exporter/tool versions and verify actual
output; exporter success alone does not establish material or anatomy fidelity.

First asset milestone output is a **coverage ledger plus clay turntables**.
It must explicitly identify missing geometry, surfaces requiring repair, and
unresolved source rights. If the core heart mesh is inadequate, return to
asset work before adding texture or lighting polish.

## Rendering and playback design

### Retain the platform, replace the representation

The present stack already provides glTF loading and physical material options.
Three.js documents glTF compression/texture support in
[GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), and reflective
surface controls in
[MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html).
Those capabilities justify a measured browser prototype; they do not prove
the desired result or supply subsurface scattering automatically. Use stock
materials first. Consider a measured tissue-scattering extension only when
the hero model and lighting demonstrably need it.

Stage-specific asset packs should supply body, heart, lumen, and cellular
representations. Preload the next stage before moving the camera, then
transition with an aligned reveal or bounded fade. If loading fails, retain
the current readable scene and offer retry/text progression. Cap resident
packs, dispose replaced GPU resources, and verify offline/update behavior
without forcing all future anatomy packs into the initial app shell.

### A single playback frame

Proposed pure resolver: `resolveAnatomyFrame(playhead, sceneSpec, preferences)`.
It produces stage, camera pose/target, layer visibility, deformation phase,
flow phase, cutaway settings, active structure, caption, and source IDs.

All animated systems consume that same resolved time. Pause freezes the full
scene; scrubbing backward reconstructs the same frame without replaying prior
simulation; restart restores the same seed and start state. Asset readiness
must stop timeline advancement before a missing stage. Quality changes may
reduce geometry/particle count but must preserve the meaning and timing.

Keep free inspection as an explicit camera mode: orbit an organ with bounded
distance and a clear Resume journey action. Reduced motion uses stable views
and manual shot changes through the same explanation, without fly-through.
Keep displayed teaching time distinct from any eventual physiological time.

### Geometry and camera share spatial truth

Represent the hero vessel as a branch graph with centerlines, radii, local
frames, parent attachments, and structure IDs. A stable route/frame lookup
feeds lumen geometry, vessel-bound camera movement, and flow. Bound each cell
using its full geometry extent plus clearance, rather than constraining only
its center. Validate this across bends, branches, and animated radius changes.

Use seeded instancing for flow. Author distinct motion profiles when supported
by the lesson; avoid arbitrary random speeds presented as physiology. Define
entry/exit behavior and branch splitting before adding visible branches. Do
not let particles wrap from the route end to the beginning in view. Dense
bulk blood and magnified cells need different representations with a declared
transition, not giant red cells scattered across the whole body.

For framing, compute the unobscured scene rectangle from the responsive UI,
project selected object bounds into that space, and fit with breathing room.
Use actual model transforms and anchors rather than duplicated offsets.
Validate camera clearance, near clipping, and intentional occlusion along the
entire route. Avoid rapid FOV changes and involuntary orbit drift.

## Ordered implementation milestones

Effort is relative; asset availability and review turnaround prevent honest
calendar estimates until milestone R1 is complete.

| Milestone | Work / likely files | Exit evidence | Effort |
|---|---|---|---|
| R0 — Visual specification | This document; fixed body/heart/lumen views; final storyboard and detail coverage. | Agreed observable quality bar and baseline images from the actual app. | Small |
| R1 — Asset coverage and hero form | Existing provenance records; new asset coverage ledger; editable heart/chest source and clay turntables. | Usable organ-specific geometry, exact source rights, named review ownership, and a complete list of missing detail. | Large / critical path |
| R2 — Static anatomy viewer | Replace hero use of `OrganGeometry`; add pack loading under `app/src/scene/`; update `SceneCanvas.tsx`; structured layers and camera fit. | Body/heart scene recognizable without labels; correctly framed; no translucent overlap or broken attachment. | Medium–large |
| R3 — Vessel interior and blood | Adapt `journey/route.ts` contract; replace hero use of `FlowField.tsx`; branch/radius data and 3D cells. | Exterior/lumen continuity, contained particles, deterministic snapshots, stable performance at target quality. | Large |
| R4 — Cinematic playback | New pure frame resolver; integrate with `state/experience.ts`, `state/atlas.ts`, `VoyageScene.tsx`, and `ui/DiseaseExplorer.tsx`. | Complete storyboard with reliable pause, seek, back, restart, reduced motion, captions, and asset-failure recovery. | Large |
| R5 — Materials and finishing | Baked maps, deformation refinement, scene lighting, restrained postprocessing, detail tiers. | Matched clay/final-material views, complete playthrough recording, measured desktop/mobile performance. | Medium–large |
| R6 — Acceptance and publication | Browser tests, provenance, accessibility, Graphify refresh, build and review evidence. | All relevant software gates plus required anatomy/content approvals; release is separately authorized. | Medium + external review |
| R7 — Whole-body expansion | Apply the same pack/shot workflow to lungs/airways, brain/vessels, kidneys, digestion/liver/pancreas, then musculoskeletal and remaining systems. | Each organ family meets the same form, placement, micro-detail, and playback criteria before its preview is promoted. | Multiple large increments |

Preserve existing learning routes, local study data, text mode, source links,
and recovery during the migration. Use a development-only scene entry until
asset and content adoption requirements pass. Pure rendering infrastructure
can be developed with clearly synthetic fixtures while anatomical adoption is
pending. A convincing render does not constitute clinical validation.

## Acceptance: what “top notch” must demonstrate

1. **Form before effects:** clay views identify the heart and its major
   landmarks at front, back, and side angles. Labels and glow cannot rescue a
   failing silhouette. Anatomical placement and detail have scoped review.
2. **Spatial coherence:** no unintended organ penetrations, floating vessel
   branches, detached surfaces during deformation, wall leaks, or camera
   intersections. Explicit exploded/cutaway teaching views are distinguishable.
3. **Visible detail:** the agreed coverage ledger maps each promised detail to
   an actual asset, scale, camera shot, source, and review status. Unavailable
   detail is recorded as missing rather than replaced by decorative particles.
4. **Playback correctness:** play → pause → inspect → resume; seek both ways;
   jump between shots; restart; resize; change quality; reduced motion; switch
   to text; background/foreground; missing asset; WebGL loss/recovery. Compare
   full scene state at identical timestamps, including blood placement.
5. **Composition:** desktop wide, narrow portrait, and phone landscape keep the
   selected anatomy visible within the unobscured viewport. Labels remain
   readable; loading, menus, captions, and focus states do not cover the hero.
6. **Measured performance:** retain [existing performance budgets](PLAN.md):
   desktop p95 frame time ≤16.7 ms, mobile ≤33.3 ms; on-screen triangles ≤1.5M /
   400K; draw calls ≤300 / 120; core JavaScript ≤500KB gzip; first interactive
   scene <5s / <8s on the declared fast-4G profile. These are targets, not
   achieved results. Set pack byte/residency budgets after R1's first export.
7. **Honest evidence:** name build revision, browser/version, OS/hardware,
   viewport/DPR, quality tier, network profile, warmup, run count, raw results,
   and measurement method. Include an uninterrupted playthrough and fixed-time
   screenshots. A screenshot does not prove playback; automation's WebKit is
   not native Safari; emulated mobile is not physical mobile.

Run the existing appropriate app and browser suites, add behavioral tests for
new timeline and asset-recovery logic, and run provenance/license checks.
After code changes, refresh Graphify and corroborate one scoped query. Before
publication, check exact revision and all required content/asset approvals.

## Source and scope notes

- [NHLBI: How the heart works](https://www.nhlbi.nih.gov/health/heart) and
  [How the heart beats](https://www.nhlbi.nih.gov/health/heart/heart-beats)
  are starting references for content authoring. They are not detailed mesh,
  motion-parameter, or individual-anatomy validation data.
- [BodyParts3D's official license page](https://lifesciencedb.jp/bp3d/info_en/license/index.html)
  provides source-level terms; exact asset lineage, coverage, modification
  records, and intended redistribution still need verification before adoption.
- [The pinned repository asset audit](research/paldawn-heart-coronary-asset-audit.md)
  and [provenance rules](../pipeline/provenance/README.md) govern current
  candidate status. They do not establish that every newer upstream version
  has the same deficiencies.
- Web documentation was checked on 2026-09-07. Recheck candidate tool versions
  and capabilities against the installed/pinned versions at implementation.

**Immediate next implementation package:** R1's heart/chest coverage ledger,
source decision, and clay turntables, followed by R2's static viewer. Passing
that form-and-placement milestone is the prerequisite for the visual overhaul.
