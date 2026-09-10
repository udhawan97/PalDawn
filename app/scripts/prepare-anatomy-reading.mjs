import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
const directories = {
  skeletal: 'bonesjointsandmuscles', muscular: 'bonesjointsandmuscles', connective: 'bonesjointsandmuscles',
  cardiac: 'bloodheartandcirculation', arterial: 'bloodheartandcirculation', venous: 'bloodheartandcirculation',
  nervous: 'brainandnerves', sensory: 'eyesandvision', respiratory: 'lungsandbreathing', digestive: 'digestivesystem',
  urinary: 'kidneysandurinarysystem', reproductive: 'malereproductivesystem', lymphatic: 'immunesystem',
  endocrine: 'endocrinesystem', integumentary: 'skinhairandnails',
}
const pages = new Map()
for (const directory of new Set([...Object.values(directories), 'earnoseandthroat', 'femalereproductivesystem'])) {
  const url = `https://medlineplus.gov/${directory}.html`
  const html = execFileSync('curl', ['--fail', '--silent', '--show-error', '--location', '--retry', '2', '--max-time', '20', url], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 })
  const topicSection = html.split('id="topics"')[1]?.split('</section>')[0]
  if (!topicSection) throw new Error(`Reading topics section changed: ${url}`)
  const topics = [...topicSection.matchAll(/<a href="(https:\/\/medlineplus.gov\/[a-z0-9]+\.html)">([^<]+)<\/a>/g)].map(m => ({ url: m[1], title: m[2].replaceAll('&amp;', '&').replaceAll('&#39;', "'").trim() }))
  const unique = [...new Map(topics.map(t => [t.url, t])).values()].sort((a, b) => a.title.localeCompare(b.title))
  if (unique.length < 5) throw new Error(`Reading directory structure changed: ${url}`)
  pages.set(directory, { source: url, checked: new Date().toISOString().slice(0, 10), topics: unique })
}
const contextPath = resolve('../output/anatomy/context.json')
const context = JSON.parse(readFileSync(contextPath))
context.reading = Object.fromEntries(Object.entries(directories).map(([system, directory]) => [system, pages.get(directory)]))
context.reading.sensory = { ...pages.get('eyesandvision'), additionalSource: pages.get('earnoseandthroat').source, topics: [...new Map([...pages.get('eyesandvision').topics, ...pages.get('earnoseandthroat').topics].map(t => [t.url, t])).values()] }
context.femaleReading = { ...context.reading, reproductive: pages.get('femalereproductivesystem') }
context.femaleSystems = { ...context.systems, reproductive: 'Female reproductive reference structures are represented in this assembly. Select an individual source structure to inspect its geometry and explore the linked reading topics.', pregnancy: 'Pregnancy reference structures are optional and hidden by default. They are not a pregnancy simulation.' }
writeFileSync(contextPath, JSON.stringify(context))
console.log(`Prepared ${new Set(Object.values(context.reading).flatMap(r => r.topics.map(t => t.url))).size} distinct NLM reading topics across 15 display systems. Titles and links only; no medical prose copied.`)
