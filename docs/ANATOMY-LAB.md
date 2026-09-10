# Anatomy Lab — local review candidate

This candidate extends `main` at `1b08389`. It is not a released or deployed
medical atlas. The existing Mechanism Lens public build remains separate.

## Run the complete candidate

From `app/`, with the repository's supported Node.js runtime, Git and curl:

```sh
npm ci
npm run anatomy:prepare
VITE_BASE_PATH=/PalDawn/ npm run anatomy:dev -- --host 127.0.0.1 --port 4318
```

Open `http://127.0.0.1:4318/PalDawn/` for the redesigned website. Select
**Explore Anatomy Lab** to carry the selected reference into the study mode.
The direct study URL is `http://127.0.0.1:4318/PalDawn/?study=anatomy`.

```sh
VITE_BASE_PATH=/PalDawn/ npm test
npm run anatomy:test
VITE_BASE_PATH=/PalDawn/ npm run anatomy:build
VITE_BASE_PATH=/PalDawn/ npm run anatomy:preview -- --host 127.0.0.1 --port 4319
```

`anatomy:build` writes `app/dist-anatomy/`, a **local review artifact**. The
normal `npm run build` writes `app/dist/`, excludes all reference packs and
Anatomy Lab chunks, and remains the only GitHub Pages workflow artifact.
No deploy, tag, release or medical approval is implied by a local build.

## Coverage and upstream parity

| Capability | Candidate behavior |
|---|---|
| Male reference | All 2,234 upstream meshes; 3,432 named concepts; 15 display systems |
| Female reference | All 888 historical upstream meshes; 1,073 source nodes; 14 available display systems including optional pregnancy reference |
| Search | Names, source concept IDs and mesh IDs; system filter; all results reachable through pagination |
| Selection | Pointer picking, keyboard-accessible search, compound concepts and every included mesh |
| Views | Orbit/zoom, front/back/side/three-quarter, isolated fit, reset, automatic rotation |
| Layers | Individual toggles, skeleton/organ/all presets; pregnancy excluded from default and All presets |
| Exploded anatomy | Assembled-to-inventory slider and nonoverlapping packing of visible pieces |
| Source context | Original IDs and source explanations; general system context labeled separately |
| Mobile | Stacked model and library/inspector, persistent panel navigation |
| Optional WebMCP | Upstream search and inspect tools with registration lifecycle cleanup |
| PalDawn learning | Explicit organ-level links into existing disease steps with their source links |
| Further reading | Searchable MedlinePlus directory titles and URLs; female-specific reproductive directory |
| Recall | Identify a visible mesh, reveal its name, next card; unscored self-study |
| Study list | In-memory lists per reference, retained when visiting a disease lesson; reset on reload |
| Graphics | Physical tissue materials, soft shadows, rim selection, high/standard detail, smooth camera framing |
| Animation | Pauseable guided system tour, optional rotation, scrubbed explosion; reduced motion snaps framing and advances tour manually |
| Dissection | Visual clipping and body-surface opacity; exposed cuts are uncapped, not histology |
| Website | Live reference preview, reference selector, study/disease calls to action, source/coverage and credit sections |

A mesh is not necessarily a whole organ, and a named concept may contain many
meshes. The female assembly has **partial skeleton and muscle coverage** and
no separate meshes in some male display categories. Neither source represents
every body part, variation, developmental stage or ailment. The models are
not a matched male/female pair. The website states these limits.

The organ-to-lesson bridge is navigation into existing unreviewed PalDawn
content, not proof that a disease affects every constituent mesh. It uses
explicit upstream concept membership, never FMA/TA2 equivalence by label.
Structures without authored lesson links have a clear empty state and source
reading. Further-reading topics include conditions and other health topics;
they are **not hundreds of newly authored lessons or disease animations**.

## Provenance and publication boundary

- Human Atlas code: ashemag, MIT; full notice at `app/src/anatomy/LICENSE`.
- BodyParts3D: Database Center for Life Science, CC BY 4.0. Current official
  license checked at <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html>.
- Female assembly: Kristen Browne and Heidi Schlehlein, HRA / HuBMAP,
  *3D Reference Organ Set for Female v1.5*, CC BY 4.0. Source:
  <https://lod.humanatlas.io/ref-organ/united-female/v1.5/>.
- MedlinePlus: National Library of Medicine; only source titles and links,
  with source URL and retrieval date. No protected article/image copying.
- Preparation writes `output/anatomy/manifest.json` with both immutable
  upstream pins and SHA-256 hashes for every prepared file.

Named qualified anatomy/clinical review remains pending under `docs/PLAN.md`
§§6–7. Candidate preparation is the user's authorized local evaluation, not
public asset adoption. Pending provenance records are not approval receipts.
The assistant cannot invent signoffs or certify anatomical correctness.

Runtime searches and session lists stay in memory. The candidate serves its
reference data locally. Opening a source link contacts that external site.
Preparation downloads public GitHub snapshots and MedlinePlus pages. The
candidate does not add telemetry, accounts, patient data or persisted notes.

## Acceptance evidence

See `output/anatomy-acceptance.md` for this working session's checks and known
limits. Deterministic tests cover mesh buffers, all concept memberships,
source-ID lookup, per-system coverage, compound selections, packing, pointer
classification, optional tools, gzip decoding and default-build exclusion.
Browser rendering is separately inspected; automated tests do not constitute
medical review or physical-device performance evidence.
