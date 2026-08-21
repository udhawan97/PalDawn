# pipeline/provenance — provenance precedes adoption

Every direct third-party dependency, vendored snippet, asset, dataset, or
content item gets a **passing provenance record here before it is installed,
imported, adapted, or used**. Transitive npm packages are covered by the
lockfile plus `app/scripts/license-inventory.mjs` (denylist check) instead of
hand-authored records.

- `schema.json` — record shape (documentation).
- `validate.mjs` — deterministic validator, Node built-ins only. `node validate.mjs records/` or any file/dir list.
- `run-checks.mjs` — full check suite: valid fixtures must pass, invalid fixtures must fail (with the expected error codes), and every record in `records/` must pass. Run: `node run-checks.mjs`.
- `records/` — 23 live records: 13 used direct npm dependencies plus 10
  planned/pending/adoption-blocked Z-Anatomy audit drafts.
- `fixtures/valid/`, `fixtures/invalid/` — synthetic test records. Reviewer names in fixtures are clearly-marked fake test data, never real approvals.
- `tools/gen-npm-records.mjs` — regenerates npm dependency records from `app/package-lock.json`.

Fail-closed rules enforced: unresolved license/creator/source; GPL/AGPL code;
CC BY-NC family; unlicensed material; CC BY-SA in MIT code zones; premature
`used` claims (no approval or missing digests); medical subjects without a
named qualified review; code/tooling records inventing reviewers (must be
`not_applicable` + rationale).

An audit draft may pass while it is `planned`/`pending` and explicitly records
`license.object_level_status: unresolved` plus `adoption_gate.status: blocked`.
That pass validates the pending-state record, not the asset. The validator
rejects any attempt to promote such a record to `approved` or `used` with
`ADOPTION_BLOCKED`. Removing those audit fields is not a bypass: every
approved/used medical asset, dataset, or content record must positively set
`license.object_level_status: resolved` and `adoption_gate.status: clear`.

Medical asset records also fail closed on missing exact object/data-block
identity (or explicit unavailability evidence), missing TA2/FMA mapping source
pins/digests/method/confidence, and—when Z-Anatomy is the upstream—missing or
mismatched source-container digests. Promotion additionally requires
`ontology_mappings.status: approved`.

## Enforcement boundary

This validator is a deterministic **record-shape and policy-format linter**. It
does not authenticate a creator/reviewer, prove a licence applies to an object,
verify anatomy, or prove that IDs/names are true. It also does not yet reconcile
every file in future `content/` or release packs against a record. Those are
separate human-review, source-evidence, branch-protection, and asset-manifest
gates. A syntactic `PASS` never constitutes adoption or medical/legal approval.
