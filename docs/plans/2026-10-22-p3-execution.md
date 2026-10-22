# P3 engineering execution and remaining gates

User-selected scope: P0–P3 source engineering, source release and preservation-first
main cleanup. Base: `7c57e05a15641ac7c2016515fb841041f260553a` (P0–P2 integrated).
This record describes the v0.6.2 source candidate; the matching hosted CI, Pages,
tag and GitHub Release establish publication separately.

P3 implements the [separate runtime contract and bounded loader](../SCENE-PACK-WORKBENCH.md)
and [seven-shot asset review preparation](../review/heart-seven-shot.md).
The existing proposal schema, dependencies, public content and storage remain unchanged.

| Gate | Candidate evidence | Remaining prerequisite |
| --- | --- | --- |
| Plan | Two rounds, four independent roles each; corrections incorporated | None for selected engineering scope |
| Baseline/pass 2 | Fresh two-engine narrow/desktop affected journeys, recovery and reentry | Native/device combinations remain separate |
| Manifest/loader | Deterministic fixtures, malformed/corrupt/missing/timeout, stale work and disposal checks | Measured exports before additional pack adoption |
| Recovery correction | WebKit timeout reason and loss-during-loading accounting regression tests | None for bounded source behavior |
| Asset dossier | Every current mesh part and seven storyboard shots inventoried | Missing geometry/views, qualified anatomy/clinical/rights review |
| Release | Proposed notes and source identity gates | Exact-head hosted CI/Pages and tag workflow must succeed |

Local commands from `app/`: `npm test`, `npm run graphics:build`,
`npm run graphics:test`, `npm run test:browser`, `npm run pwa:test:browser`,
`npm run licenses`; from repository root: `node pipeline/provenance/run-checks.mjs`.
Node 26.4.0/npm 11.17.0 locally; workflows use Node 22. Browser dependencies remain
Playwright 1.62.1. Native Safari 26.5.2 background control checks are limited;
no native pixel/animation, VoiceOver, physical-touch, installed-PWA or measured
hardware performance acceptance is inferred.

Next packet is P4 composition, conditioned on P3 runtime readiness and honest
missing-shot handling. Anatomy/clinical/rights review blocks adoption. P5 still
owns measured performance, native/device acceptance and controlled publication.
