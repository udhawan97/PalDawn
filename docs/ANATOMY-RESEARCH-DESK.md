# Anatomy research desk

## User request and implemented scope

Expand body-part study with diseases, ailments, explanations of normal function,
and topics that encourage medical-student research. Polish the interface,
provide learner control, verify and merge. The existing local-preview boundary
continues to apply; this does not authorize medical signoff or public anatomy
publication.

The desk provides 20 body-area tracks, 20 short function explanations with
research questions, and 113 distinct condition-reading topics. It reorganizes
existing MedlinePlus directory coverage into focused reading paths and adds
normal-function introductions; the condition links are not 113 new lessons.
The complete system directories and existing PalDawn disease pathways remain
accessible in expandable sections.

Students can choose any reading area independently of reference sex, locate
available source concepts, search within an area or across all 113 conditions,
follow PubMed review searches, save questions and conditions, switch card
density, hide the structure library for more reading space, and export a
Markdown reading plan. No accounts, analytics, automatic external requests,
new dependencies, new anatomy assets or persisted notes are introduced.

## Content and navigation contract

- `researchCatalog.json` contains explicit source IDs, primary-source links,
  short educational synthesis and authored inquiry prompts. Qualified review
  is pending. Source checks establish link availability, not medical approval.
- Model selection matches source-concept element membership. A child mesh can
  offer its parent organ's reading. These links do not assert pathology in the
  selected mesh. A matching name alone cannot create a link.
- Without an organ match, system-level suggestions are explicitly labeled as
  broader reading. Unmapped anatomy never invents a locator. Female reproductive
  reading is available from either reference, but its organ locators appear only
  when those exact source IDs exist in the active dataset.
- Queue IDs are deduplicated across areas and references. They stay in memory
  during navigation, reset on reload, and never migrate into unrelated app data.
  Export contains selected topics only. PubMed URLs are searches, not appraised
  papers or clinical recommendations.
- The normal build still excludes Anatomy Lab and the anatomy pack. Everything
  described here is available through `npm run anatomy:dev` / `anatomy:build`.

## Design

The reference body stays central. Surgical blue research controls distinguish
reading from model controls; a pale question card with a copper edge connects
an explanation to a research prompt. Georgia is reserved for questions and
headings; system sans is used for controls and monospace for source captions.
The inspector widens to 410px at standard desktop sizes. A two-column research
focus expands it further. Mobile retains the model and accessible panel tabs.
Structure context, old lessons and full directories use disclosure controls to
keep the new research tasks within reach.

## Sources

Links were checked on 2026-09-11 UTC: 129 distinct source URLs returned HTTP 200.
The source pages were inspected for the function explanations. MedlinePlus
condition titles/URLs were selected from the prepared directories and decoded
as plain text; no source HTML or images are embedded.

Function references include NHLBI heart conduction, blood flow and lung
physiology; NIDDK digestion, diabetes, kidneys and the urinary tract; NEI vision;
and MedlinePlus sleep, peripheral nerves, bone density, muscles, skin, immunity,
hormones, menstruation, male infertility and pregnancy. Each explanation links
to its own source in the interface and catalog. External source pages are
introductions; they do not establish a complete medical-student curriculum.

## Verification

`npm run anatomy:test` checks every authored anchor against the two prepared
inventories, positive organ and child-mesh matches, unknown meshes and absent
sex-specific locators, multi-word search and export inclusion/exclusion. Existing
mesh, picking, layout, lesson mapping and default-build exclusion checks remain.
Run `VITE_BASE_PATH=/PalDawn/ npm test`, provenance checks and both build modes.
Browser interaction and layout evidence is recorded separately from these
checks. Neither browser testing nor code review is qualified medical review.

Current local acceptance covered native Safari desktop rendering, heart
selection, function saving and condition browsing. The in-app browser covered
global search, queue retention across references, the actual Markdown download,
female uterus selection, queue removal, research focus and widths from 320 to
1440 pixels without horizontal overflow. Physical mobile Safari was not tested.
Graphify refreshed the code graph; 49 data/source files yielded no AST nodes,
including the catalog JSON. Catalog contents and source anchors were therefore
validated directly by the anatomy checks rather than inferred from the graph.
