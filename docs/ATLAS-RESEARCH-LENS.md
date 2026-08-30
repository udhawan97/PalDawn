# Atlas Research Lens

Status: post-v0.3.0 code-owned evidence-navigation slice on `main`. This is a
local map of source metadata already bundled with PalDawn, not a new clinical
journey, source review, or release tag.

## Feature set

1. Open **Research lens** from any Atlas condition to inspect every bundled
   source record for that route.
2. Distinguish condition-index context from sources explicitly linked to one or
   more authored mechanism steps.
3. Show how many sources and authored steps are represented while keeping the
   named-qualified-review status visible.
4. Use the numbered coverage rail to return directly to a step supported by the
   selected source record.
5. Keep external source navigation user-triggered and preserve the source's
   canonical WHO or NIH/NIDDK URL.

## Boundary

Research Lens derives its map only from `DiseaseDefinition.sources` and each
existing step's `sourceIds`. It does not fetch, ingest, summarize, rank, or
reinterpret external material. It adds no source, claim, anatomy, treatment
guidance, reviewer, dependency, analytics, persistence, or patient-data path.

The map describes authored linkage, not evidentiary strength. A source linked
to a step is not presented as validating every word, visual detail, or inferred
relationship. Ranking context with no step linkage remains visibly separate.
Unknown source IDs fail closed and block the evidence ledger rather than
silently producing a partial map.

## Verification contract

- Runtime checks require every authored step to resolve to a bundled source,
  preserve index-only context, and keep all coverage indices in bounds.
- Browser acceptance covers source counts, step coverage, canonical links,
  exact step return, focus restoration, keyboard closure, mobile bounds, and
  44-pixel evidence targets.
- Existing medical-boundary, responsive, WebKit, provenance, license,
  Pages-base, offline, and JavaScript bundle-budget gates remain unchanged.
