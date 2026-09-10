# Main cleanup — 2026-09-10

Baseline: `ed800e6f99345d8bbbe611f0e5098864ce02ab50`, verified on local and
remote main. The user clarified that main must be retained and relevant branch
work consolidated. No tag or release is part of this task.

## Recovered work

The local workspace search and pre-read backup size limit from Foundation+4 (`dcabc16`, retained through
`8971255`) is adapted into current `FlightDeck.tsx` and current styles. Search
covers stage labels, levels, both authored tracks and current private notes.
Selecting a match opens that stage's comparison and note without moving the
journey. Backups larger than 256 KiB are rejected before file reading in both normal import and recovery. Search state stays in memory; existing storage, corruption recovery,
reset generations and export behavior are unchanged. Narrow results stack into
a single column.

This is a selective integration, not a merge of the entire Foundation branch.
The historical screenshots, timing measurements and acceptance claims from
that branch are not copied as evidence for current main.

## Complete branch inventory

All original worktrees were clean for tracked and untracked files. Ignored
preview/model/build artifacts remain protected. Git fetch with pruning found
one non-main remote branch: Foundation+4. GitHub connector search found only
the already merged graphics PR #1, with no open PRs.

| Branch suffix (`stay-calm-its-codex/`) | Tip | Disposition and evidence |
| --- | --- | --- |
| `human-atlas-study` | `ed800e6` | Already integrated: exact main tip, empty `git cherry`, zero merge conflicts. Remove the redundant branch after promotion; retain its checkout detached at its original `ed800e6` because it contains the running local preview and prepared reference pack. |
| `foundation-plus-4` | `8971255` | Search and pre-read backup limit selectively integrated. Preserve local and remote refs and its worktree. Four unique patches; full merge has 26 conflicts. Remaining v3 journey-scoped storage and pack identity migration overlaps newer main recovery/transaction/reset fixes. That migration needs a compatibility design and its own migration acceptance, not replacement with the older implementation. Lazy scene loading and two-engine tests already have current implementations on main. The independent performance-capture script and DawnInstrument/RouteBeacon/core graphics are preserved for adaptation and acceptance against the current renderer; old frame measurements do not establish current performance. |
| `black-box-conditions` | `fff87be` | Preserve. One unique patch and 12 conflicts. Adds unreviewed MS, sleep-apnea, celiac and epilepsy lessons plus dedicated cues and changes the catalog; current qualified-content requirements remain applicable. Not equivalent to the anatomy-reference candidate. |
| `deep-lens-v0.4.0` | `f60478b` | Preserve. One unique patch and 19 conflicts. Adds parametric anatomical asset, layered-heart mechanisms, data and alternative scene architecture. Different source/base from the Clinical Atlas continuation: range/tree comparisons do not prove whole-branch equivalence. |
| `clinical-atlas-v0.4` | `71e2315` | Preserve its branch/worktree. Three unique non-merge patches and 14 conflicts. `docs/review/publication-gate.json` explicitly blocks main integration, with both anatomy and clinical signoffs missing. It also contains world-conflict data and changes beyond the current anatomy study scope. |

Conflict counts come from `git merge-tree --write-tree main <branch>` on the
baseline and are evidence of overlapping changes, not by themselves a reason
to discard work. No ambiguous branch is declared redundant or deleted.

## Verification and promotion

- Full `VITE_BASE_PATH=/PalDawn/ npm test` passed: typecheck, build, release,
  foundation/runtime, atlas/curriculum/disease contracts and graphics geometry.
- New search regression passed in Chromium and WebKit: current note search,
  case/whitespace normalization, deletion updating results, authored-stage
  search, result selection preserving journey progress, and 320px overflow.
- Provenance validation passed. No medical approval is inferred.
- The expanded Foundation+3 browser suite passed 14/14 in Chromium and WebKit, including pre-read rejection without changing stored data, persistence across tabs, exports and replacement validation.
- Graphify code update completed (1099 nodes, 1739 edges); scoped WorkspacePanel query corroborated its journey and local-study connections. Its existing semantic-document extraction limitation remains.
- Final browser results and remote SHA are recorded in the task completion evidence after verification.

The normal Pages build continues to exclude the male/female Anatomy Lab
candidate. Source integration does not enable it on the public website.
