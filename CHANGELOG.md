# Changelog

All notable changes to PalDawn are documented here.

## [0.3.0] — 2026-08-24

### Mechanism Lens

- Added high-detail project-authored body and organ layers without adopting a
  third-party anatomy asset or representing the model as reviewed anatomy.
- Added step-driven signal paths and phase anchors across the exact structures
  already named by each disease mechanism step.
- Added organ close focus, stable Whole body exit, and automatic focus reset
  when the learner changes disease or phase.
- Added a Mechanism Lens readout joining the 3D focus state to the current
  explanation and represented structures.
- Lazy-loaded the WebGL scene and generated an offline asset manifest so the
  split 3D chunk remains available in the first-party PWA shell.
- Preserved English-only content, source dates, medical-review disclosure,
  local-only data, reduced motion, and the complete v0.2/v0.1 journeys.

## [0.2.0] — 2026-08-22

### Systems Atlas

- Added an English-only disease systems explorer with ten WHO-ranked starting
  journeys and direct WHO or NIH/NIDDK evidence links.
- Added an eleven-step diabetes journey spanning digestion, insulin signalling,
  disease-type divergence, acute metabolic effects, long-term complications,
  and ongoing care boundaries.
- Added a fully interactive, project-authored procedural 3D body map with
  system highlighting, organ selection, orbit controls, and an exploded view.
- Added Plain English and Clinical terms reading depths, an in-app guide,
  mobile condition index, terminal journey action, and accessible focus flow.
- Made Atlas navigation reversible with browser Back and Forward while keeping
  condition names out of durable storage and URLs.
- Corrected Settings playback ownership so opening the panel pauses the voyage
  and closing it resumes only when playback was active beforehand.
- Added browser coverage for mobile discovery, guide focus and scrolling,
  Atlas history restoration, journey completion, and Settings playback.
- Preserved the clinical and anatomy boundary: the model is conceptual and not
  to scale, the synthesis is unreviewed educational content, and no third-party
  anatomy asset or patient data is included.

## [0.1.0] — 2026-08-20

### First Light

- Replaced the calibration shell with a complete five-stage synthetic voyage.
- Added the normalized shared-route architecture, semantic portal/fog handoff,
  inward-facing corridor, and GPU-driven analytic flow markers.
- Added SPD guide and engineering narration, transcript, stage rail, scrubber,
  keyboard controls, replay, and live runtime telemetry.
- Added reduced-motion stage mode, comfort vignette, high contrast, responsive
  layouts, WebGL2/context-loss recovery, and the emergency-services line.
- Added deterministic release checks and a 500 KB gzip core-JavaScript gate.
- Preserved the fail-closed anatomy boundary: no Z-Anatomy, BodyParts3D, or
  other third-party 3D asset is incorporated.
- Added GitHub Actions CI and GitHub Pages release publication.
