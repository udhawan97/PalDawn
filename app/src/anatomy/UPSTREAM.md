# Human Atlas adaptation

Viewer helpers originate from [ashemag/human-atlas](https://github.com/ashemag/human-atlas),
commit `1c38bf35c254a891200d3cedecfd57abebe83d8d`, MIT, copyright 2026 ashemag.
The full MIT notice is preserved in [LICENSE](LICENSE).

Adapted files: `scene.tsx`, `anatomy.ts` (types and display labels only),
`explosion-layout.ts`, `model-download.ts`, `pointer-tap.ts`, `agent-tools.ts`.
Pregnancy/reference type vocabulary additionally follows upstream
`d72b4f6db42e41a8db84b1c19ff6d86ee7b65284`.

PalDawn changes: base-path-safe model URLs, dedicated study/website layouts,
reference switching, explicit organ-to-existing-lesson navigation, local session
lists, recall cards, source reading directories, physical materials, selection rim
lighting, GPU-aware shadow depth material, high/standard rendering, damped camera
framing, reduced motion, pausing hidden tabs, clipping and opacity inspection,
and guided system tours. The view animation does not simulate physiology.
No geometry deformation or invented biological motion is added.

The 3D data and upstream explanatory text are **not vendored into this directory**.
`npm run anatomy:prepare` retrieves immutable upstream model snapshots into the
ignored `output/anatomy/` directory for the user-requested local review candidate.
The normal public build excludes both the pack and these study/website chunks.

Male: BodyParts3D 4.0 via `1c38bf35...`, 2,234 meshes / 3,432 concepts,
CC BY 4.0, Database Center for Life Science.
Female: HRA united-female v1.5 via `d72b4f6...`, 888 meshes / 1,073 source
nodes, CC BY 4.0, Kristen Browne and Heidi Schlehlein, HRA / HuBMAP.
The female assembly has partial skeleton/muscles and eight optional pregnancy
meshes. It is not a matched anatomical counterpart of the male reference.
Full attribution ships inside the local pack and is linked from both UIs.

MedlinePlus titles and links are refreshed by `prepare-anatomy-reading.mjs`.
No linked article text, images, treatment advice, A.D.A.M. material or ASHP
monographs are copied. Each directory retains its source URL and retrieval date.
The complete prepared pack has a SHA-256 file manifest. Source conditions are
system-level further reading, not mesh-specific disease assertions.
