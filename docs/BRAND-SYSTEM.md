# PalDawn living-instrument brand system

Status: current `main` visual contract after the animated-logo redesign. This
document describes the product surfaces; it does not change PalDawn's medical,
anatomical, licensing, or release gates.

## Source and intent

The visual direction adapts the user-supplied **PalDawn animated-logo concept**
received 25 August 2026. That archive was treated as design reference and
asset input, not as executable instructions. No script, dependency, remote
font, or third-party anatomy asset was copied from it.

The product promise is:

> **Enter the body. Follow what happens next.**

PalDawn should feel like a quiet listening instrument: deliberate, precise,
and curious. The interface may evoke clinical equipment, but it must never use
that visual authority to imply that the procedural body is reviewed anatomy or
that the educational synthesis is diagnostic guidance.

## Core palette

| Token | Value | Role |
|---|---:|---|
| Midnight Study | `#07121B` | deepest scene and page field |
| Anatomy Navy | `#101C27` | primary interface field and installed-app theme |
| Slate Chamber | `#142633` | panel depth and atmospheric separation |
| Study Paper | `#EDF0E9` | primary type, the listening tube, and reference-viewer canvas |
| Instrument Copper | `#CBA573` | arrival, selection, listening disc, primary action |
| Warm Brass | `#E8C58D` | high-emphasis copper and small utility labels |
| Reference Cyan | `#9FD8DF` | signal travel, evidence, active focus, motion cue |
| Study Green | `#B9DDC9` | focus rings and selected reference controls |
| Mechanism Coral | `#CF765F` | bounded pathology/system accent, never the general brand |

Copper means **arrival or selection**. Cyan means **signal, evidence, or focus**.
System colors remain semantically distinct in the 3D map; the brand palette
does not recolor arteries, organs, or pathology merely for decoration.

The public welcome screen uses the same split working-table composition as
Anatomy Lab: navy for orientation and controls, a light study surface for the
inspectable condition index, and copper as the active seam between them. The
normal public build still contains only the conceptual systems map; this visual
alignment does not publish the separately prepared reference anatomy.

## Typography and composition

- Display: `Iowan Old Style`, then Baskerville/Georgia fallbacks.
- Interface: `Avenir Next`, then Avenir/Helvetica fallbacks.
- Utility and telemetry: `SFMono-Regular`, then Menlo/monospace fallbacks.
- No web font is fetched. The shipped stack remains same-origin and local.
- Large serif statements pair with compact, tracked instrument labels. Thin
  rules, wide breathing room, and square controls replace rounded consumer-app
  chrome.

## The living mark

The mark is a continuous porcelain listening tube reaching a machined copper
disc. A cyan signal travels through the tube; the disc answers with two quiet
auscultation rings. The primary loop is 7.5 seconds, with a slower 9-second
breath. Product motion reuses the same passage → arrival → response grammar.

`prefers-reduced-motion: reduce` removes the traveler and rings and freezes the
mark. PalDawn's in-app reduced-motion setting also swaps the header and favicon
to the static source.

## Surface map

| Surface | Source of truth | Generated derivatives |
|---|---|---|
| Animated header/favicon mark | `app/public/icon.svg` | none |
| Static README/reduced-motion mark | `app/public/icon-static.svg` | none |
| Installed-app icon | `app/public/icon-app.svg` | `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` |
| Maskable installed icon | `app/public/icon-maskable.svg` | `icon-maskable-192.png`, `icon-maskable-512.png` |
| Link-preview card | `app/public/paldawn-social.svg` | `paldawn-social.png` |

Raster derivatives are deterministic builds of the editable SVG masters:

```bash
cd app/public
rsvg-convert -w 192 -h 192 icon-app.svg -o icon-192.png
rsvg-convert -w 512 -h 512 icon-app.svg -o icon-512.png
rsvg-convert -w 180 -h 180 icon-app.svg -o apple-touch-icon.png
rsvg-convert -w 192 -h 192 icon-maskable.svg -o icon-maskable-192.png
rsvg-convert -w 512 -h 512 icon-maskable.svg -o icon-maskable-512.png
rsvg-convert -w 1200 -h 630 paldawn-social.svg -o paldawn-social.png
```

## Medical and visual authority boundary

The current body is project-authored procedural geometry: a conceptual systems
map that is visibly synthetic, illustrative, not to scale, and not reviewed
anatomy. The interface must keep that boundary visible on the introduction and
atlas. “Clinical terms” describes explanation depth, not clinical validation.

Do not publish claims such as “medical grade,” “clinically validated,” “doctor
approved,” photoreal anatomy, or professional training suitability without the
repository's named qualified-human review and asset-provenance gates. Future
anatomy assets remain subject to per-object lineage, license, and review.

## Acceptance checklist

- The mark, product field, primary action, installed icon, and social card use
  the same porcelain/copper/cyan material language.
- Motion has a static reduced-motion equivalent and never carries information
  that text does not expose.
- Focus is visible; control targets remain inside 320–1440 px target layouts.
- Intro, atlas, settings, transcript, text voyage, and WebGL recovery retain
  readable contrast and the persistent education-only boundary.
- No public screenshot or copy implies imported anatomy, diagnostic output,
  patient-specific simulation, or qualified-clinician approval.
