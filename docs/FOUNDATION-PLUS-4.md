# PalDawn Foundation+4

Status: post-v0.1.0 First Light pack-integrity, performance-instrumentation,
and interface-polish phase on `main`. This is not P1 medical content and not a
release tag.

## High-confidence implementation

1. The five-stage First Light script is now a repository-owned v1 content pack
   with a fail-closed JSON Schema, immutable pack ID/version, and canonical
   SHA-256 digest checked by the production contract.
2. Local session, bookmark, and workspace records use journey-scoped v3 keys
   and embed the active pack identity. Existing v1 records migrate locally;
   schema 1/2 backups remain importable; incompatible v3 journeys and packs are
   rejected before replacement.
3. The learner workspace searches stage labels, levels, both authored tracks,
   and private notes locally. Results switch the comparison view without
   transmitting or indexing user text outside the browser.
4. Browser acceptance runs the same interaction suite in Chromium and WebKit.
   This broadens engine coverage but does not substitute for native Safari or
   physical-device acceptance.
5. A reproducible performance command records raw frame times, percentile
   summaries, renderer estimates, browser/environment metadata, build SHA,
   warm-up, and run count for three representative stages.
6. The WebGL dependency graph is lazy-loaded behind an error boundary. The
   accessible flight interface and text-voyage recovery path remain immediate.
7. The interface uses a more cohesive astronomical-instrument language:
   ink/oxblood depth, dawn-copper route energy, signal-cyan status, a progress
   axis, emissive core instrumentation, route beacon, and clearer comparison
   and search surfaces.

## Boundary

Foundation+4 adds no anatomy, anatomical scale, clinical teaching, diagnosis,
pathology, patient data, factual medical claim, analytics, backend, third-party
asset, or qualified-human medical approval. The performance script creates a
local measurement artifact, not a universal performance claim. Private notes
remain local, bounded, unencrypted learner input and must not contain patient
or personal health information.

## Verification contract

- Canonical digest verification fails if the content pack changes without a
  matching identity update; runtime parsing rejects malformed stage coverage.
- Runtime tests cover v1 migration, v3 identity, cross-tab reset generations,
  note bounds, import size, and wrong-journey/wrong-pack rejection.
- Browser tests cover the retained interaction surface plus local authored/note
  search in Chromium and WebKit at desktop and narrow responsive sizes.
- The performance capture uses a production build, local loopback, 120 warm-up
  frames, and three 180-frame runs at Surface trace, Portal, and Flow corridor.
- Existing synthetic-only, provenance, dependency-license, Pages-base,
  Graphify, and aggregate 500 KiB gzip JavaScript gates remain fail closed.

See `docs/FOUNDATION-PLUS-4-QA.md` for the recorded acceptance evidence.
