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
| Royal Void | `#050412` | deepest scene and page field |
| Instrument Violet | `#0A0820` | primary interface field and installed-app theme |
| Chamber Violet | `#151134` | panel depth and atmospheric separation |
| Porcelain | `#F2EDE0` | primary type and the listening tube |
| Imperial Gold | `#E0B653` | arrival, selection, listening disc, primary action |
| Bright Gold | `#F3D98A` | high-emphasis gold and small utility labels |
| Vital Cyan | `#45E6CF` | signal travel, evidence, active focus, motion cue |
| Aqua | `#7FE9D5` | focus rings and accessible focus outlines |
| Clinical Rose | `#F07D86` | bounded pathology/system accent, never the general brand |

Gold means **arrival or selection**. Cyan means **signal, evidence, or focus**.
System colors remain semantically distinct in the 3D map; the brand palette
does not recolor arteries, organs, or pathology merely for decoration.

## Typography and composition

- Display: `Iowan Old Style`, then Baskerville/Georgia fallbacks.
- Interface: `Avenir Next`, then Avenir/Helvetica fallbacks.
- Utility and telemetry: `SFMono-Regular`, then Menlo/monospace fallbacks.
- No web font is fetched. The shipped stack remains same-origin and local.
- Large serif statements pair with compact, tracked instrument labels. Thin
  rules, wide breathing room, and square controls replace rounded consumer-app
  chrome.

## The living mark

The mark is a continuous porcelain listening tube reaching a machined gold
disc. A cyan signal travels through the tube; the disc answers with two quiet
auscultation rings. The primary loop is 7.5 seconds, with a slower 9-second
breath. Product motion reuses the same passage → arrival → response grammar.

`prefers-reduced-motion: reduce` removes the traveler and rings and freezes the
mark. PalDawn's in-app reduced-motion setting also swaps the header and favicon
to the static source.

## Surface map

| Surface | Source of truth | Generated derivatives |
|---|---|---|
| Animated header/README mark | `app/public/icon.svg` | none |
| Static reduced-motion mark | `app/public/icon-static.svg` | none |
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
  the same porcelain/gold/cyan material language.
- Motion has a static reduced-motion equivalent and never carries information
  that text does not expose.
- Focus is visible; control targets remain inside 320–1440 px target layouts.
- Intro, atlas, settings, transcript, text voyage, and WebGL recovery retain
  readable contrast and the persistent education-only boundary.
- No public screenshot or copy implies imported anatomy, diagnostic output,
  patient-specific simulation, or qualified-clinician approval.
