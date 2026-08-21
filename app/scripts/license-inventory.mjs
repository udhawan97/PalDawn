#!/usr/bin/env node
/**
 * Transitive dependency license inventory for PalDawn.
 * Node built-ins only. Deterministic output (sorted, no timestamps).
 *
 * Policy (docs/PLAN.md — provenance-before-adoption):
 *   deny  : GPL, AGPL, CC BY-NC(-SA/ND), UNLICENSED, missing/unknown license
 *   review: LGPL, MPL, EPL, CDDL, anything not on the allowlist
 *   allow : permissive set below (plus OR-expressions satisfiable by it)
 * Exit code 1 if any denied entry exists; 0 otherwise.
 */
import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const NM = join(ROOT, 'node_modules')

/**
 * Explicit fail-closed resolutions. A package lands here ONLY when its
 * published artifact carries a verifiable license despite missing/broken
 * package.json metadata. Each entry records the evidence; unknowns still deny.
 */
const RESOLUTIONS = new Map([
  ['webgl-constants@1.1.1', {
    license: 'MIT',
    evidence: 'Published npm tarball ships a verbatim MIT LICENSE file (Copyright (c) 2019 Tim van Scherpenzeel); sha256 0969fa65680b694452c2c65981df14af5c192da24f2b1f87bdd51d8ed24efcfa. Only the package.json license field is absent. Transitive via @react-three/drei -> detect-gpu.',
  }],
])

const ALLOW = new Set([
  'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD',
  'Zlib', 'CC0-1.0', 'Unlicense', 'BlueOak-1.0.0', 'Python-2.0',
  'CC-BY-4.0', 'MIT-0', 'WTFPL',
])

function classifyId(id) {
  const u = id.toUpperCase()
  if (u.includes('AGPL')) return 'deny'
  if (u.includes('LGPL')) return 'review'
  if (u.includes('GPL')) return 'deny'
  if (/BY[- ]?NC/.test(u)) return 'deny'
  if (u === 'UNLICENSED' || u === 'NONE' || u === 'UNKNOWN') return 'deny'
  if (ALLOW.has(id)) return 'allow'
  return 'review'
}

function classifyExpression(expr) {
  if (!expr || typeof expr !== 'string' || expr.trim() === '') return 'deny'
  const cleaned = expr.replace(/[()]/g, ' ').trim()
  if (/\sOR\s/i.test(cleaned)) {
    const parts = cleaned.split(/\sOR\s/i).map((p) => p.trim())
    const results = parts.map(classifyId)
    if (results.includes('allow')) return 'allow'
    if (results.includes('review')) return 'review'
    return 'deny'
  }
  if (/\sAND\s/i.test(cleaned)) {
    const parts = cleaned.split(/\sAND\s/i).map((p) => p.trim())
    const results = parts.map(classifyId)
    if (results.every((r) => r === 'allow')) return 'allow'
    if (results.includes('deny')) return 'deny'
    return 'review'
  }
  return classifyId(cleaned)
}

function licenseOf(pkg) {
  if (typeof pkg.license === 'string') return pkg.license
  if (pkg.license && typeof pkg.license.type === 'string') return pkg.license.type
  if (Array.isArray(pkg.licenses) && pkg.licenses.length > 0) {
    return pkg.licenses.map((l) => (typeof l === 'string' ? l : l.type)).join(' OR ')
  }
  return ''
}

const seen = new Map()
function walk(dir) {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.name.startsWith('@')) {
      walk(full)
      continue
    }
    const pj = join(full, 'package.json')
    if (existsSync(pj)) {
      try {
        const pkg = JSON.parse(readFileSync(pj, 'utf8'))
        if (pkg.name && pkg.version) {
          const key = `${pkg.name}@${pkg.version}`
          if (!seen.has(key)) {
            const license = licenseOf(pkg)
            const resolution = RESOLUTIONS.get(key)
            if (!license && resolution) {
              seen.set(key, { name: pkg.name, version: pkg.version, license: `${resolution.license} (resolved)`, verdict: classifyExpression(resolution.license), note: resolution.evidence })
            } else {
              seen.set(key, { name: pkg.name, version: pkg.version, license: license || '(none declared)', verdict: classifyExpression(license) })
            }
          }
        }
      } catch {
        /* unreadable package.json -> surfaced below as deny */
        const key = `${entry.name}@(unparsed)`
        if (!seen.has(key)) seen.set(key, { name: entry.name, version: '(unparsed)', license: '(unreadable package.json)', verdict: 'deny' })
      }
      const nested = join(full, 'node_modules')
      if (existsSync(nested)) walk(nested)
    }
  }
}

walk(NM)

const entries = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version))
const denied = entries.filter((e) => e.verdict === 'deny')
const review = entries.filter((e) => e.verdict === 'review')
const allowed = entries.filter((e) => e.verdict === 'allow')

const out = {
  note: 'PalDawn transitive license inventory. Deterministic; regenerate with `npm run licenses`. Policy: see scripts/license-inventory.mjs and docs/PLAN.md.',
  counts: { total: entries.length, allowed: allowed.length, review: review.length, denied: denied.length },
  denied,
  review,
  allowed,
}
writeFileSync(join(ROOT, 'third-party-license-inventory.json'), JSON.stringify(out, null, 2) + '\n')

console.log(`packages: ${entries.length}  allowed: ${allowed.length}  review: ${review.length}  denied: ${denied.length}`)
for (const e of entries.filter((x) => x.note)) console.log(`RESOLVED  ${e.name}@${e.version}  ${e.license}`)
for (const e of review) console.log(`REVIEW  ${e.name}@${e.version}  ${e.license}`)
for (const e of denied) console.log(`DENIED  ${e.name}@${e.version}  ${e.license}`)
process.exit(denied.length > 0 ? 1 : 0)
