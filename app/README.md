# PalDawn app — First Light v0.1.0

The production app is a static WebGL2 technical voyage built with the locked
Vite + React + TypeScript + Three.js + React Three Fiber + drei + Zustand +
postprocessing stack.

Every visible form is project-authored procedural geometry. This release has
no anatomy asset, medical dataset, clinical content, patient data, diagnostic
logic, or medical claim.

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
- `public/sw.js` is a first-party same-origin offline shell. Update activation is
  user-triggered; no service-worker dependency was added.
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
