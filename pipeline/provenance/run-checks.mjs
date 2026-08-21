#!/usr/bin/env node
/**
 * Provenance check suite (deterministic, Node built-ins only).
 *  1. Every fixture in fixtures/valid/ must PASS.
 *  2. Every fixture in fixtures/invalid/ must FAIL and emit its expected error code.
 *  3. Every live record in records/ must PASS.
 * Exit 0 only if all three hold.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { validateRecord } from './validate.mjs'

const HERE = new URL('.', import.meta.url).pathname
const load = (p) => JSON.parse(readFileSync(p, 'utf8'))
const list = (dir) => readdirSync(join(HERE, dir)).filter((f) => f.endsWith('.json')).sort()

const EXPECTED_INVALID = {
  'gpl-code.json': 'LICENSE_DENIED',
  'ccbync-asset.json': 'LICENSE_DENIED',
  'missing-license.json': 'MISSING_FIELD',
  'premature-used.json': 'PREMATURE_USED',
  'medical-without-review.json': 'MEDICAL_REVIEW_REQUIRED',
  'sharealike-in-code-zone.json': 'SHARE_ALIKE_IN_CODE_ZONE',
  'code-review-mismatch.json': 'REVIEW_MISMATCH',
  'blocked-asset-promoted.json': 'ADOPTION_BLOCKED',
  'medical-asset-missing-adoption-evidence.json': 'ADOPTION_BLOCKED',
  'medical-asset-missing-object-evidence.json': 'MISSING_ASSET_EVIDENCE',
  'medical-asset-missing-ontology-evidence.json': 'MISSING_ONTOLOGY_EVIDENCE',
  'z-anatomy-asset-missing-container-evidence.json': 'MISSING_ASSET_EVIDENCE',
  'z-anatomy-asset-misclassified-nonmedical.json': 'MEDICAL_REVIEW_REQUIRED',
  'medical-asset-bad-output-digest.json': 'BAD_DIGEST',
}

let failures = 0
const report = (ok, label, detail = '') => {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? ' — ' + detail : ''}`)
  if (!ok) failures++
}

for (const f of list('fixtures/valid')) {
  const errors = validateRecord(load(join(HERE, 'fixtures/valid', f)))
  report(errors.length === 0, `valid fixture passes: ${f}`, errors.join('; '))
}

for (const f of list('fixtures/invalid')) {
  const errors = validateRecord(load(join(HERE, 'fixtures/invalid', f)))
  const expected = EXPECTED_INVALID[f]
  if (!expected) {
    report(false, `invalid fixture has no expectation registered: ${f}`)
    continue
  }
  const rejected = errors.length > 0
  const hasCode = errors.some((e) => e.startsWith(expected + ':'))
  report(rejected && hasCode, `invalid fixture rejected with ${expected}: ${f}`, rejected ? (hasCode ? '' : 'rejected but missing expected code; got: ' + errors.join('; ')) : 'was NOT rejected')
}

for (const f of list('records')) {
  const errors = validateRecord(load(join(HERE, 'records', f)))
  report(errors.length === 0, `live record passes: ${f}`, errors.join('; '))
}

console.log(failures === 0 ? 'ALL PROVENANCE CHECKS PASSED' : `${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
