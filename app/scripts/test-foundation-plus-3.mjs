import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const ROOT = new URL('..', import.meta.url)
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8')

const deck = read('src/ui/FlightDeck.tsx')
const experience = read('src/state/experience.ts')
const localData = read('src/platform/localData.ts')
const study = read('src/platform/study.ts')

assert.match(experience, /'workspace'/)
assert.match(deck, /function WorkspacePanel/)
assert.match(deck, /track-columns/)
assert.match(deck, /Guide/)
assert.match(deck, /Engineering/)
assert.match(localData, /paldawn:workspace:v1/)
assert.match(localData, /MAX_STAGE_NOTE_LENGTH = 1200/)
assert.match(localData, /STAGE_IDS\.has\(id\)/)
assert.match(deck, /Do not enter patient or personal health information/)
assert.match(deck, /Personal checkpoints are not evidence, approval, or medical review/)
assert.match(deck, /event\.key\.toLowerCase\(\) === 'n'/)
assert.match(deck, /id="workspace-note"/)
assert.match(study, /studyWorkspaceMarkdown/)
assert.match(study, /Local export generated only at the learner’s request/)
assert.match(deck, /Download study Markdown/)
assert.match(localData, /parseLocalDataImport/)
assert.match(localData, /supported PalDawn local-data schema/)
assert.match(deck, /Replacement preview/)
assert.match(deck, /Confirm replace local data/)
assert.match(localData, /schema_version: 2/)
assert.match(localData, /removeItem\(PALDAWN_WORKSPACE_KEY\)/)

console.log('foundation+3 checks: 6 learner-workspace features · local-only and synthetic boundaries intact')
