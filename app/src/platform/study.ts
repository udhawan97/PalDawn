import { JOURNEY } from '../journey/journey'
import type { LearnerWorkspace } from './localData'
import { DISEASES } from '../data/diseases'
import { atlasStudyRecordId, type AtlasStudyData } from './localData'

const privateNoteMarkdown = (value: string): string => value.trim()
  ? value.trim().split('\n').map((line) => `    ${line}`).join('\n')
  : '    _No private note._'

export function studyWorkspaceMarkdown(workspace: LearnerWorkspace): string {
  const sections = JOURNEY.stages.map((stage, index) => {
    const checkpoint = workspace.checkpoints.includes(stage.id) ? 'Complete' : 'Open'
    const note = workspace.notes[stage.id]?.trim() || '_No private note._'
    return [
      `## ${index + 1}. ${stage.label}`,
      '',
      `- Level: ${stage.level}`,
      `- Personal checkpoint: ${checkpoint}`,
      '',
      '### Guide',
      '',
      stage.guide,
      '',
      '### Engineering',
      '',
      stage.engineering,
      '',
      '### Private note',
      '',
      note,
    ].join('\n')
  })

  return [
    '# PalDawn First Light — private study workspace',
    '',
    '> Local export generated only at the learner’s request. Personal checkpoints are not evidence, approval, or medical review.',
    '',
    JOURNEY.disclosure,
    '',
    ...sections,
    '',
    'Education only; never diagnosis. Suspected heart attack? Contact local emergency services immediately.',
  ].join('\n')
}

export function atlasStudyMarkdown(
  study: AtlasStudyData,
  options: { includeNotes: boolean; diseaseId?: string } = { includeNotes: false },
): string {
  const knownRecordIds = new Set(DISEASES.flatMap((disease) =>
    disease.steps.map((step) => atlasStudyRecordId(disease.id, step.id))))
  const diseases = options.diseaseId
    ? DISEASES.filter((disease) => disease.id === options.diseaseId)
    : DISEASES
  const sections = diseases.flatMap((disease) => disease.steps.flatMap((step, index) => {
    const record = study.records[atlasStudyRecordId(disease.id, step.id)]
    if (!record?.saved && !record?.studied && !record?.note.trim()) return []
    const sources = step.sourceIds.flatMap((id) => {
      const source = disease.sources.find((candidate) => candidate.id === id)
      return source ? [`- [${source.organization}: ${source.title}](${source.url})`] : []
    })
    return [[
      `## ${disease.title} · ${index + 1}. ${step.label}`,
      '',
      `- Saved: ${record.saved ? 'Yes' : 'No'}`,
      `- Personal study mark: ${record.studied ? 'Studied' : 'Open'}`,
      '',
      '### Plain English', '', step.plain, '',
      '### Clinical terms', '', step.clinical, '',
      ...(step.caution ? ['### Care boundary', '', step.caution, ''] : []),
      '### Sources', '', ...sources, '',
      ...(options.includeNotes ? ['### Private note', '', privateNoteMarkdown(record.note), ''] : []),
    ].join('\n')]
  }))
  const unavailableSections = options.diseaseId ? [] : Object.entries(study.records).flatMap(([id, record]) => {
    if (knownRecordIds.has(id) || (!record.saved && !record.studied && !record.note.trim())) return []
    const privateNote = privateNoteMarkdown(record.note)
    return [[
      `## Unavailable Atlas record · ${id}`,
      '',
      '> This saved target is not present in the current bundled catalog. Its identifiers and personal record are preserved for recovery.',
      '',
      `- Saved: ${record.saved ? 'Yes' : 'No'}`,
      `- Personal study mark: ${record.studied ? 'Studied' : 'Open'}`,
      '',
      ...(options.includeNotes ? ['### Private note', '', privateNote, ''] : []),
    ].join('\n')]
  })
  const allSections = [...sections, ...unavailableSections]
  return [
    '# PalDawn Atlas — private study export',
    '',
    '> Existing educational previews and source links. Personal study marks are not evidence, mastery, approval, or medical review.',
    '',
    ...allSections,
    allSections.length ? '' : '_No Atlas study steps selected._',
    'Education only; never diagnosis or treatment guidance.',
  ].join('\n')
}
