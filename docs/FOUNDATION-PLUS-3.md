# PalDawn Foundation+3

Status: post-v0.1.0 First Light learner-workspace phase on `main`. This is a
local-first study and portability pass, not P1 medical content and not a
release tag.

## Six high-confidence features

1. A current-stage comparison view showing the existing Guide and Engineering
   tracks together without creating a new factual track.
2. Private per-stage notes, bounded to 1,200 characters, rendered as text, and
   stored only in the current browser.
3. Personal stage checkpoints and a five-stage progress summary. Checkpoints
   are a learner aid, never evidence, approval, or medical review.
4. Workspace stage navigation and an `N` shortcut that opens and focuses the
   current stage note.
5. A user-triggered Markdown study export containing existing synthetic tracks,
   personal checkpoints, and private notes.
6. Validated, previewed, two-step replacement from PalDawn local-data backup
   files, including compatibility with the previous schema.

## Boundary

Foundation+3 adds no anatomy, medical or clinical teaching, diagnosis,
pathology, patient data, external analytics, backend, dependency, reviewer, or
performance claim. Notes are untrusted user text and are never treated as app
content or evidence. The interface warns against entering patient or personal
health information. Import accepts only allowlisted preferences, bounded
progress, known stage IDs, bounded text notes, and supported schema versions.

## Verification contract

- Runtime checks exercise note bounds, known-stage validation, reset
  generations, import normalization, and replacement semantics.
- Browser acceptance covers comparison, note focus, persistence, live cross-tab
  changes, checkpoints, Markdown export, import preview/cancel/confirm, and a
  narrow-screen workspace.
- Existing First Light, Foundation+, and Foundation+2 contracts remain green.
- Provenance, licenses, Pages-base build, and Graphify release gates remain
  unchanged and fail closed.
