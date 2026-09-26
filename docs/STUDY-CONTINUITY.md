# Study Continuity

Study Continuity turns the existing disease previews into repeatable local study sessions. It does not add medical claims, anatomy, assessment, diagnosis, or treatment guidance.

## What learners can do

- Open or share an exact condition step. Links use stable disease and step IDs, validate optional structure focus, and work at the GitHub Pages base path.
- Save a step, add a private note, and mark it studied. These controls are independent: removing a saved flag does not erase a note or study mark.
- Continue from the last Atlas step from the landing page. Explicit links always take priority over the saved position.
- Compare the existing Plain English and Clinical terms for a complete pathway in a focused reading view.
- Export selected study records as Markdown. Private notes are excluded unless the learner explicitly opts in. Removed catalog targets remain labeled and recoverable in the overview, local-data backup, and full Atlas study export. The focused reading view also supplies print styling for the browser's print command.
- Open the Atlas Study Desk to review activity counts, filter saved/open/studied/noted records, search authored labels and local private notes, continue the next open saved step, export the complete study, or print the filtered view.
- Browse pathways by body structure using only the structure IDs explicitly authored on existing steps, and search one evidence library that preserves each exact source-to-step edge while separating ranking context.

Personal notes and study marks remain local browser data. They are not evidence, medical review, certification, or proof of mastery. The focused reader reuses the existing authored text, cautions, and exact bundled source links.

## Routes and history

Atlas links use `#atlas/<disease-id>/<step-id>` and may add a validated `part` query parameter. Opening Atlas from within the app creates one history entry; changing steps replaces that entry. Closing returns to the prior PalDawn surface. Closing a link opened directly clears only the Atlas hash and shows the overview without navigating away from PalDawn. Invalid and malformed Atlas links fail closed with an unavailable-link message.

Legacy First Light `#stage/...` links remain independent.

## Local data and recovery

Atlas data lives under `paldawn:atlas-study:v1` and is generation-bound with the existing settings, journey, bookmark, and workspace records. It participates in reset, backup replacement, interrupted-transaction recovery, cross-tab storage updates, and the PWA pre-update save gate.

The record is bounded to 150 step entries and 1,200 characters per note. Backup schema version 3 adds `atlasStudy`; imports continue to accept versions 1 and 2 with an empty Atlas scope. Legacy transaction receipts that predate the Atlas key recover it as empty rather than becoming corrupt.

## Verification

The deterministic suite checks route validation, malformed encoding, record bounds, note sanitization, unavailable-record recovery, source-linked export, prior storage behavior, production builds, and graphics boundaries. Browser checks cover direct links, reload/close behavior, persistence, backup inclusion, comparison reading, optional-note export, and narrow interaction in Chromium and WebKit. The dedicated service-worker lifecycle harness verifies that updates remain gated by successful local persistence.

Native Safari print preview opens a single-page US Letter study sheet with app
navigation removed. Populated private-note inclusion and exclusion are covered
in the Chromium/WebKit print-media checks. Physical-mobile acceptance remains a
separate manual check.
