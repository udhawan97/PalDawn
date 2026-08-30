# Atlas Wayfinding

Status: post-v0.3.0 code-owned P2 navigation slice on `main`. This is a
deterministic route finder over the existing educational preview, not a new
medical-content phase or release tag.

## Feature set

1. Search the current condition titles, categories, pathway labels, mechanism
   phases, and highlighted body-structure vocabulary from one Atlas field.
2. Rank exact condition names first while keeping the result set bounded to
   twelve routes.
3. Choose a condition result to open its first phase, or choose a pathway result
   to open the exact existing phase and focus one structure already named there.
4. Press `/` outside an editable control to focus the route finder. Press
   `Escape` in a non-empty search to clear it without closing the Atlas.
5. Preserve an exact search arrival when browser Back and Forward restore the
   Atlas history entry.
6. Keep the horizontal mobile instrument rail usable without creating page
   overflow or reducing interactive controls below their touch target.

## Boundary

Atlas Wayfinding performs local string matching over data already bundled with
PalDawn. It does not add synonyms, infer medical relationships, fetch search
results, store queries, collect analytics, or send user input anywhere. It adds
no anatomy, disease claim, treatment guidance, source, asset, dependency,
patient-data path, reviewer, or release assertion.

A matched structure is eligible only when it already belongs to the selected
phase. Unknown conditions, steps, and structures fail closed. Search results
retain the same visible unreviewed-preview and conceptual-geometry boundaries
as the rest of the Atlas.

## Verification contract

- Runtime checks cover blank and unknown queries, exact-condition ranking,
  bounded output, and known condition/phase/structure targets.
- Browser acceptance covers keyboard focus, route arrival, structure focus,
  empty search, clearing, and browser-history restoration.
- The existing Atlas responsive, medical-boundary, WebKit, provenance,
  license, Pages-base, and bundle-budget gates remain unchanged.
