# PalDawn app — v0.3.0 Mechanism Lens

The app is a static WebGL2 learning experience built with the locked
Vite + React + TypeScript + Three.js + React Three Fiber + drei + Zustand +
postprocessing stack.

Every visible form is project-authored procedural geometry. Mechanism Lens adds
layered surface detail, small same-origin phase signals, and organ close focus
to the source-linked disease explorer, but no third-party anatomy asset,
medical dataset, patient data, diagnostic logic, or treatment recommender. The
content and visual model remain marked as an unreviewed educational preview.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run typecheck` | Check app and Vite configuration types |
| `npm run build` | Build `dist/` for production |
| `npm test` | Type-check, build, validate journey/release invariants, and enforce the gzip budget |
| `npm run preview` | Serve the current production build locally |
| `npm run licenses` | Rebuild the transitive dependency license inventory |

Use `npm ci`, not `npm install`, for a clean verification run.

## Release architecture

- `src/data/diseases.ts` defines the WHO-ranked condition library, claim-level
  source routing, affected systems, and the eleven-stage diabetes journey.
- `src/scene/HumanSystemsScene.tsx` renders the conceptual whole-body model,
  layered organ surfaces, system scaffolds, step-driven signal routes, focus
  lens, and close-focus camera from project-authored primitives.
- `src/scene/SceneCanvas.tsx` keeps the WebGL dependency graph lazy so the
  interface and recovery path load independently from the detailed scene.
- `src/ui/DiseaseExplorer.tsx` provides the condition rail, explanation-depth
  control, organ labels, evidence links, timeline, keyboard navigation, and
  in-app how-to guide.
- `src/state/atlas.ts` keeps disease navigation separate from First Light's
  persisted learner state.
- `src/data/p0-journey.json` defines the bounded five-stage voyage and its
  reduced-motion route.
- `src/journey/route.ts` produces the immutable normalized route lookup.
- `src/scene/VoyageScene.tsx` consumes that route for camera ownership,
  guide geometry, corridor sweep, portal, lighting, and runtime telemetry.
- `src/scene/FlowField.tsx` samples the route in the vertex shader using
  static per-instance attributes plus uniform time; it performs no per-frame
  CPU matrix updates.
- `src/ui/FlightDeck.tsx` owns the accessible HTML controls, SPD narration,
  transcript, settings, disclosure, and emergency-services safety line.
- Zustand stores keep journey state, comfort settings, and sampled telemetry
  separate.
- The Foundation continuity waves persist only allowlisted display preferences,
  one bounded First Light resume position, known stage IDs, bounded private
  notes, and personal checkpoints under versioned local keys. They add no
  account or backend.
- `public/sw.js` is a first-party same-origin offline shell. Its generated asset
  manifest includes the lazy 3D chunk; update activation remains user-triggered
  and no service-worker dependency was added.
- The accessible HTML layer also provides stage deep links, transcript and local
  diagnostics exports, a text-only voyage, keyboard help, local-data controls,
  fullscreen support, background pausing, a completion summary, and a private
  learner workspace with validated backup replacement.

Quality tiers use 750 / 2,000 / 4,000 analytic markers and DPR 1 / 1.25 /
1.75. `auto` is a small device heuristic, not a validated performance claim.
Formal measurements belong in `../docs/performance/`.

## GitHub Pages

Local builds default to `/`. The release workflow builds with:

```bash
VITE_BASE_PATH=/PalDawn/ npm test
```

This keeps manifest, icon, JavaScript, and CSS URLs valid for the project-site
deployment at `https://udhawan97.github.io/PalDawn/`.

## Licensing

Application code is MIT licensed. Direct dependency notices are in
`THIRD_PARTY_LICENSES.md`; the transitive inventory is
`third-party-license-inventory.json`; dependency provenance records live in
`../pipeline/provenance/records/`.
