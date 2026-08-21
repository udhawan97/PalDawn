# Contributing to PalDawn

Three tracks — pick yours. First run `npm test` in `app/` and
`node pipeline/provenance/run-checks.mjs` from the repository root.

## 🧑‍💻 Code (app/, pipeline/)
React + TypeScript + React Three Fiber. Look for `good first issue`. PRs need
passing CI (typecheck, build, release-contract checks, dependency-license
inventory, provenance fixtures, and bundle-size budget) and one review.

## 🎨 Art & shaders
Blender modelers and shader artists are the heart of this project — LOD work
on approved anatomy meshes, lumen materials, pathology masks, particle looks.
Label: `shader-art`. Derived models are CC BY-SA 4.0 (see NOTICE.md), and every
asset needs a passing provenance record BEFORE import (pipeline/provenance/).

## 🩺 Medical content (content/)
Journeys and topics are data files — no coding needed. **Every claim must cite
an approved source** (WHO, CDC, MedlinePlus, peer-reviewed; StatPearls/PubMed
as links + metadata only). CI validates schemas and citation presence. Factual
beats stay marked as unpublished placeholders until a named qualified human
reviews them. Changes under `content/` require sign-off from a medical
reviewer (join via Discussions — med students & residents very welcome).

## Ground rules
- Education, never diagnosis. No triage or treatment advice in content.
- Provenance precedes adoption: no GPL/AGPL/unlicensed code, no CC BY-NC
  material, no share-alike material in MIT code zones. See
  pipeline/provenance/README.md.
- Keep the licensing split: code → MIT, content/models → CC BY-SA 4.0.
- Be kind. See CODE_OF_CONDUCT.md.
