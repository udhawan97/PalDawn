#!/usr/bin/env node
/**
 * PalDawn (formerly Antaryaan) universal provenance record validator.
 * Node built-ins only — no validation dependencies (bounded-run requirement).
 * Deterministic: files processed in sorted order; stable output; no clock use.
 *
 * This is a structural/format policy linter. It cannot authenticate creators,
 * reviewers, licences, anatomy, or the truth of supplied identifiers; those
 * remain human evidence and governance gates.
 *
 * Fail-closed record rules:
 *   - explicitly unresolved object evidence            -> may remain planned/pending only
 *   - blocked/unresolved record promoted to used        -> reject
 *   - license not on the landing-zone allowlist        -> reject
 *   - GPL/AGPL code, CC BY-NC(-SA/ND), unlicensed      -> reject
 *   - CC BY-SA in an MIT code zone (app/pipeline)      -> reject
 *   - usage_status "used" without approved status,
 *     source digest, and output digest                 -> reject (premature Used)
 *   - medical_scope without required named review      -> reject
 *   - pure code/tooling inventing a reviewer           -> reject (must be not_applicable + rationale)
 *
 * Usage: node validate.mjs <record.json | directory> [...more]
 * Exit:  0 all pass, 1 any failure or usage error.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const CODE_ZONES = new Set(['app', 'pipeline'])
const ZONES = new Set(['app', 'pipeline', 'content'])
const SUBJECT_TYPES = new Set(['code_dependency', 'vendored_code', 'tooling', 'asset', 'dataset', 'content'])
const CODE_TYPES = new Set(['code_dependency', 'vendored_code', 'tooling'])
const MEDICAL_CONTENT_TYPES = new Set(['asset', 'dataset', 'content'])
const MAPPING_STATUS = new Set(['pending_medical_review', 'approved', 'rejected'])
const USAGE = new Set(['planned', 'used'])
const APPROVAL = new Set(['pending', 'approved', 'rejected'])
const REVIEW_APPLICABILITY = new Set(['required', 'not_applicable'])

const CODE_ALLOW = new Set(['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD', 'Zlib', 'CC0-1.0', 'Unlicense', 'BlueOak-1.0.0', 'MIT-0'])
const CONTENT_ALLOW = new Set(['CC-BY-SA-4.0', 'CC-BY-SA-2.1-JP', 'CC-BY-4.0', 'CC0-1.0', 'LicenseRef-MedlinePlus-PublicDomain'])

const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0
const get = (obj, path) => path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj)
const validDigest = (v) => typeof v === 'string' && (
  /^sha256:[0-9a-f]{64}$/i.test(v) ||
  /^git-blob-sha1:[0-9a-f]{40}$/i.test(v) ||
  /^sha512-[A-Za-z0-9+/]+={0,2}$/.test(v)
)

export function validateRecord(r) {
  const errors = []
  const err = (code, msg) => errors.push(`${code}: ${msg}`)

  const requiredStrings = [
    'record_id',
    'subject.name',
    'upstream.repository',
    'upstream.version_or_commit',
    'upstream.source_digest',
    'upstream.creator',
    'license.spdx',
    'license.license_url',
    'license.source_url',
    'lineage',
    'modifications',
    'attribution.required_text',
    'attribution.source_pack_url',
  ]
  for (const path of requiredStrings) {
    if (!nonEmpty(get(r, path))) err('MISSING_FIELD', `"${path}" must be a non-empty string`)
  }
  if (nonEmpty(get(r, 'upstream.source_digest')) && !validDigest(get(r, 'upstream.source_digest'))) {
    err('BAD_DIGEST', '"upstream.source_digest" must be sha256:<64 hex>, git-blob-sha1:<40 hex>, or npm-style sha512-<base64>')
  }
  if (r.output_digest !== null && r.output_digest !== undefined && !validDigest(r.output_digest)) {
    err('BAD_DIGEST', 'non-null "output_digest" must be sha256:<64 hex>, git-blob-sha1:<40 hex>, or npm-style sha512-<base64>')
  }
  if (!SUBJECT_TYPES.has(get(r, 'subject.type'))) err('BAD_SUBJECT_TYPE', `"subject.type" must be one of ${[...SUBJECT_TYPES].join('|')}`)
  if (typeof r.medical_scope !== 'boolean') err('MISSING_FIELD', '"medical_scope" must be boolean')
  if (!ZONES.has(r.landing_zone)) err('BAD_LANDING_ZONE', `"landing_zone" must be one of ${[...ZONES].join('|')}`)
  if (!USAGE.has(r.usage_status)) err('BAD_USAGE_STATUS', `"usage_status" must be one of ${[...USAGE].join('|')}`)
  if (!APPROVAL.has(get(r, 'approval.status'))) err('BAD_APPROVAL', `"approval.status" must be one of ${[...APPROVAL].join('|')}`)
  if (!REVIEW_APPLICABILITY.has(get(r, 'review.applicability'))) err('BAD_REVIEW', `"review.applicability" must be one of ${[...REVIEW_APPLICABILITY].join('|')}`)
  const tools = get(r, 'reproduction.tools')
  const commands = get(r, 'reproduction.commands')
  if (!Array.isArray(tools) || tools.length === 0 || !tools.every(nonEmpty)) err('MISSING_FIELD', '"reproduction.tools" must be a non-empty string array')
  if (!Array.isArray(commands) || commands.length === 0 || !commands.every(nonEmpty)) err('MISSING_FIELD', '"reproduction.commands" must be a non-empty string array')

  const spdx = get(r, 'license.spdx')
  if (nonEmpty(spdx)) {
    const u = spdx.toUpperCase()
    if (u.includes('AGPL')) err('LICENSE_DENIED', `AGPL is denylisted (${spdx})`)
    else if (!u.includes('LGPL') && u.includes('GPL')) err('LICENSE_DENIED', `GPL is denylisted for code (${spdx})`)
    if (/BY[- ]?NC/.test(u)) err('LICENSE_DENIED', `CC BY-NC family is denylisted (${spdx})`)
    if (u === 'UNLICENSED' || u === 'NONE' || u === 'UNKNOWN') err('LICENSE_DENIED', `unresolved/absent license (${spdx})`)
    if (ZONES.has(r.landing_zone)) {
      if (CODE_ZONES.has(r.landing_zone)) {
        if (/CC[- ]?BY[- ]?SA/.test(u)) err('SHARE_ALIKE_IN_CODE_ZONE', `CC BY-SA material must not land in MIT code zone "${r.landing_zone}"`)
        else if (!CODE_ALLOW.has(spdx)) err('LICENSE_NOT_ALLOWED', `"${spdx}" is not on the code-zone allowlist (fail closed)`)
      } else if (!CONTENT_ALLOW.has(spdx)) {
        err('LICENSE_NOT_ALLOWED', `"${spdx}" is not on the content-zone allowlist (fail closed)`)
      }
    }
  }

  if (r.usage_status === 'used') {
    if (get(r, 'approval.status') !== 'approved') err('PREMATURE_USED', '"used" requires approval.status === "approved"')
    if (!nonEmpty(r.output_digest)) err('PREMATURE_USED', '"used" requires a non-empty "output_digest"')
    if (!nonEmpty(get(r, 'upstream.source_digest'))) err('PREMATURE_USED', '"used" requires a non-empty "upstream.source_digest"')
  }
  if (get(r, 'approval.status') === 'approved' && !nonEmpty(get(r, 'approval.approved_by'))) {
    err('MISSING_FIELD', 'approved records require "approval.approved_by"')
  }

  const adoptionBlocked = get(r, 'adoption_gate.status') === 'blocked'
  const objectEvidenceUnresolved = get(r, 'license.object_level_status') === 'unresolved'
  const promotionRequested = r.usage_status === 'used' || get(r, 'approval.status') === 'approved'
  if (promotionRequested && adoptionBlocked) {
    err('ADOPTION_BLOCKED', 'a record with adoption_gate.status = "blocked" cannot be approved or used')
  }
  if (promotionRequested && objectEvidenceUnresolved) {
    err('ADOPTION_BLOCKED', 'a record with license.object_level_status = "unresolved" cannot be approved or used')
  }
  if (promotionRequested && r.medical_scope === true && MEDICAL_CONTENT_TYPES.has(get(r, 'subject.type'))) {
    if (get(r, 'adoption_gate.status') !== 'clear') {
      err('ADOPTION_BLOCKED', 'approved/used medical assets, datasets, and content require adoption_gate.status = "clear"')
    }
    if (get(r, 'license.object_level_status') !== 'resolved') {
      err('ADOPTION_BLOCKED', 'approved/used medical assets, datasets, and content require license.object_level_status = "resolved"')
    }
  }

  const isMedicalAsset = r.medical_scope === true && get(r, 'subject.type') === 'asset'
  const medicalUpstream = /Z-Anatomy\/Models-of-human-anatomy|BodyParts3D/.test(get(r, 'upstream.repository') ?? '')
  if ((medicalUpstream || nonEmpty(get(r, 'subject.structure_id'))) && r.medical_scope !== true) {
    err('MEDICAL_REVIEW_REQUIRED', 'known anatomy upstreams and records with subject.structure_id must set medical_scope = true')
  }
  if (medicalUpstream && get(r, 'subject.type') !== 'asset') {
    err('MEDICAL_REVIEW_REQUIRED', 'known anatomy upstreams must use subject.type = "asset"')
  }
  if (isMedicalAsset) {
    for (const path of ['subject.structure_id', 'upstream.path', 'license.scope']) {
      if (!nonEmpty(get(r, path))) err('MISSING_ASSET_EVIDENCE', `medical assets require "${path}"`)
    }
    if (!new Set(['resolved', 'unresolved']).has(get(r, 'license.object_level_status'))) {
      err('MISSING_ASSET_EVIDENCE', 'medical assets require license.object_level_status = resolved|unresolved')
    }
    if (!new Set(['blocked', 'clear']).has(get(r, 'adoption_gate.status'))) {
      err('MISSING_ASSET_EVIDENCE', 'medical assets require adoption_gate.status = blocked|clear')
    }
    if (get(r, 'adoption_gate.status') === 'blocked') {
      const blockers = get(r, 'adoption_gate.blockers')
      if (!Array.isArray(blockers) || blockers.length === 0 || !blockers.every(nonEmpty)) {
        err('MISSING_ASSET_EVIDENCE', 'blocked medical assets require a non-empty adoption_gate.blockers string array')
      }
    }

    const sourceObject = get(r, 'source_object')
    if (!sourceObject || typeof sourceObject !== 'object' || !nonEmpty(sourceObject.object_type)) {
      err('MISSING_ASSET_EVIDENCE', 'medical assets require source_object.object_type')
    } else if (sourceObject.object_type === 'UNAVAILABLE') {
      const evidence = sourceObject.evidence
      if (!Array.isArray(evidence) || evidence.length === 0 || !evidence.every(nonEmpty)) {
        err('MISSING_ASSET_EVIDENCE', 'UNAVAILABLE medical assets require source_object.evidence')
      }
    } else {
      for (const field of ['object_name', 'data_block']) {
        if (!nonEmpty(sourceObject[field])) err('MISSING_ASSET_EVIDENCE', `medical assets require source_object.${field}`)
      }
      if (!sourceObject.geometry || typeof sourceObject.geometry !== 'object' || Array.isArray(sourceObject.geometry)) {
        err('MISSING_ASSET_EVIDENCE', 'available medical assets require source_object.geometry')
      }
    }

    const mappings = get(r, 'ontology_mappings')
    if (!mappings || typeof mappings !== 'object') {
      err('MISSING_ONTOLOGY_EVIDENCE', 'medical assets require ontology_mappings')
    } else {
      if (!MAPPING_STATUS.has(mappings.status)) {
        err('MISSING_ONTOLOGY_EVIDENCE', `ontology_mappings.status must be one of ${[...MAPPING_STATUS].join('|')}`)
      }
      for (const vocabulary of ['ta2', 'fma']) {
        const source = get(mappings, `source_evidence.${vocabulary}`)
        for (const field of ['repository', 'version_or_commit', 'path', 'sha256', 'method']) {
          if (!nonEmpty(source?.[field])) {
            err('MISSING_ONTOLOGY_EVIDENCE', `ontology_mappings.source_evidence.${vocabulary}.${field} is required`)
          }
        }
        const entries = mappings[vocabulary]
        if (!Array.isArray(entries) || entries.length === 0) {
          err('MISSING_ONTOLOGY_EVIDENCE', `ontology_mappings.${vocabulary} must be a non-empty array`)
          continue
        }
        for (const [index, entry] of entries.entries()) {
          if (!entry || typeof entry !== 'object' || !nonEmpty(entry.label) || !nonEmpty(entry.confidence) || !nonEmpty(entry.basis)) {
            err('MISSING_ONTOLOGY_EVIDENCE', `ontology_mappings.${vocabulary}[${index}] requires label, confidence, and basis`)
          }
          const idPattern = vocabulary === 'ta2' ? /^TA2:\d+$/ : /^FMA:\d+$/
          if (entry?.id !== null && !idPattern.test(entry?.id ?? '')) {
            err('MISSING_ONTOLOGY_EVIDENCE', `ontology_mappings.${vocabulary}[${index}].id has an invalid format`)
          }
          if (entry?.id === null && entry?.confidence !== 'unresolved') {
            err('MISSING_ONTOLOGY_EVIDENCE', `a null ontology ID requires confidence = "unresolved"`)
          }
        }
      }
      if (promotionRequested && mappings.status !== 'approved') {
        err('ADOPTION_BLOCKED', 'approved/used medical assets require ontology_mappings.status = "approved"')
      }
    }

    if (get(r, 'upstream.repository')?.includes('Z-Anatomy/Models-of-human-anatomy')) {
      for (const path of ['source_container.path', 'source_container.zip_git_blob_sha1', 'source_container.zip_sha256', 'source_container.inner_blend_sha256']) {
        if (!nonEmpty(get(r, path))) err('MISSING_ASSET_EVIDENCE', `pinned Z-Anatomy assets require "${path}"`)
      }
      const innerDigest = get(r, 'source_container.inner_blend_sha256')
      if (nonEmpty(innerDigest) && get(r, 'upstream.source_digest') !== `sha256:${innerDigest}`) {
        err('MISSING_ASSET_EVIDENCE', 'upstream.source_digest must match source_container.inner_blend_sha256')
      }
    }
  }

  const applicability = get(r, 'review.applicability')
  if (r.medical_scope === true) {
    if (applicability !== 'required') err('MEDICAL_REVIEW_REQUIRED', 'medical_scope records must set review.applicability = "required"')
    if (get(r, 'approval.status') === 'approved' || r.usage_status === 'used') {
      for (const f of ['review.reviewer', 'review.reviewer_qualification', 'review.date', 'review.status', 'review.claim_scope']) {
        if (!nonEmpty(get(r, f))) err('MEDICAL_REVIEW_REQUIRED', `approved/used medical records require "${f}" (named qualified human review)`)
      }
      if (nonEmpty(get(r, 'review.status')) && get(r, 'review.status') !== 'approved') err('MEDICAL_REVIEW_REQUIRED', 'approved/used medical records require review.status === "approved"')
    }
  } else if (CODE_TYPES.has(get(r, 'subject.type'))) {
    if (applicability !== 'not_applicable') err('REVIEW_MISMATCH', 'non-medical code/tooling must use review.applicability = "not_applicable" (never invent a reviewer)')
    if (!nonEmpty(get(r, 'review.rationale'))) err('REVIEW_MISMATCH', 'review.applicability = "not_applicable" requires a "review.rationale"')
  }

  return errors.sort()
}

function collectFiles(target) {
  const st = statSync(target)
  if (st.isFile()) return [target]
  return readdirSync(target)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => join(target, f))
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())
if (isMain) {
  const targets = process.argv.slice(2)
  if (targets.length === 0) {
    console.error('usage: node validate.mjs <record.json | directory> [...more]')
    process.exit(1)
  }
  let failures = 0
  const files = targets.flatMap(collectFiles).sort()
  for (const file of files) {
    let record
    try {
      record = JSON.parse(readFileSync(file, 'utf8'))
    } catch (e) {
      console.log(`FAIL ${relative(process.cwd(), file)}`)
      console.log(`  PARSE_ERROR: ${e.message}`)
      failures++
      continue
    }
    const errors = validateRecord(record)
    if (errors.length === 0) {
      console.log(`PASS ${relative(process.cwd(), file)}`)
    } else {
      console.log(`FAIL ${relative(process.cwd(), file)}`)
      for (const e of errors) console.log(`  ${e}`)
      failures++
    }
  }
  console.log(`${files.length - failures}/${files.length} records valid`)
  process.exit(failures > 0 ? 1 : 0)
}
