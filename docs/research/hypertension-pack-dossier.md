# Hypertension disease-pack dossier — planning candidate

Status: **planning only · publication blocked**

Pack: `hypertension@proposal-0.1.0`

Last source check: 2026-08-31

Medical reviewer: **not assigned**

Anatomy reviewer: **not assigned**

This document is a build dossier, not a hypertension lesson, clinical
training, diagnosis, or treatment guidance. It records the claims and scene
intent that would require qualified review before PalDawn can make the
condition explorable.

## Why this vertical slice

Hypertension is useful as the first Curriculum 50 disease-pack proposal
because it requires PalDawn to relate measurement context, the cardiovascular
and renal systems, multiple target organs, vessel scale, tissue perfusion, and
cellular control without pretending that every learner or patient follows one
fixed progression. The same scene family can later support several
cardiovascular journeys through data rather than renderer forks.

## Source ledger

| ID | Organization | Source | Intended scope |
|---|---|---|---|
| `who-hypertension-2025` | World Health Organization | [Hypertension](https://www.who.int/news-room/fact-sheets/detail/hypertension) | Global overview, measurement framing, symptoms boundary, and affected organs |
| `nhlbi-high-blood-pressure-2024` | NIH · NHLBI | [High Blood Pressure](https://www.nhlbi.nih.gov/health/high-blood-pressure) | U.S. measurement terminology and threshold context |
| `niddk-hypertension-kidney-2020` | NIH · NIDDK | [High Blood Pressure & Kidney Disease](https://www.niddk.nih.gov/health-information/kidney-disease/high-blood-pressure) | Kidney-vessel damage and pressure/fluid relationship |

These are source records, not PalDawn approval. Publication still requires a
named qualified clinician to review the exact claims, wording, visual scope,
and immutable candidate commit.

## Threshold context that must remain visible

The cited sources use different diagnostic framing. WHO describes readings of
at least 140/90 mmHg on two different days. The cited U.S. NHLBI material
describes consistent readings of at least 130/80 mmHg. A future lesson must
name its guideline and measurement context; it must not silently combine those
numbers into a universal threshold.

## Claim inventory

Every claim below is `pending` qualified review.

| Claim | Draft statement | Source IDs |
|---|---|---|
| `htn-pressure-definition` | Blood pressure describes force against blood-vessel walls; systolic and diastolic values represent different parts of the heartbeat. | WHO, NHLBI |
| `htn-often-asymptomatic` | Hypertension often causes no symptoms, so measurement is necessary to detect it. | WHO, NHLBI |
| `htn-threshold-context` | Diagnostic thresholds depend on the named guideline context and measurement protocol. | WHO, NHLBI |
| `htn-target-organs` | Uncontrolled hypertension is associated with harm involving the heart, brain, blood vessels, and kidneys. | WHO, NHLBI |
| `htn-kidney-cycle` | Kidney blood-vessel damage can reduce kidney function, while retained fluid can further increase blood pressure. | NIDDK |

## Normal-versus-condition storyboard

The future comparison must use the same camera, scale, time, and structure
selection for both states. No asset or simulated outcome exists in this slice.

| Scale | Planned focus | Comparison question |
|---|---|---|
| L0 · Body | Measurement context and whole-person orientation | What can a measurement show that symptoms may not? |
| L1 · System | Cardiovascular–renal relationships | Which systems influence pressure, and which systems can be affected? |
| L2 · Organ | Heart, brain, and kidneys | How can one vascular condition matter in several organs? |
| L3 · Structure | Artery-to-arteriole transition | How does vessel size change what should be visible? |
| L4 · Tissue | Vessel wall, lumen, and tissue bed | Which visible differences belong to the wall, lumen, or surrounding tissue? |
| L5 · Cellular | Endothelium, smooth muscle, and signalling membrane | What must be shown as a relationship rather than a literal scale model? |

## Reviewer packet

A review candidate must include all of the following against one immutable
commit:

1. claim-to-source ledger with source excerpts and retrieval dates;
2. Plain English and Clinical terms side by side for the same mechanism state;
3. desktop and narrow screenshots for every scale and comparison state;
4. motion recording plus reduced-motion and text-only routes;
5. asset-by-asset creator, license, transformation, digest, units, and
   containment evidence;
6. explicit variation, uncertainty, threshold context, and emergency-care
   boundary;
7. named reviewer identity, qualifications, consent, scope, findings, and
   sign-off date.

Until those items pass, the pack must have no journey ID, no approved assets,
no content digest, and no route into **Explore now**.
