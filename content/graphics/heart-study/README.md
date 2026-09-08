# Original heart form study

Original artwork authored for PalDawn with Codex on 2026-09-07.
Copyright PalDawn contributors. The editable source, generated mesh, manifest,
and renders of this artwork are licensed under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
The generator and workbench code in `app/graphics/` remain MIT.

**Unreviewed visual development artwork. Not an anatomical reference.**
No third-party anatomical mesh, scan, photograph, texture, or patient data was
imported, traced, or sampled to create this study. Its profiles and branch
paths are manually authored geometric parameters. Structure names are art
organization labels, not validated ontology mappings.

## Reproduce

From the repository's `app/` directory, with its existing dependencies:

```sh
npm run graphics:generate
npm test
npm run graphics:build
npm run graphics:test
npm run graphics:dev
```

The development command opens `/heart-study.html`. Use a port override when
needed: `npm run graphics:dev -- --port 4317 --strictPort`.

- `source.json`: editable shell sections, upper forms, and vessel paths.
- `heart-study.glb`: deterministic generated geometry with vertex colors.
- `manifest.json`: source/generator/output SHA-256 digests, actual mesh counts,
  attribution, units, review status, and omitted structures.
- `app/graphics/mesh-builder.mjs`: geometry and GLB writer using the project's
  pinned Three.js dependency. No new package is required.

The viewer verifies the mesh digest before parsing it. Regenerate after
editing source or generator; `npm test` rejects stale outputs and checks that
the workbench does not appear in the public app build.

## Geometry conventions

All dimensions use arbitrary study units. `+Y` is up and `+Z` is the front of
this authored composition. No assertion of anatomical size, position, or
patient-specific shape is made.

Shell rows are `[height, centerX, centerZ, radiusX, radiusZ]`. The generator
interpolates them into one closed asymmetric surface. Upper forms have
separate folded surfaces. Surface-vessel samples are `[shellProgress, angle]`;
they use the same surface evaluator as the underlying shell. Great-vessel
forms have outer walls, inward-facing interiors, and annular end rims.

Branches overlap their parent tubes. Boolean unions, watertight branch
junctions, valid chamber volumes, vessel patency, and anatomical route
correctness are **not** claimed. The model is suitable for visual inspection,
not flow simulation, printing as validated anatomy, or clinical use.

## Review and adoption

The source and manifest set `publicationEligible: false` and record pending
review with no named reviewer. The dedicated `heart-study.html` entry is built
only through `vite.graphics.config.ts`, into the ignored `app/dist-graphics/`.
The normal app entry, service worker, and Pages workflow do not include it.
Do not publish `dist-graphics` or promote this artwork into clinical lessons
until the relevant anatomy, content, asset, and release gates are satisfied.

This first-party art manifest does not replace the existing third-party
provenance records and does not clear any Z-Anatomy or BodyParts3D candidate.
See [coverage and remaining work](../../../docs/HEART-GRAPHICS-WORKBENCH.md).
