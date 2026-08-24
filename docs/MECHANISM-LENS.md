# Mechanism Lens

Mechanism Lens is the v0.3 visual-detail phase for Systems Atlas. Its job is to
make the current authored mechanism step legible in the body, not only in the
text panel.

## Shipped interaction

- Each step highlights only its authored `bodyParts` and names the first item as
  the phase anchor.
- A project-authored signal path connects the structures already named by the
  step. The path changes when the learner changes phase.
- Selecting a highlighted structure moves the camera into close focus, pauses
  ambient body drift, and reveals layered surface, core, scaffold, particle,
  and lens detail.
- **Whole body** exits close focus. Changing disease or phase also resets close
  focus so a previous selection cannot silently carry into a new mechanism.
- The Mechanism Lens readout repeats the current anchor, focus state, and exact
  structures represented by the step.
- The WebGL dependency graph loads lazily. A generated same-origin asset
  manifest keeps the lazy scene chunk inside the first-party offline shell.

## Visual contract

The model is deliberately illustrative. The higher-detail shell, organs,
vessels, nerves, skeleton, airway, digestive, urinary, optic, and cardiac
scaffolds are composed from PalDawn-authored Three.js primitives and lines.
They show system relationships and UI state; they do not claim anatomical
shape, scale, position, pathology, severity, or treatment effect.

No third-party anatomy file, texture, dataset, dependency, medical claim, or
patient-data path is added. Existing source-linked prose and the 22 August 2026
source-check date are unchanged. The synthesis still lacks named qualified
clinical review.

## Quality and accessibility

- High and balanced tiers render layered organ shells and a bounded particle
  field; the low tier keeps the phase route and close-focus interaction with
  reduced geometry.
- Reduced motion freezes signal travel, lens rotation, ambient drift, and
  camera damping at a stable state.
- The Canvas remains decorative to assistive technology. The HTML stage exposes
  `data-phase-detail`, `data-focus-part`, a polite focus status, pressed states,
  and the same mechanism structure list.
- Desktop, phone, and short-landscape layouts keep the model, detail copy,
  controls, and safety line in bounded bands.

## Verification contract

The release gate covers TypeScript, production build and gzip budget, static
Mechanism Lens contracts, Chromium and WebKit browser journeys, mobile geometry,
local-only/offline behavior, provenance, licenses, Graphify refresh, exact Git
tag/release SHA, CI, Pages, and deployed asset hashes. Native Safari evidence is
recorded separately from Playwright WebKit whenever the Mac session is available.
