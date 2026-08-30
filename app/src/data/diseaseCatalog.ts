import { DISEASES } from './diseases'

export type CurriculumStatus = 'explorable' | 'planned'
export type CurriculumReviewStatus = 'pending' | 'not-started'
export type CurriculumSystemId =
  | 'cardiovascular'
  | 'respiratory'
  | 'infectious'
  | 'cancer'
  | 'neurologic'
  | 'metabolic'
  | 'kidney'
  | 'digestive'
  | 'mental-health'
  | 'musculoskeletal'
  | 'blood-genetic'
  | 'reproductive-neonatal'

export interface CurriculumSystem {
  id: CurriculumSystemId
  code: string
  label: string
  accent: string
}

export interface CurriculumCondition {
  id: string
  code: string
  title: string
  systemId: CurriculumSystemId
  status: CurriculumStatus
  reviewStatus: CurriculumReviewStatus
  journeyId?: string
}

export const CURRICULUM_SYSTEMS: readonly CurriculumSystem[] = [
  { id: 'cardiovascular', code: 'CV', label: 'Cardiovascular', accent: '#f1a86b' },
  { id: 'respiratory', code: 'RP', label: 'Respiratory', accent: '#8ec7d4' },
  { id: 'infectious', code: 'IF', label: 'Infectious', accent: '#b5d47f' },
  { id: 'cancer', code: 'ON', label: 'Cancer', accent: '#d69aaf' },
  { id: 'neurologic', code: 'NS', label: 'Neurologic', accent: '#a69bdc' },
  { id: 'metabolic', code: 'ME', label: 'Metabolic & endocrine', accent: '#e7c76b' },
  { id: 'kidney', code: 'KU', label: 'Kidney & urinary', accent: '#75b8d6' },
  { id: 'digestive', code: 'GI', label: 'Digestive & liver', accent: '#d8a56f' },
  { id: 'mental-health', code: 'MH', label: 'Mental health', accent: '#c4a7d8' },
  { id: 'musculoskeletal', code: 'MS', label: 'Musculoskeletal & immune', accent: '#9ec59b' },
  { id: 'blood-genetic', code: 'HG', label: 'Blood & genetic', accent: '#d78c8c' },
  { id: 'reproductive-neonatal', code: 'RN', label: 'Reproductive & neonatal', accent: '#e4afc4' },
]

const condition = (
  id: string,
  code: string,
  title: string,
  systemId: CurriculumSystemId,
  journeyId?: string,
): CurriculumCondition => ({
  id,
  code,
  title,
  systemId,
  status: journeyId ? 'explorable' : 'planned',
  reviewStatus: journeyId ? 'pending' : 'not-started',
  ...(journeyId ? { journeyId } : {}),
})

/**
 * A curriculum, not a worldwide rank. The first ten journey IDs preserve the
 * current WHO 2021 mortality previews. The remaining entries are a planning
 * queue chosen for burden breadth, organ-system coverage, and mechanism
 * diversity; they do not become educational content until their source and
 * qualified-review gates pass.
 */
export const DISEASE_CURRICULUM: readonly CurriculumCondition[] = [
  condition('ischaemic-heart-disease', 'CV-01', 'Ischaemic heart disease', 'cardiovascular', 'ischaemic-heart-disease'),
  condition('stroke', 'CV-02', 'Stroke', 'cardiovascular', 'stroke'),
  condition('hypertension', 'CV-03', 'Hypertension', 'cardiovascular'),
  condition('heart-failure', 'CV-04', 'Heart failure', 'cardiovascular'),
  condition('atrial-fibrillation', 'CV-05', 'Atrial fibrillation', 'cardiovascular'),
  condition('rheumatic-heart-disease', 'CV-06', 'Rheumatic heart disease', 'cardiovascular'),
  condition('congenital-heart-disease', 'CV-07', 'Congenital heart disease', 'cardiovascular'),

  condition('copd', 'RP-01', 'Chronic obstructive pulmonary disease', 'respiratory', 'copd'),
  condition('lower-respiratory-infection', 'RP-02', 'Lower respiratory infections', 'respiratory', 'lower-respiratory-infection'),
  condition('asthma', 'RP-03', 'Asthma', 'respiratory'),
  condition('obstructive-sleep-apnea', 'RP-04', 'Obstructive sleep apnea', 'respiratory'),

  condition('covid-19', 'IF-01', 'COVID-19', 'infectious', 'covid-19'),
  condition('tuberculosis', 'IF-02', 'Tuberculosis', 'infectious', 'tuberculosis'),
  condition('hiv-aids', 'IF-03', 'HIV/AIDS', 'infectious'),
  condition('malaria', 'IF-04', 'Malaria', 'infectious'),
  condition('diarrhoeal-diseases', 'IF-05', 'Diarrhoeal diseases', 'infectious'),
  condition('dengue', 'IF-06', 'Dengue', 'infectious'),
  condition('chronic-viral-hepatitis', 'IF-07', 'Chronic viral hepatitis', 'infectious'),
  condition('meningitis', 'IF-08', 'Meningitis', 'infectious'),
  condition('sepsis', 'IF-09', 'Sepsis', 'infectious'),

  condition('lung-cancer', 'ON-01', 'Trachea, bronchus, and lung cancers', 'cancer', 'lung-cancer'),
  condition('breast-cancer', 'ON-02', 'Breast cancer', 'cancer'),
  condition('colorectal-cancer', 'ON-03', 'Colorectal cancer', 'cancer'),
  condition('prostate-cancer', 'ON-04', 'Prostate cancer', 'cancer'),
  condition('cervical-cancer', 'ON-05', 'Cervical cancer', 'cancer'),
  condition('liver-cancer', 'ON-06', 'Liver cancer', 'cancer'),
  condition('leukaemia', 'ON-07', 'Leukaemia', 'cancer'),

  condition('dementia', 'NS-01', 'Alzheimer disease and other dementias', 'neurologic', 'dementia'),
  condition('parkinson-disease', 'NS-02', 'Parkinson disease', 'neurologic'),
  condition('epilepsy', 'NS-03', 'Epilepsy', 'neurologic'),
  condition('multiple-sclerosis', 'NS-04', 'Multiple sclerosis', 'neurologic'),
  condition('migraine', 'NS-05', 'Migraine', 'neurologic'),

  condition('diabetes', 'ME-01', 'Diabetes mellitus', 'metabolic', 'diabetes'),
  condition('obesity', 'ME-02', 'Obesity', 'metabolic'),
  condition('thyroid-disease', 'ME-03', 'Thyroid disease', 'metabolic'),

  condition('kidney-disease', 'KU-01', 'Kidney diseases', 'kidney', 'kidney-disease'),

  condition('cirrhosis', 'GI-01', 'Cirrhosis', 'digestive'),
  condition('inflammatory-bowel-disease', 'GI-02', 'Inflammatory bowel disease', 'digestive'),
  condition('coeliac-disease', 'GI-03', 'Coeliac disease', 'digestive'),

  condition('major-depressive-disorder', 'MH-01', 'Major depressive disorder', 'mental-health'),
  condition('anxiety-disorders', 'MH-02', 'Anxiety disorders', 'mental-health'),
  condition('schizophrenia', 'MH-03', 'Schizophrenia', 'mental-health'),

  condition('osteoarthritis', 'MS-01', 'Osteoarthritis', 'musculoskeletal'),
  condition('low-back-pain', 'MS-02', 'Low back pain', 'musculoskeletal'),
  condition('rheumatoid-arthritis', 'MS-03', 'Rheumatoid arthritis', 'musculoskeletal'),
  condition('osteoporosis', 'MS-04', 'Osteoporosis', 'musculoskeletal'),

  condition('sickle-cell-disease', 'HG-01', 'Sickle cell disease', 'blood-genetic'),
  condition('iron-deficiency-anaemia', 'HG-02', 'Iron-deficiency anaemia', 'blood-genetic'),

  condition('preterm-birth-complications', 'RN-01', 'Preterm birth complications', 'reproductive-neonatal'),
  condition('endometriosis', 'RN-02', 'Endometriosis', 'reproductive-neonatal'),
]

export const EXPLORABLE_CURRICULUM = DISEASE_CURRICULUM.filter(
  (entry): entry is CurriculumCondition & { journeyId: string } => entry.status === 'explorable' && Boolean(entry.journeyId),
)

export const curriculumSystemById = (id: CurriculumSystemId): CurriculumSystem =>
  CURRICULUM_SYSTEMS.find((system) => system.id === id)!

export const filterDiseaseCurriculum = (
  query: string,
  systemId: CurriculumSystemId | 'all' = 'all',
  status: CurriculumStatus | 'all' = 'all',
): CurriculumCondition[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  return DISEASE_CURRICULUM.filter((entry) => {
    const system = curriculumSystemById(entry.systemId)
    const matchesQuery = normalizedQuery.length === 0
      || `${entry.title} ${entry.code} ${system.label}`.toLocaleLowerCase().includes(normalizedQuery)
    const matchesSystem = systemId === 'all' || entry.systemId === systemId
    const matchesStatus = status === 'all' || entry.status === status
    return matchesQuery && matchesSystem && matchesStatus
  })
}

const explorableJourneyIds = new Set(EXPLORABLE_CURRICULUM.map((entry) => entry.journeyId))
if (DISEASE_CURRICULUM.length !== 50) throw new Error('The disease curriculum must contain exactly 50 conditions.')
if (new Set(DISEASE_CURRICULUM.map((entry) => entry.id)).size !== DISEASE_CURRICULUM.length) {
  throw new Error('Disease curriculum IDs must be unique.')
}
if (new Set(DISEASE_CURRICULUM.map((entry) => entry.code)).size !== DISEASE_CURRICULUM.length) {
  throw new Error('Disease curriculum codes must be unique.')
}
if (DISEASES.some((disease) => !explorableJourneyIds.has(disease.id)) || explorableJourneyIds.size !== DISEASES.length) {
  throw new Error('Every current disease journey must map to one explorable curriculum entry.')
}
