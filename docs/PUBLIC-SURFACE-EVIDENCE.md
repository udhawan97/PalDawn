# Public surface evidence — v0.5.0 refresh

## Product facts and coverage

The comparison range is source release `v0.4.0` through the verified `v0.5.0`
release candidate. The GitHub release path provides source archives, not native
installers. Normal Pages builds exclude Anatomy Lab. Current source, runnable
behavior, exact-version metadata, and release gates take precedence over older
README prose.

| Surface / claim | Evidence | Status | Destination |
|---|---|---|---|
| Ten disease previews and source navigation | `diseases.ts`, Atlas Wayfinder/Research Lens contracts; runnable public-build intro | Shipped | README, getting-started guide, public intro |
| Atlas Study Desk, system browsing and evidence library | Local-study selectors, explicit `bodyParts` index, existing evidence ledgers, browser acceptance | Included in v0.5.0 candidate | README, study guide, public app |
| Fifty-condition plan, forty unavailable | `diseaseCatalog.ts`, curriculum checks | Planned beyond ten previews | README and guide |
| 20 tracks, 113 distinct condition topics | `researchCatalog.json`, `research.ts`, anatomy checks | Experimental | README, candidate website, research guide |
| Persistent Anatomy reading triage and validated structure resume | `ResearchDesk.tsx`, `studyStorage.ts`, schema-v1 migration and browser checks | Experimental | README, website, candidate guide |
| Male/female reference coverage and review status | Prepared immutable inventories, source IDs, provenance checks | Experimental | README, candidate reference section |
| Web app / source distribution | Pages/release workflows, package version, v0.5.0 release notes | Exact-commit release-gated | README action row and start matrix |
| Native installers | No installer workflow or release artifacts | Unavailable | Getting-started guide |
| Local data and update handoff | State modules, service worker, runtime contracts | Shipped in public app | Getting-started guide |
| Logos, social and PWA assets | `BRAND-SYSTEM.md`, SVG masters, manifest/HTML references | Retained | README, browser metadata, installed icons |
| Current screenshot set | Isolated Chromium/WebKit sessions at 1440×900, fictional local study notes only, no accounts | Current source | README; research image in candidate website only |
| Old first-light screenshot | Earlier genuine capture, no longer used by README | Historical | Retained asset, not labeled current |

The README now opens with the shared learner promise, **Know the body. Follow the
connections.**, then separates the public conceptual map from the locally prepared
reference-anatomy candidate before a visitor can mistake one for the other.

The public welcome screen is part of the app (`FlightDeck.tsx`), not a separate
marketing framework. Its actions and education boundary remain, while the
presentation now shares Anatomy Lab's navy, paper, copper, and study-green
working-table palette. A structure-to-source guide makes the relationship between
the two learning modes explicit without exposing the candidate anatomy chunks.
The candidate welcome page keeps its longer editorial research spread, real
study screenshot, reading-plan action, and setup/help navigation.

## Asset and capture record

- `docs/assets/paldawn-web-introduction.png`: current normal development build,
  default introduction, 1440×900, Chromium. Source: `FlightDeck.tsx` and public scene.
- `docs/assets/paldawn-atlas-study-desk.png`: current normal development build,
  fictional local sample study records, 1440×900, Chromium. Source:
  `AtlasStudyDesk.tsx`; the unavailable record intentionally demonstrates recovery.
- `docs/assets/paldawn-research-desk.png`: current local candidate, male reference,
  heart selected, research-focus layout, 1440×900, WebKit. Source: `AnatomyStudy.tsx`
  and `ResearchDesk.tsx`. BodyParts3D / Database Center for Life Science, CC BY 4.0;
  viewer adapted from Human Atlas by ashemag, MIT. See [credits](../CREDITS.md).
- Capture with an isolated browser session after running the documented Vite
  mode. For the study view, choose Heart, **Locate heart**, **Isolate structure**,
  **Focus on research**, and scroll the inspector to the research question.
  Use a 1440×900 viewport, pause optional rotation, and save PNG without resizing.
- Editable logos and the social SVG now share the navy, copper, and reference-cyan
  palette. PNG icon sizes and social dimensions match the manifest/HTML; SVGs
  parse and have `viewBox` attributes.
  No new fonts, stock images, external image requests, or medical demo claims.

## Verification and limits

Local verification logs live under ignored `output/docs-*`; they are working
evidence, not shipped dependencies. The published guides link to tracked docs.

Checks include the normal app test/build, separate public and Anatomy browser
configurations, candidate build and anatomy contracts, provenance, relative
links/anchors, raster dimensions, graphics workbenches, license inventory, and
a refreshed Graphify query. The graph omits some data files, so catalog
validation is direct.
Rendered acceptance distinguishes WebKit automation from native Safari and
physical mobile devices. Native Safari opened an exact diabetes step, saved it,
returned to the overview, reopened it in the Study Desk, and opened a one-page
US Letter print preview with application navigation removed. Populated note
privacy, injected recovery, reduced motion, no-WebGL behavior, and the full
viewport matrix are covered in Chromium/WebKit. Code/browser checks do not
establish anatomical accuracy or qualified medical approval.

The release workflow requires the exact release commit to be on `main` with
successful CI and Pages runs before the tag can publish. Earlier runs never
certify a later revision.

Rendered checks: 320, 375×812, 414, 768 and 1440×900 widths fit without
horizontal page overflow; the primary action remains reachable above the fold.
WebKit reduced-motion emulation disables ambient rotation. Keyboard focus is
visible. The 720×450 reflow check covers the effective viewport of 200% desktop
zoom; CSS 200% magnification is inspected separately and is not native browser
zoom certification. Light/dark theme switching is not offered by the candidate;
its fixed navy/paper palette now anchors both study modes.
Development capture logged a WebKit manifest warning and Vite reconnect during
source reload; the served manifest is valid JSON. Production builds and default
asset exclusion are checked independently.

Design rubric (1–5): product fidelity 5, hierarchy 4, originality 4, restraint 5,
proof 4, start/distribution clarity 5, accessibility 4, maintenance 4. Native
mobile Safari, physical-device performance, and clinical accuracy remain outside
this acceptance. These are design-review judgments, not measured user outcomes.

The rendered live Pages introduction was also checked: ten starting journeys,
Explore diabetes, Begin the voyage, and conceptual/unreviewed labels match the
normal-build story. The new source-reading sentence is a local change in this
refresh. The normal production output has no research-desk image; the candidate
output contains exactly one bundled copy. The new reading-plan CTA opens study
mode with the chosen reference. Both build manifests parse as JSON.

The introduction matrix covers small phones, tablets, short landscape windows,
desktop sizes, saved-work variants, and both Chromium and WebKit. The v0.5.0
rail keeps **Atlas desk** and **View 50** independently reachable down to 320 px.
