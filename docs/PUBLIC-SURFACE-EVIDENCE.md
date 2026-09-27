# Public surface evidence — v0.6.0 Clear Routes

## Product facts and release boundary

This record compares the v0.5.1 public surface with the v0.6.0 source
candidate. Current source, runnable behavior, exact-version metadata and the
release workflows take precedence over older prose.

| Surface / claim | Evidence | Status |
|---|---|---|
| Home has body, condition and study destinations | `FlightDeck.tsx`; direct-route browser checks | v0.6.0 candidate |
| Lung infection opens a visible conceptual 3D diagram | Atlas state plus computed overlay check and fixed-frame screenshot | v0.6.0 candidate |
| Ten disease previews and source navigation | `diseases.ts`, Atlas Wayfinder and Research Lens contracts | Shipped |
| Fifty-condition plan | `diseaseCatalog.ts`; ten explorable, forty fail closed | Planned beyond ten previews |
| My condition study and First Light workspace | Existing local stores, Study Desk and workspace browser checks | Shipped |
| Male/female reference viewer | Prepared immutable inventories and Anatomy contracts | Local candidate only |
| Public-to-candidate body explanation | Public body drawer with qualified-review boundary | v0.6.0 candidate |
| Condition-to-reference round trip | Explicit `BodyPartId` to FMA/HRA anchor; Chromium/WebKit test | Local candidate only |
| Native installers | No installer workflow or artifact | Unavailable |
| Source release | Package/release note identity plus exact-main CI and Pages gate | Release-gated |

The public site deploys only the normal `app/dist` artifact. It excludes
Anatomy Lab chunks, male/female reference packs and candidate pages. A merge,
tag or source release does not adopt those assets into the public product.

## Navigation and 3D defect evidence

The reported Home → Lung infection failure was a presentation-state defect.
The condition state opened correctly, but the Home pseudo-element still painted
the navy/paper split over the scene while `entered` remained false. The repaired
selector requires both Home state and a closed Atlas. The new browser regression
opens lung infection from Home and verifies:

- Atlas is open on **Lower respiratory infection**.
- the conceptual 3D canvas and diagram label are visible;
- the computed overlay no longer contains the paper color;
- lungs can enter close focus and **Whole body** restores context.

The complete figure now fits inside the central study stage at the default
whole-body camera. This is a visual education map, not reviewed anatomy or a
scale model.

## Home information architecture

Home now answers four separate questions without relying on the word “Atlas”:

| Destination | Result |
|---|---|
| Home | Two primary choices plus the ten starting journeys |
| Explore body | Explains the public conceptual model and the separately prepared local references |
| Conditions | Opens the 50-condition catalog, with only ten current previews enabled |
| My study | Opens the First Light workspace with a route into saved condition work |

`#home`, `#body`, `#conditions` and `#study` recover after reload. Disease-step
hashes remain authoritative when a candidate query and an Atlas hash coexist.
Condition → Anatomy keeps the exact explicit body-part target, and Back to
PalDawn returns to the originating pathway. It never substitutes a male source
ID for a female source ID or infers equivalence from a label.

## Asset and capture record

- `docs/assets/paldawn-web-introduction.png`: current normal public build,
  1440×900. It shows the two starting routes and ten-journey paper rail.
- `docs/assets/paldawn-atlas-study-desk.png`: existing current Study Desk capture
  with fictional local records. Private notes remain on device and optional in
  export.
- `docs/assets/paldawn-research-desk.png`: local Anatomy candidate, male
  reference, current research desk. BodyParts3D / Database Center for Life
  Science, CC BY 4.0; viewer adapted from Human Atlas by ashemag, MIT.

No stock image, external font, analytics SDK, account system or runtime AI
provider was introduced. Candidate anatomy attribution remains in `CREDITS.md`,
`NOTICE`, the candidate UI and its preparation manifest.

## Verification record

The final release record must include the exact v0.6.0 SHA. Source-candidate
verification covers:

- TypeScript and normal production build.
- Static release/runtime contracts and deterministic graphics verification.
- Chromium and WebKit public browser inventory plus targeted final-diff checks
  for direct Home routes, history/close synchronization, the original lung
  failure shape, focus restoration and responsive layouts. The exact merged
  commit must pass the complete CI browser matrix before its release tag.
- Candidate build, anatomy inventory/source/persistence contracts and both
  candidate browser engines.
- PWA lifecycle, graphics browser checks, license inventory, provenance checks,
  documentation links, and refreshed Graphify output before publication.

Automated WebKit is not native Safari or physical-device proof. Qualified
medical/anatomy review, VoiceOver, physical touch, native print pagination and
measured device performance remain separate evidence classes and are not
inferred from browser automation.

## Truth and safety limits

- PalDawn is educational and never diagnoses, estimates personal risk or
  selects treatment.
- The ten disease previews are source-linked, unreviewed synthesis. Citations
  do not certify them.
- The two reference assemblies are different datasets with different coverage;
  they are not a matched pair, complete anatomy or a clinically reviewed course.
- Public Anatomy adoption remains blocked by the existing provenance,
  accessibility, performance and named qualified-review gates.
