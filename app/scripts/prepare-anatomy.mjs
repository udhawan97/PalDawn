import { execFileSync } from 'node:child_process'
import { mkdtempSync, cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
const femalePin = 'd72b4f6db42e41a8db84b1c19ff6d86ee7b65284'
const pin = '1c38bf35c254a891200d3cedecfd57abebe83d8d'
const repo = mkdtempSync(join(tmpdir(), 'paldawn-anatomy-'))
execFileSync('git', ['clone', '--quiet', 'https://github.com/ashemag/human-atlas.git', repo], { stdio: 'inherit' })
execFileSync('git', ['-C', repo, 'checkout', '--quiet', pin], { stdio: 'inherit' })
const pack = resolve('../output/anatomy')
mkdirSync(pack, { recursive: true })
cpSync(join(repo, 'public/models'), join(pack, 'models'), { recursive: true })
execFileSync('git', ['-C', repo, 'checkout', '--quiet', femalePin])
for (const name of ['atlas-female.json', ...Array.from({ length: 10 }, (_, i) => [`female-${i}.bin`, `female-${i}.bin.gz`]).flat()]) cpSync(join(repo, 'public/models', name), join(pack, 'models', name))
cpSync(join(repo, 'public/ATTRIBUTION.md'), join(pack, 'ATTRIBUTION.md'))
const femaleText = readFileSync(join(repo, 'app/anatomy.ts'), 'utf8')
execFileSync('git', ['-C', repo, 'checkout', '--quiet', pin])
const text = readFileSync(join(repo, 'app/anatomy.ts'), 'utf8')
const systems = Object.fromEntries([...text.matchAll(/\{id:'([^']+)',name:'[^']+',color:'[^']+',description:'([^']*)'\}/g)].map(m => [m[1], m[2]]))
const structures = Object.fromEntries([...text.slice(text.indexOf('export const EXPLANATIONS')).matchAll(/ '([^']+)':'([^']*)'/g)].map(m => [m[1], m[2]]))
if (Object.keys(systems).length !== 15 || Object.keys(structures).length !== 9) throw new Error('Upstream context extraction changed')
writeFileSync(join(pack, 'context.json'), JSON.stringify({ systems, structures, femaleStructures: Object.fromEntries([...femaleText.slice(femaleText.indexOf('export const EXPLANATIONS')).matchAll(/ '([^']+)':'([^']*)'/g)].map(m => [m[1], m[2]])) }))
await import('./prepare-anatomy-reading.mjs')
const atlas = JSON.parse(readFileSync(join(pack, 'models/atlas.json')))
const female = JSON.parse(readFileSync(join(pack, 'models/atlas-female.json')))
const files = ['models/atlas.json', 'models/atlas-female.json', 'context.json', 'ATTRIBUTION.md', ...[...atlas.chunks, ...female.chunks].flatMap(c => [c.url, c.gzip].filter(Boolean).map(url => 'models/' + url.split('/').pop()))]
writeFileSync(join(pack, 'manifest.json'), JSON.stringify({ upstream: pin, femaleUpstream: femalePin, review: 'pending', files: Object.fromEntries(files.map(file => [file, createHash('sha256').update(readFileSync(join(pack, file))).digest('hex')])) }, null, 2))
console.log(`Prepared ${atlas.parts.length} meshes and ${atlas.concepts.length} concepts for LOCAL REVIEW ONLY at ${pack}.`)
