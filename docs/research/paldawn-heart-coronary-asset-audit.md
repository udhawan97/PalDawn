# PalDawn backlog #3: heart/coronary per-object asset audit dossier

> **AUDIT DOSSIER — 2026-08-20.** This is not an asset
> approval, medical review, provenance record, or permission to import upstream
> material. No anatomy asset was added to PalDawn. Every target remains
> `usage_status: planned`, `approval.status: pending`, and medical review
> required/pending.

## Decision summary

- **Hold the entire pinned Z-Anatomy P0 set.** The exact Blender file contains
  identifiable heart and coronary objects, but neither the target objects nor
  their linked mesh/curve data contain an FMA ID, TA2 ID, creator, source, or
  per-object license. The repository-level attribution mixes BodyParts3D,
  Z-Anatomy work, and named third-party models, including NC-licensed material.
  It therefore cannot establish the exact lineage/license of any target object.
  Fail closed. **(verified: exact-pin binary and metadata inspection;
  [upstream README](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/ebdd5edf207af1dd765cc6796ad90b34add9799a/Readme.md),
  [license/attributions](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/ebdd5edf207af1dd765cc6796ad90b34add9799a/License.txt))**
- The requested Z-Anatomy “asset set” is not actually a uniform mesh set. The
  heart exterior is split across four open chamber meshes; the ascending aorta
  and coronary objects are open 3D Bezier curves; and the aortic-root collection
  has no anatomical root surface. **(verified: read-only inspection of the
  pinned [`Z-Anatomy.zip`](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/ebdd5edf207af1dd765cc6796ad90b34add9799a/Z-Anatomy.zip))**
- The pinned BodyParts3D snapshot has independently addressable, CC BY-SA 2.1
  Japan STL candidates for ascending aorta, left-coronary stem, LAD, LCx, and
  right-coronary trunk. Those files help identify FMA concepts and possible
  alternative source geometry, but they do **not** prove that the similarly
  named Z-Anatomy curve objects descend from those files. **(verified:
  [BodyParts3D README](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/blob/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61/README.md),
  [content license](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/blob/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61/LICENSE_content),
  exact-pin tree inspection)**
- **Recommended routing:** use the visibly synthetic engineering fallback unless
  a Z-Anatomy maintainer supplies an object-level source manifest, or separately
  audit the direct BodyParts3D vascular files as a different candidate pack.
  The latter still does not provide the P0 heart exterior or a single aortic-root
  object at this pin. **(verified engineering assessment from the evidence below)**

## Scope, pins, and method

The audit used only these immutable upstream snapshots:

| Upstream | Exact pin | Primary files inspected |
|---|---|---|
| Z-Anatomy/Models-of-human-anatomy | `ebdd5edf207af1dd765cc6796ad90b34add9799a` | [`Readme.md`](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/ebdd5edf207af1dd765cc6796ad90b34add9799a/Readme.md), [`License.txt`](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/ebdd5edf207af1dd765cc6796ad90b34add9799a/License.txt), [`TA2.csv`](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/ebdd5edf207af1dd765cc6796ad90b34add9799a/TA2.csv), [`Anatomy-shortcuts.py`](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/ebdd5edf207af1dd765cc6796ad90b34add9799a/Anatomy-shortcuts.py), [`Z-Anatomy.zip`](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/ebdd5edf207af1dd765cc6796ad90b34add9799a/Z-Anatomy.zip) |
| Kevin-Mattheus-Moerman/BodyParts3D | `f0eeb6e843380cfe6b83797cf8c3e1af74de5e61` | [`README.md`](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/blob/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61/README.md), [`LICENSE_content`](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/blob/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61/LICENSE_content), [`FMA.csv`](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/blob/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61/assets/BodyParts3D_data/FMA.csv), [`src/functions.jl`](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/blob/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61/src/functions.jl), five FMA-named STL files listed below |

The repositories were cloned into a disposable temporary directory, checked out
at the exact commits, and inspected read-only. `Z-Anatomy.zip` was unpacked only
in that temporary directory. The embedded `Startup.blend` DNA/data-block tables,
object types, object-to-data links, collection membership, mesh topology, and
curve splines were parsed without resaving the file using Blender's official
`tools/modules/blendfile.py` at commit
`ca5415dfdc33b536fedfff1ae7a431d0f5e8505a`. The exact repeatable inventory and
topology invocation is preserved in
`pipeline/provenance/tools/audit_z_anatomy_blend.py` and each draft record.
Names were also corroborated against raw strings. `TA2.csv` and `FMA.csv` were
parsed separately. An English-label match in one table was never used to infer
identity with an entry in the other. **(verified method)**

“Read-only” here means the pinned upstream checkout, `.blend`, and PalDawn asset
zones were never modified or populated. The reproducibility recipe does perform
network downloads, creates a venv, installs `zstandard`, and executes the pinned
external Blender parser inside a validated disposable temporary directory; it
is therefore not a zero-write/zero-execution host operation. It was executed for
this audit and cleaned up. Do not rerun it without explicit authority for those
temporary network/write/execute actions. **(verified operational boundary)**

Limits: Blender was not installed, so there was no rendered visual acceptance or
Blender-native evaluated-modifier export. Static checks did not test anatomical
accuracy, normals/winding, UVs, self-intersections, inter-object intersections,
or animation deformation. No upstream maintainer and no qualified anatomical
reviewer confirmed the mappings. **(verified limitation)**

## License and lineage gate

- Z-Anatomy says its shared code/content is CC BY-SA 4.0 and requests both the
  BodyParts3D CC BY-SA 2.1 Japan attribution and the Z-Anatomy CC BY-SA 4.0
  attribution. It also lists adapted/reference models from other sources,
  including an inner-ear model under CC BY-NC-SA 4.0 and a kidney model under CC
  BY-NC 4.0. **(verified:
  [README model attributions](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/ebdd5edf207af1dd765cc6796ad90b34add9799a/Readme.md#attributions),
  [license file](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/ebdd5edf207af1dd765cc6796ad90b34add9799a/License.txt))**
- BodyParts3D states that its geometry/data and derivatives are CC BY-SA 2.1
  Japan, while its Julia software is MIT. Its required content credit identifies
  BodyParts3D and the Life Science Integrated Database Center. **(verified:
  [README license split](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/blob/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61/README.md#licenses),
  [content license](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/blob/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61/LICENSE_content),
  [CC BY-SA 2.1 Japan deed](https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en))**
- The target Z-Anatomy object custom properties are UI/render properties such as
  cross-section axes, color, and shader toggles. Target collections carry only
  an `English` label. The linked mesh/curve data carry no source metadata. The
  only FMA-like mesh-data name found across the whole binary was unrelated to
  P0 (`_FMA73674_Left gracile lobule`). **(verified: exact-pin binary inspection)**
- `Anatomy-shortcuts.py` is a generated Blender key configuration and contains
  no TA2/FMA/source/license mapping for the target objects. **(verified:
  [pinned source](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/ebdd5edf207af1dd765cc6796ad90b34add9799a/Anatomy-shortcuts.py))**

The correct per-object lineage value is therefore **`untraceable at this pin`**,
and the exact per-object license is **unresolved**. It is unsafe to choose either
“BodyParts3D → Z-Anatomy” or “Z-Anatomy original” from the repository-level
notice alone. Absence of a target from the short NC list is not positive source
proof. No object passes the PalDawn provenance gate. **(verified licensing
assessment; not legal advice)**

## Exact Z-Anatomy object inventory and disposition

Blender object types below use the source file's own data-block types: mesh,
legacy curve, font, and collection. `.g` font objects are section headings;
`.t` objects are text; `.j` “surface”/“root” objects are two-vertex, one-edge,
zero-polygon label connectors, not anatomy surfaces. **(verified: exact-pin
binary inspection)**

| P0 need | Exact object/data-block evidence | Geometry reality | Lineage/license | Draft disposition |
|---|---|---|---|---|
| Heart exterior | Collection `GRHeart`; meshes `OBRight atrium` → `MERight atrium`, `OBRight ventricle` → `MERight ventricle`, `OBLeft atrium` → `MELeft atrium`, `OBLeft ventricle` → `MELeft ventricle` | Four separate, open chamber meshes. `GREpicardium` is empty. Literal `Anterior/Left/Inferior/Right surface of heart` objects are label text/connectors, not surface meshes. | Untraceable; exact license unresolved | **HOLD / not approved** |
| Aortic root | `GRRoot of aorta` has two empty child collections, `GRAortic valve` and `GRAortic sinuses`; `OBRoot of aorta.g` is font; `OBRoot of aorta.j` is a 2-vertex label connector. The three aortic-leaflet meshes are direct members of `GRHeart`, not this root collection. | No aortic-root wall/surface object exists | No asset to license; collection terminology only | **UNAVAILABLE / HOLD** |
| Ascending aorta | `OBAscending aorta` → `CUAscending aorta` | One open Bezier spline, 3 control points; rendered tube, not a wall/lumen mesh | Untraceable; exact license unresolved | **HOLD / not approved** |
| Left main coronary artery | `OBLeft coronary artery` → `CULeft coronary artery` | One open Bezier spline, 3 control points. Its separation from LAD and LCx supports, but does not prove, interpretation as the left-main segment. | Untraceable; exact license unresolved | **HOLD / mapping pending review** |
| LAD | `OBAnterior interventricular artery` → `CUAnterior interventricular artery`; the binary also contains the parenthetical label `Left ant descending artery` | Six open Bezier splines, 46 control points total; main path plus branches are bundled but not topologically welded | Untraceable; exact license unresolved | **HOLD / not approved** |
| LCx | `OBCircumflex artery of heart` → `CUCircumflex artery of heart` | Six open Bezier splines, 63 control points total; branch tubes are not topologically welded | Untraceable; exact license unresolved | **HOLD / not approved** |
| RCA | `OBRight coronary artery` → `CURight coronary artery` | Fourteen open Bezier splines, 108 control points total; object extent includes a branch network, not just one trunk | Untraceable; exact license unresolved | **HOLD / not approved** |

**All rows are verified by read-only inspection of the pinned
[`Startup.blend` container](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/ebdd5edf207af1dd765cc6796ad90b34add9799a/Z-Anatomy.zip).**

## Terminology mappings — TA2 and FMA kept separate

Confidence is about the terminology mapping only, not mesh accuracy, lineage, or
adoption approval. “Exact label” means a unique case-insensitive English-label
match within the named pinned CSV. **(verified method)**

| PalDawn structure | Z-Anatomy object(s) | TA2 mapping from `TA2.csv` | TA2 method / confidence | FMA mapping from `FMA.csv` | FMA method / confidence |
|---|---|---|---|---|---|
| `structure:heart.exterior` | Four chamber meshes under `GRHeart` | `TA2:3932` Heart; object-level `TA2:4022` Right atrium, `TA2:4038` Right ventricle, `TA2:4054` Left atrium, `TA2:4062` Left ventricle | Unique exact labels; **high** terminology confidence. “Exterior” is a PalDawn composition, not a TA2 term. | `FMA:7088` Heart; object-level `FMA:7096`, `FMA:7098`, `FMA:7097`, `FMA:7101` respectively | Unique exact labels; **high** terminology confidence. None of these IDs has an STL file in the pinned Moerman tree, and no Z mesh carries the ID. |
| `structure:aorta.root` | Root collection only | `TA2:3992` Root of aorta; `TA2:4001` Aortic sinuses | Unique exact labels; **high** terminology confidence; no geometry identity implied. | **No single mapping.** The pinned CSV has no exact `Root of aorta` or `Aortic root` preferred label. `FMA:3745` Aortic sinus and `FMA:3736` Ascending aorta are related components, not an asserted equivalent. | Exact-label search with fail-closed result; **unresolved**. |
| `structure:aorta.ascending` | `OBAscending aorta` | `TA2:4176` Ascending aorta | Unique exact label; **high**. | `FMA:3736` Ascending aorta | Unique exact label; **high** terminology confidence. A matching FMA-named STL exists, but Z-object lineage remains unproved. |
| `structure:coronary.left-main` | `OBLeft coronary artery` | `TA2:4142` Left coronary artery | Exact Z/TA2 label plus source topology separating it from LAD/LCx; **medium** for the narrower PalDawn “left main” concept. | Primary candidate `FMA:4685` Stem of left coronary artery. `FMA:50040` Left coronary artery is the broader exact-label concept; `FMA:3855` Trunk of left coronary artery is another terminology candidate. | Candidate chosen from preferred labels plus separate-segment topology; **medium / reviewer required**. Do not collapse these IDs. |
| `structure:coronary.lad` | `OBAnterior interventricular artery` | `TA2:4143` Anterior interventricular artery | Unique exact label and embedded LAD parenthetical; **high**. | `FMA:3862` Anterior interventricular branch of left coronary artery | Terminology synonym/branch formulation, not cross-ontology label equality; **medium-high / reviewer required**. Pinned geometry filename is `FMA3862nsn.stl`; the `nsn` suffix is unexplained in inspected docs. |
| `structure:coronary.lcx` | `OBCircumflex artery of heart` | `TA2:4148` Circumflex artery of heart | Unique exact label; **high**. | `FMA:3895` Circumflex branch of left coronary artery | Terminology synonym/branch formulation; **medium-high / reviewer required**. |
| `structure:coronary.rca` | `OBRight coronary artery` | `TA2:4131` Right coronary artery | Unique exact label; **high**. | `FMA:50039` Right coronary artery is the semantic exact-label concept; `FMA:3802` Trunk of right coronary artery is the pinned geometry-file candidate. | Exact-label concept is **high**; mapping the full Z branch-network object to the trunk file is **low/unresolved**. |

Primary terminology sources: Z-Anatomy [`TA2.csv`](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/ebdd5edf207af1dd765cc6796ad90b34add9799a/TA2.csv)
and Moerman/BodyParts3D [`FMA.csv`](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/blob/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61/assets/BodyParts3D_data/FMA.csv).
**(verified)**

## Geometry and mesh-defect risks

### Z-Anatomy heart meshes

The checks below used source mesh vertices/edges/polygons before any export or
modifier evaluation. Boundary edges show that none is a closed standalone
volume. Connected-component counts include isolated unused vertices; the
left-atrium mesh has one face-bearing component plus two isolated vertices.
Multiple face-bearing components may be intentional anatomy, but they are still
a conversion/animation risk. **(verified method and results)**

| Source object | Vertices | Polygons | Boundary edges | Components | Unused vertices | Simple defects not found |
|---|---:|---:|---:|---:|---:|---|
| `OBRight atrium` | 2,878 | 2,850 | 119 | 1 | 0 | No >2-face edges, zero-length edges, duplicate positions, repeated-index faces, or near-zero-area faces |
| `OBRight ventricle` | 2,850 | 2,814 | 167 | 1 | 0 | Same bounded checks passed |
| `OBLeft atrium` | 2,609 | 2,610 | 121 | 3 total / 1 face-bearing | 2 | Same bounded checks passed apart from the isolated vertices |
| `OBLeft ventricle` | 2,856 | 2,797 | 180 | 2 | 0 | Same bounded checks passed; extra component requires identification |

Risks: chamber openings and seams must not be mistaken for accidental holes;
combining four chambers into one exterior can create overlaps/gaps; mixed
triangles/quads/pentagons require deterministic triangulation; normal direction,
self-intersection, UV continuity, and deformation under a heartbeat remain
untested. The empty `GREpicardium` means there is no separately identifiable
epicardial exterior to approve. **(verified engineering assessment)**

### Z-Anatomy aortic/coronary curves

All five targets are 3D Bezier curves with a `0.0005` source-scene-unit base bevel and variable
per-point radius. Every spline is open. **(verified)**

| Source object | Splines / control points | Radius-factor range | Export risk |
|---|---:|---:|---|
| `OBAscending aorta` | 1 / 3 | 28–30 | Extremely sparse centerline; no root wall or lumen; cap behavior must be made explicit |
| `OBLeft coronary artery` | 1 / 3 | 3.6–4.0 | Sparse left-main candidate; no lumen; endpoints/ostium require review |
| `OBAnterior interventricular artery` | 6 / 46 | 0.6–3.6 | Main path and branches are separate open splines; conversion will not guarantee welded junctions |
| `OBCircumflex artery of heart` | 6 / 63 | 0.4–3.6 | Same unwelded-branch/intersection risk |
| `OBRight coronary artery` | 14 / 108 | 0.6–4.0 | Broad branch network; semantic extent and junction topology are ambiguous |

These are useful centerline candidates, not ready-made lumen meshes. A beveled
solid curve cannot satisfy the P0 inward-facing LAD-lumen requirement without a
separate, deterministic swept-lumen build. Branches may overlap visually while
remaining disconnected topologically. Curve-to-mesh conversion must test caps,
junction welds, self-intersection, minimum radius, frame flips, normals, and
round-trip node identity. **(verified engineering assessment)**

### Direct BodyParts3D geometry candidates (not Z lineage proof)

The pinned Moerman tree contains the following independently licensed files.
Static binary-STL checks found one connected component, zero boundary edges,
zero >2-face edges, zero duplicate triangles, and zero zero-area triangles in
each. This bounded result does not test self-intersections, orientation, or
anatomical accuracy. **(verified)**

| Candidate | Pinned path | Git blob SHA-1 | Raw-file SHA-256 |
|---|---|---|---|
| Ascending aorta | [`FMA3736.stl`](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/blob/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61/assets/BodyParts3D_data/stl/FMA3736.stl) | `3daf44b5774ceb5a7ce3654c8533e13a409c701b` | `c99fcd415e7d7df717446f32601324b53656a96c41ff9190c766e39381e108e3` |
| Stem of left coronary artery | [`FMA4685.stl`](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/blob/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61/assets/BodyParts3D_data/stl/FMA4685.stl) | `78ba1af3a703537c010e7e4900b0c3325cb024b9` | `1f255ab043b03785f60b080af66ec385c660797ff8796491880d4eed4ca54aad` |
| LAD terminology candidate | [`FMA3862nsn.stl`](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/blob/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61/assets/BodyParts3D_data/stl/FMA3862nsn.stl) | `436e69d6eb46e3973e217a7386213b2e07dc6340` | `831c5417e07392b91a6eba2f9584ae96912cfb21b75db192dd543500a8cfbc6a` |
| LCx terminology candidate | [`FMA3895.stl`](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/blob/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61/assets/BodyParts3D_data/stl/FMA3895.stl) | `d789bc4dc5da0396c62d6af139da5aa4409c4ff5` | `bdccf8e75e76ef53555f2a667e135b7670f9f97d87dd10972b651b793a536763` |
| Right-coronary trunk | [`FMA3802.stl`](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/blob/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61/assets/BodyParts3D_data/stl/FMA3802.stl) | `806c660aef5225a567908e0aced49b5bdabd62dd` | `a0327d37afecd97067bd8b95396622175e028a863debd418c6ab47e42dd89d03` |

BodyParts3D itself warns that some models are more suitable for display than
computational work and specifically documents defects in skin meshes; therefore
the bounded pass above is not a general quality guarantee. Its Julia conversion
loop loads OBJ and writes binary STL, a format boundary that discards object
names/materials and should not be PalDawn's production conversion route.
**(verified: [README defect warning](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/blob/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61/README.md#contributing),
[`functions.jl`](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/blob/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61/src/functions.jl))**

## Digest evidence and a safe future method

| Source artifact | Git blob SHA-1 | SHA-256 over raw bytes |
|---|---|---|
| Z-Anatomy `TA2.csv` | `71bef934c23d207550ad1f318ec6edd8551cdba4` | `0f9092a328b27dcd15d696d9f9a4087deb229a1aad21b75876657622de835974` |
| Z-Anatomy `Z-Anatomy.zip` | `f43cabc6f366b2a6058dd2ed4a2b3c7b9b2492cb` | `e029688545627bd0214b269e1063143abb580aad72b2c2445d6d8a9a0d9da736` |
| Inner `Z-Anatomy/Startup.blend` | not a standalone Git blob | `9f08a17ea0115fed80b2a73ecdf0a1bc2ab2f6956f37c593ce23d513ea35afcd` |
| BodyParts3D `FMA.csv` | `81ba005f65abaf1a04479aebd4d36f17a6279c2b` | `14aa88169ea1013bf64853b8fcbe88b2a11477fc8e920f6ddde7be6ac5e1d2e8` |

Git blob IDs were read with `git ls-tree` and independently reproduced with
`git hash-object` (Git's `blob <size>\0<bytes>` SHA-1). SHA-256 values were
computed over the exact checked-out/downloaded bytes. **(verified method)**

A target object inside `Startup.blend` has no independent upstream Git blob, and
its geometry may reference shared data/material blocks. Do not invent an
object-level `source_digest`. A safe record can temporarily bind to the source
archive/blob plus the inner `.blend` SHA-256, but final adoption needs a
deterministic per-object export whose exact GLB bytes receive their own SHA-256,
along with a manifest recording the source object/data-block names and export
toolchain pins. **(verified engineering assessment)**

## Evidence required to reopen approval

1. Obtain a maintainer-authored mapping for every named Z object/data-block to
   its original source object/file, creator, derivation steps, and exact license;
   an explicit statement that a target is Z-Anatomy-original is acceptable only
   if the maintainer has authority to license it. **(verified requirement from
   the fail-closed provenance policy)**
2. Reject any target whose chain reaches CC BY-NC, NC-SA, unlicensed, or
   unidentified material. For a BodyParts3D-derived object, retain both the
   BodyParts3D source/license/credit and the Z-Anatomy modification/credit in the
   pack record. **(verified licensing requirement)**
3. Have a named qualified reviewer approve the anatomy concept, structure extent,
   TA2 mapping, FMA mapping, representative-variation statement, and intended
   P0 use. **(verified PalDawn medical-review requirement)**
4. Run the deterministic Blender → GLB → optimization pipeline and fail on lost
   IDs/extras, changed coordinate frames, holes/non-manifold edges, invalid
   normals, self-intersections, unwelded branch junctions, minimum-radius
   violations, or non-reproducible digests. **(verified engineering requirement)**
5. Until 1–4 succeed, do not create an `approved` or `used` provenance record
   for these Z objects. The accompanying draft records deliberately preserve
   the repository-level licence notice while marking object-level lineage and
   licence scope unresolved, adoption blocked, usage planned, approval pending,
   and medical review required/pending. Their validator pass confirms only an
   honest pending-state shape; it is not provenance, medical, legal, or adoption
   approval. A visibly synthetic, explicitly non-anatomical engineering
   placeholder is the only immediately safe P0 asset route. **(verified
   conclusion)**

## Draft provenance-record set

Nine exact-object records plus one explicit aortic-root absence record accompany
this dossier in `pipeline/provenance/records/`: four chamber meshes, one
unavailable aortic-root surface, the ascending-aorta curve, and four coronary
curve objects. Each binds
to the pinned source archive and inner Blender digest, records the exact Blender
object/data-block, keeps TA2 and FMA terminology mappings separate, and states
the missing object-level source/licence evidence. All ten are deliberately
`planned`, `pending`, medically reviewable, and adoption-blocked.

The schema and validator now recognize the adoption, exact-object,
source-container, and TA2/FMA evidence fields. Deleting or corrupting those
fields fails with `MISSING_ASSET_EVIDENCE` or `MISSING_ONTOLOGY_EVIDENCE`.
They still validate a complete planned record that carries the repository-level
CC BY-SA 4.0 notice while explicitly marking object-level evidence unresolved.
The validator requires positive
`object_level_status: resolved` and `adoption_gate.status: clear` values before
any medical asset/content/dataset record can become `approved` or `used`, and
rejects these drafts with `ADOPTION_BLOCKED` even if their audit fields are
deleted instead of resolved. Consequently, `PASS` means only that the blocked pending
state is structurally and policy-shape valid. It does not resolve the per-object
licence, lineage, anatomical mapping, geometry fitness, or reviewer gate, and it
authorizes no import or publication. **(verified against the repository
validator, negative fixture, and these records)**

The validator is deliberately only a structural and policy-format linter. It
cannot authenticate a maintainer or medical reviewer, prove that a licence
applies to an object, or establish that a format-valid object name/TA2/FMA ID is
true. It also does not yet reconcile future content/release-pack files against
records. Those substantive gates remain human/source review and backlog #4
manifest work. **(verified implementation limitation)**

## Local enforcement status

All checks reported here were run locally. This repository currently has no
commit history or Git remote, so the checked-in workflow and CODEOWNERS files are
not active hosted enforcement. `ci.yml` is configured for pull requests and
future pushes to `main`; `deploy.yml` runs provenance checks before a triggered
Pages build. CODEOWNERS currently routes sensitive paths to the repository owner
only; owner review is not qualified medical review, and GitHub branch protection
must later require code-owner review for it to enforce anything. No hosted CI,
branch protection, medical-review team, or deployment was claimed or configured
by this audit. **(verified local repository state)**
