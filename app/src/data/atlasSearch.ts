import {
  BODY_PART_LABELS,
  DISEASES,
  type BodyPartId,
} from './diseases'

export type AtlasSearchResultKind = 'condition' | 'pathway'

export interface AtlasSearchResult {
  id: string
  kind: AtlasSearchResultKind
  diseaseId: string
  stepIndex: number
  bodyPartId: BodyPartId | null
  title: string
  context: string
  accent: string
  rank: number
  score: number
}

export const ATLAS_SEARCH_RESULT_LIMIT = 12

const normalizeSearchText = (value: string): string =>
  value
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const scoreMatch = (query: string, tokens: string[], primary: string, searchable: string): number | null => {
  if (!tokens.every((token) => searchable.includes(token))) return null

  let score = 0
  if (primary === query) score += 300
  else if (primary.startsWith(query)) score += 220
  else if (primary.includes(query)) score += 150

  for (const token of tokens) {
    if (primary.startsWith(token)) score += 28
    else if (primary.includes(token)) score += 16
    else score += 6
  }
  return score
}

export function searchAtlas(queryValue: string): AtlasSearchResult[] {
  const query = normalizeSearchText(queryValue)
  if (!query) return []
  const tokens = query.split(' ')
  const results: AtlasSearchResult[] = []

  for (const disease of DISEASES) {
    const conditionPrimary = normalizeSearchText(`${disease.title} ${disease.shortTitle}`)
    const conditionSearchable = normalizeSearchText([
      conditionPrimary,
      disease.category,
      disease.summary,
      disease.pathwayLabel,
      ...disease.affectedSystems,
    ].join(' '))
    const conditionScore = scoreMatch(query, tokens, conditionPrimary, conditionSearchable)
    if (conditionScore !== null) {
      results.push({
        id: `condition:${disease.id}`,
        kind: 'condition',
        diseaseId: disease.id,
        stepIndex: 0,
        bodyPartId: null,
        title: disease.title,
        context: `${disease.category} · WHO #${disease.rank}`,
        accent: disease.accent,
        rank: disease.rank,
        score: conditionScore + 12,
      })
    }

    disease.steps.forEach((step, stepIndex) => {
      const bodyLabels = step.bodyParts.map((part) => BODY_PART_LABELS[part])
      const pathwayPrimary = normalizeSearchText(`${bodyLabels.join(' ')} ${step.label}`)
      const pathwaySearchable = normalizeSearchText([
        pathwayPrimary,
        disease.title,
        disease.shortTitle,
        disease.category,
        step.phase,
        step.plain,
        step.clinical,
      ].join(' '))
      const pathwayScore = scoreMatch(query, tokens, pathwayPrimary, pathwaySearchable)
      if (pathwayScore === null) return

      const matchedBodyPart = step.bodyParts.find((part) => {
        const label = normalizeSearchText(BODY_PART_LABELS[part])
        return tokens.every((token) => label.includes(token))
      }) ?? step.bodyParts[0]

      results.push({
        id: `pathway:${disease.id}:${step.id}`,
        kind: 'pathway',
        diseaseId: disease.id,
        stepIndex,
        bodyPartId: matchedBodyPart,
        title: step.label,
        context: `${disease.shortTitle} · ${bodyLabels.join(', ')}`,
        accent: disease.accent,
        rank: disease.rank,
        score: pathwayScore,
      })
    })
  }

  return results
    .sort((left, right) =>
      right.score - left.score
      || left.rank - right.rank
      || left.stepIndex - right.stepIndex
      || left.title.localeCompare(right.title))
    .slice(0, ATLAS_SEARCH_RESULT_LIMIT)
}
