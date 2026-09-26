import type { DiseaseDefinition, DiseaseSource } from './diseases'

export const ATLAS_EVIDENCE_STATUS = {
  sourcesCheckedOn: '2026-08-22',
  sourcesCheckedLabel: '22 Aug 2026',
  reviewStatus: 'pending',
  reviewLabel: 'Named qualified review pending',
} as const

export interface AtlasSourceCoverage {
  source: DiseaseSource
  stepIndexes: number[]
}

export interface AtlasEvidenceLedger {
  sourceCoverage: AtlasSourceCoverage[]
  sourcedStepCount: number
  totalStepCount: number
  danglingSourceIds: string[]
}

export interface AtlasEvidenceLibraryEntry extends AtlasSourceCoverage {
  diseaseId: string
  diseaseTitle: string
  diseaseShortTitle: string
  diseaseRank: number
}

export const buildAtlasEvidenceLedger = (disease: DiseaseDefinition): AtlasEvidenceLedger => {
  const knownSourceIds = new Set(disease.sources.map((source) => source.id))
  const danglingSourceIds = new Set<string>()
  const sourceToSteps = new Map<string, number[]>()

  disease.steps.forEach((step, stepIndex) => {
    new Set(step.sourceIds).forEach((sourceId) => {
      if (!knownSourceIds.has(sourceId)) {
        danglingSourceIds.add(sourceId)
        return
      }
      const stepIndexes = sourceToSteps.get(sourceId) ?? []
      stepIndexes.push(stepIndex)
      sourceToSteps.set(sourceId, stepIndexes)
    })
  })

  const sourcedStepCount = disease.steps.reduce((count, step) => (
    step.sourceIds.some((sourceId) => knownSourceIds.has(sourceId)) ? count + 1 : count
  ), 0)

  return {
    sourceCoverage: disease.sources.map((source) => ({
      source,
      stepIndexes: sourceToSteps.get(source.id) ?? [],
    })),
    sourcedStepCount,
    totalStepCount: disease.steps.length,
    danglingSourceIds: [...danglingSourceIds].sort(),
  }
}

export const buildAtlasEvidenceLibrary = (
  diseases: readonly DiseaseDefinition[],
): AtlasEvidenceLibraryEntry[] => diseases.flatMap((disease) =>
  buildAtlasEvidenceLedger(disease).sourceCoverage.map((coverage) => ({
    ...coverage,
    diseaseId: disease.id,
    diseaseTitle: disease.title,
    diseaseShortTitle: disease.shortTitle,
    diseaseRank: disease.rank,
  })))
