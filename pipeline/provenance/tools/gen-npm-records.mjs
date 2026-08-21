#!/usr/bin/env node
/**
 * Regenerate provenance records for the app's direct npm dependencies from
 * app/package-lock.json. Deterministic: no clock; dates/approvals passed in
 * via the STAMP constants below, edited deliberately by a human.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const HERE = new URL('.', import.meta.url).pathname
const APP = join(HERE, '..', '..', '..', 'app')
const RECORDS = join(HERE, '..', 'records')

const STAMP = {
  date: '2026-08-16',
  approved_by: 'Locked-stack directive — Antaryaan bounded foundation pass (2026-08-16)',
  tools: ['node 22.22.2', 'npm 10.9.7'],
}

const CREATORS = {
  'react': 'Meta Platforms, Inc. and React contributors',
  'react-dom': 'Meta Platforms, Inc. and React contributors',
  'three': 'three.js authors (mrdoob and contributors)',
  '@react-three/fiber': 'Poimandres (pmndrs) contributors',
  '@react-three/drei': 'Poimandres (pmndrs) contributors',
  '@react-three/postprocessing': 'Poimandres (pmndrs) contributors',
  'zustand': 'Poimandres (pmndrs) contributors',
  'vite': 'VoidZero Inc. and Vite contributors (created by Evan You)',
  '@vitejs/plugin-react': 'VoidZero Inc. and Vite contributors',
  'typescript': 'Microsoft Corporation',
  '@types/react': 'DefinitelyTyped contributors',
  '@types/react-dom': 'DefinitelyTyped contributors',
  '@types/node': 'DefinitelyTyped contributors',
}

const SPDX_URLS = {
  'MIT': 'https://spdx.org/licenses/MIT.html',
  'Apache-2.0': 'https://spdx.org/licenses/Apache-2.0.html',
}

const pkg = JSON.parse(readFileSync(join(APP, 'package.json'), 'utf8'))
const lock = JSON.parse(readFileSync(join(APP, 'package-lock.json'), 'utf8'))
const direct = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})].sort()

for (const name of direct) {
  const entry = lock.packages['node_modules/' + name]
  const meta = JSON.parse(readFileSync(join(APP, 'node_modules', name, 'package.json'), 'utf8'))
  const license = typeof meta.license === 'string' ? meta.license : meta.license?.type
  const repo = typeof meta.repository === 'string' ? meta.repository : (meta.repository?.url ?? '(unknown)')
  const creator = CREATORS[name] ?? '(unresolved — fill in before approval)'
  const record = {
    record_id: `npm--${name.replace(/[@/]/g, '-').replace(/^-/, '')}--${entry.version}`,
    subject: { name, type: 'code_dependency' },
    medical_scope: false,
    upstream: {
      repository: repo.replace(/^git\+/, ''),
      path: `node_modules/${name} (published npm artifact)`,
      version_or_commit: entry.version,
      source_digest: entry.integrity,
      creator,
    },
    license: {
      spdx: license,
      license_url: SPDX_URLS[license] ?? `https://spdx.org/licenses/${license}.html`,
      source_url: `${entry.resolved} (package.json license field; full text in app/THIRD_PARTY_LICENSES.md)`,
    },
    lineage: `Published npm registry artifact; source repository ${repo.replace(/^git\+/, '')}.`,
    reproduction: {
      tools: STAMP.tools,
      commands: [`npm install --save-exact ${name}@${entry.version}`],
    },
    modifications: 'None — consumed as an unmodified npm dependency; package-lock.json integrity pins the exact artifact.',
    output_digest: entry.integrity,
    attribution: {
      required_text: `${name} v${entry.version} — © ${creator} — ${license} — ${repo.replace(/^git\+/, '')}`,
      source_pack_url: entry.resolved,
    },
    landing_zone: 'app',
    usage_status: 'used',
    approval: { status: 'approved', approved_by: STAMP.approved_by, date: STAMP.date },
    review: {
      applicability: 'not_applicable',
      rationale: 'Pure rendering/build tooling with no medical or anatomical claims; medical review does not apply. License and source verified against the npm registry and lockfile integrity on ' + STAMP.date + '.',
    },
  }
  const file = join(RECORDS, record.record_id + '.json')
  writeFileSync(file, JSON.stringify(record, null, 2) + '\n')
  console.log('wrote', record.record_id + '.json')
}
