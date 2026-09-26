import {
  BODY_PART_LABELS,
  DISEASES,
  type BodyPartId,
  type DiseaseDefinition,
} from './diseases'

export interface AtlasSystemPathway {
  diseaseId: string
  diseaseTitle: string
  diseaseShortTitle: string
  diseaseRank: number
  stepId: string
  stepIndex: number
  stepLabel: string
  phase: string
  bodyPartId: BodyPartId
  accent: string
}

export interface AtlasSystemGroup {
  bodyPartId: BodyPartId
  label: string
  pathways: AtlasSystemPathway[]
}

/**
 * Builds system-first navigation only from structure IDs explicitly authored on
 * current Atlas steps. It never infers a disease-to-structure relationship.
 */
export function buildAtlasSystemGroups(
  diseases: readonly DiseaseDefinition[] = DISEASES,
): AtlasSystemGroup[] {
  const groups = new Map<BodyPartId, AtlasSystemPathway[]>()

  for (const disease of diseases) {
    disease.steps.forEach((step, stepIndex) => {
      for (const bodyPartId of new Set(step.bodyParts)) {
        const pathways = groups.get(bodyPartId) ?? []
        pathways.push({
          diseaseId: disease.id,
          diseaseTitle: disease.title,
          diseaseShortTitle: disease.shortTitle,
          diseaseRank: disease.rank,
          stepId: step.id,
          stepIndex,
          stepLabel: step.label,
          phase: step.phase,
          bodyPartId,
          accent: disease.accent,
        })
        groups.set(bodyPartId, pathways)
      }
    })
  }

  return [...groups.entries()]
    .map(([bodyPartId, pathways]) => ({
      bodyPartId,
      label: BODY_PART_LABELS[bodyPartId],
      pathways: pathways.sort((left, right) =>
        left.diseaseRank - right.diseaseRank
        || left.stepIndex - right.stepIndex
        || left.stepLabel.localeCompare(right.stepLabel)),
    }))
    .sort((left, right) => left.label.localeCompare(right.label))
}
