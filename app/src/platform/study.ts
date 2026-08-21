import { JOURNEY } from '../journey/journey'
import type { LearnerWorkspace } from './localData'

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
