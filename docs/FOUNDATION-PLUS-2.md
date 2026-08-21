# PalDawn Foundation+2

Status: post-v0.1.0 First Light continuity wave on `main`. This is a local-first
productivity and recovery pass, not a medical-content phase and not a release
tag.

## Six high-confidence features

1. Persisted `0.5×`, `1×`, and `1.5×` playback pacing for the animated route.
   Reduced-motion stage stepping remains deterministic and is not accelerated.
2. In-transcript phrase search, result counts, direct stage jumps, and a `/`
   shortcut that opens and focuses search.
3. Local-only saved stage IDs, available from the current caption and transcript,
   with a `B` shortcut, cross-tab synchronization, export, and reset coverage.
   Stored bookmark payloads contain validated IDs plus reset-generation metadata.
4. User-triggered native sharing for a stage, transcript, or arrival, with the
   existing local clipboard path as a safe fallback.
5. Capability-driven PWA installation: a browser prompt is used only when the
   browser exposes it; otherwise PalDawn gives conditional Install App/Add to
   Home Screen guidance and recognizes standalone mode.
6. A two-step voyage restart that returns to the introduction while retaining
   display preferences and saved stages.

## Boundary

Foundation+2 adds no anatomy asset, medical or clinical teaching, diagnosis,
pathology, patient data, external analytics, backend, third-party package,
multilingual safety copy, quiz, assessment, or performance claim. Sharing and
installation are initiated only by the user. Bookmark data accepts only IDs from
the five project-authored synthetic stages plus reset-generation metadata.

## Verification contract

- TypeScript and Vite build gates remain green at the Pages base path.
- Existing First Light and all fourteen Foundation+ contracts remain green.
- Executable state tests cover deterministic playback-rate behavior, setting
  validation, bookmark corruption and reset generations, and
  preference-preserving restart.
- Browser acceptance covers search and focus, bookmark persistence/export/reset,
  native-share and clipboard-fallback outcomes, install capability states,
  playback controls, restart behavior, and existing narrow-screen target sizing.
- Provenance and dependency-license gates remain unchanged and fail closed.
- Graphify is refreshed after implementation and a scoped query confirms the new
  state, platform, and UI paths.

The retained acceptance record and known limits are in
`docs/FOUNDATION-PLUS-2-QA.md`.
