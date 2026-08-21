# PalDawn

[![CI](https://github.com/udhawan97/PalDawn/actions/workflows/ci.yml/badge.svg)](https://github.com/udhawan97/PalDawn/actions/workflows/ci.yml)
[![MIT licensed](https://img.shields.io/badge/code-MIT-f0aa54.svg)](LICENSE)

**A companion voyage through the human body—built evidence first.** PalDawn’s
long-term promise is to let a learner fly a disease journey from cause to
effect, switch the narration depth, and resolve every factual claim to a
curated source.

[Launch **First Light**](https://udhawan97.github.io/PalDawn/) ·
[Read the release notes](docs/releases/v0.1.0.md) ·
[Inspect the evidence gate](pipeline/provenance/README.md)

> **v0.1.0 is deliberately not anatomy.** First Light is a project-authored,
> visibly synthetic systems voyage. It contains no anatomy assets, patient
> data, diagnostic logic, pathology, symptoms, or clinical teaching. The
> audited heart/coronary candidates remain blocked.

## What current main offers

Current `main` extends the immutable v0.1.0 First Light snapshot with the
post-release Foundation+, Foundation+2, and Foundation+3 continuity waves
described below. These additions are not part of the v0.1.0 tag.

- A five-stage WebGL2 voyage: Approach → Surface trace → Portal → Flow
  corridor → Arrival.
- One normalized route lookup shared by the camera rail, swept corridor,
  world-space guide, and GPU-driven flow markers.
- A bounded drei portal preview with an opaque fog-swap fallback.
- Guide ↔ Engineering narration, a complete transcript, scrubber, stage
  navigation, and SPD as the co-pilot.
- Local resume and saved stages, transcript phrase search, direct stage links,
  user-triggered sharing, and `0.5×`/`1×`/`1.5×` route pacing.
- A local learner workspace with Guide ↔ Engineering comparison, bounded
  private notes, personal checkpoints, Markdown export, and validated backup
  replacement.
- Keyboard operation, system-aware reduced motion, stage-by-stage reduced
  route, comfort vignette, high contrast, and an honest WebGL failure screen.
- A first-party offline shell with update and installation guidance, plus text
  voyage, local-data export/reset, and preference-preserving voyage restart.
- Auto/high/balanced/low tiers, on-device telemetry, a 500 KB gzip JavaScript
  release gate, and static GitHub Pages deployment.
- A fail-closed provenance system: current `main` has 24 live records that
  pass; all 10 audited
  Z-Anatomy targets remain planned/pending/blocked with null adoption output.

The v0.1.0 release proved the product’s flight and governance architecture. It
does not satisfy the later medical-content milestone.

## Run it locally

Requirements: Node.js 22+ and a WebGL2-capable browser.

```bash
cd app
npm ci
npm test
npm run dev
```

Open the URL printed by Vite. `npm test` type-checks, builds, validates the
five-stage journey and synthetic-only boundary, and enforces the gzip budget.

Run the independent provenance gate from the repository root:

```bash
node pipeline/provenance/run-checks.mjs
```

## Repository map

| Path | Purpose |
|---|---|
| `app/` | Vite, React, TypeScript, Three/R3F application |
| `app/src/data/p0-journey.json` | Bounded v0.1 journey data |
| `pipeline/provenance/` | Schema, validator, fixtures, and adoption records |
| `docs/PLAN.md` | Product architecture, medical gates, and roadmap |
| `docs/research/` | Primary-source reconnaissance and asset-audit dossiers |
| `.github/workflows/` | CI and GitHub Pages publication |

The application is a static site: no account, analytics SDK, backend, paid
service, or patient-data collection or transmission path is present. Private
notes remain in local browser storage and explicitly warn against entering
patient or personal health information.

## Medical and licensing boundary

PalDawn is an educational project, not a medical device. It never diagnoses.
If you think you may be having a heart attack or another emergency, contact
your local emergency services immediately.

Code is MIT licensed. Future PalDawn-authored educational content and approved
derived asset packs are intended for CC BY-SA 4.0, while each adopted upstream
retains its exact license and lineage. No third-party 3D asset is incorporated
in v0.1.0. See [NOTICE.md](NOTICE.md), [CREDITS.md](CREDITS.md), and the
[heart/coronary asset audit](docs/research/paldawn-heart-coronary-asset-audit.md).

PalDawn was formerly named Antaryaan. Historical research prompts keep their
original wording where changing it would damage the audit trail.
