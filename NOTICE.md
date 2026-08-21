# Attribution & licensing chain

## Currently used

**Third-party code (npm dependencies).** The application in `app/` uses MIT- and
Apache-2.0-licensed npm packages (React, three.js, React Three Fiber, drei,
Zustand, @react-three/postprocessing, Vite, TypeScript, type packages), pinned
to exact versions in `app/package.json` / `app/package-lock.json`.

- Full license texts: `app/THIRD_PARTY_LICENSES.md`
- Transitive license inventory (checked against the project denylist):
  `app/third-party-license-inventory.json`
- Per-dependency provenance records: `pipeline/provenance/records/`

**No 3D anatomy assets, medical datasets, or third-party content are
incorporated in this repository.** First Light's synthetic shell, route,
corridor, portal preview, flow markers, SPD mark, and icon are generated from
project-authored code and vector markup; they are not imported asset files.

## Planned / not yet incorporated

The project *intends* to derive anatomical meshes from the following chain.
**Nothing from this chain has been imported.** The statements below describe
obligations that will attach **only if and when specific, individually
approved objects land** (each with a passing provenance record):

1. **BodyParts3D** — © The Database Center for Life Science (DBCLS),
   CC BY-SA 2.1 Japan. https://lifesciencedb.jp/bp3d/
2. **Z-Anatomy** — "The libre 3D atlas of anatomy", CC BY-SA 4.0, which
   adapted and extended BodyParts3D. https://github.com/Z-Anatomy

If such objects are incorporated, the derived models and asset packs will be
distributed under **CC BY-SA 4.0** (share-alike), will retain this attribution
chain plus each object's exact source license and lineage record, and will be
listed here under "Currently used."

**Z-Anatomy is not approved wholesale.** Its repository-level CC BY-SA
declaration coexists with listed third-party models under CC BY-NC / NC-SA
terms (e.g., inner ear, kidney). Objects are approved individually; anything
whose lineage cannot be traced to a compatible license is excluded. If no
suitable object passes review, the fallback is a from-scratch, visibly
synthetic, non-anatomical engineering placeholder. v0.1.0 uses that fallback;
it does not alter the blocked status of any audited anatomy candidate.

## Content

v0.1.0 contains project-authored **engineering narration only**. It explains
the renderer and governance boundary and is explicitly not anatomical or
clinical content. Future PalDawn-authored medical-education content in
`content/` will be CC BY-SA 4.0, with
claim-level citations, and remains clearly marked as unpublished placeholder
material until reviewed by a named qualified human (see `docs/PLAN.md`,
Medical guardrails). MedlinePlus material, if used, follows MedlinePlus
content rules with the exact credit: `Source: MedlinePlus, National Library
of Medicine.`

## Code

Application and pipeline code is MIT — see `LICENSE`.
