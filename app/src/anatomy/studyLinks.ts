import type { Atlas, Concept, Part, SystemId } from './anatomy'
import { DISEASES, type BodyPartId } from '../data/diseases'

// Explicit source concepts; never inferred from similar names or treated as TA2 mappings.
export const ORGAN_ANCHORS: { id: string; part: BodyPartId }[] = [
  { id: 'FMA7088', part: 'heart' }, { id: 'FMA50801', part: 'brain' },
  { id: 'FMA7197', part: 'liver' }, { id: 'FMA7198', part: 'pancreas' },
  { id: 'FMA7148', part: 'stomach' }, { id: 'FMA7200', part: 'intestines' },
  { id: 'FMA7201', part: 'intestines' }, { id: 'FMA7203', part: 'kidneys' },
  { id: 'FMA15900', part: 'bladder' },
  { id: 'FMA7309', part: 'lungs' }, { id: 'FMA7310', part: 'lungs' },
  { id: 'FMA12514', part: 'eyes' }, { id: 'FMA12515', part: 'eyes' },
  { id: 'HRA:VH_F_heart', part: 'heart' },
  { id: 'HRA:VH_F_lungs', part: 'lungs' }, { id: 'HRA:Allen_brain', part: 'brain' }, { id: 'HRA:VH_F_eyes', part: 'eyes' }, { id: 'HRA:VH_F_liver', part: 'liver' },
  { id: 'HRA:VH_F_pancreas', part: 'pancreas' }, { id: 'HRA:VH_F_kidney', part: 'kidneys' },
  { id: 'HRA:VH_F_urinary_bladder', part: 'bladder' }, { id: 'HRA:VH_F_small_intestine', part: 'intestines' },
]
export function relatedLessons(atlas: Atlas, selected: Concept) {
  const selectedIds = new Set(selected.elements)
  const organs = ORGAN_ANCHORS.filter(anchor => atlas.concepts.find(c => c.id === anchor.id)?.elements.some(id => selectedIds.has(id)))
  return DISEASES.flatMap(disease => {
    const stepIndex = disease.steps.findIndex(step => organs.some(anchor => step.bodyParts.includes(anchor.part)))
    if (stepIndex < 0) return []
    const bodyPart = organs.find(anchor => disease.steps[stepIndex].bodyParts.includes(anchor.part))!.part
    return [{ disease, stepIndex, bodyPart, sources: disease.sources.filter(source => disease.steps[stepIndex].sourceIds.includes(source.id)) }]
  })
}
export function searchStructures(atlas: Atlas, query: string, system: SystemId | 'all', parts: Map<string, Part>) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  return atlas.concepts.filter(c => terms.every(term => `${c.name} ${c.id} ${c.elements.join(' ')}`.toLowerCase().includes(term))
    && (system === 'all' || c.elements.some(id => parts.get(id)?.system === system)))
    .sort((a, b) => Number(b.name.toLowerCase() === query.toLowerCase().trim()) - Number(a.name.toLowerCase() === query.toLowerCase().trim()) || a.name.localeCompare(b.name))
}
// Source-linked reading directories, not claims about each individual mesh.
export const SYSTEM_READING: Record<SystemId, { title: string; path: string }> = {
  pregnancy: { title: 'Pregnancy health and complications', path: 'pregnancy.html' },
  skeletal: { title: 'Bone, joint and muscle conditions', path: 'bonesjointsandmuscles.html' },
  muscular: { title: 'Muscle conditions and injuries', path: 'bonesjointsandmuscles.html' },
  connective: { title: 'Joint and connective tissue conditions', path: 'bonesjointsandmuscles.html' },
  cardiac: { title: 'Heart and circulation conditions', path: 'bloodheartandcirculation.html' },
  arterial: { title: 'Artery and circulation conditions', path: 'bloodheartandcirculation.html' },
  venous: { title: 'Vein and circulation conditions', path: 'bloodheartandcirculation.html' },
  nervous: { title: 'Brain and nerve conditions', path: 'brainandnerves.html' },
  sensory: { title: 'Eye and vision conditions', path: 'eyesandvision.html' },
  respiratory: { title: 'Lung and breathing conditions', path: 'lungsandbreathing.html' },
  digestive: { title: 'Digestive conditions', path: 'digestivesystem.html' },
  urinary: { title: 'Kidney and urinary conditions', path: 'kidneysandurinarysystem.html' },
  reproductive: { title: 'Male reproductive health', path: 'malereproductivesystem.html' },
  lymphatic: { title: 'Immune system conditions', path: 'immunesystem.html' },
  endocrine: { title: 'Hormonal and metabolic conditions', path: 'endocrinesystem.html' },
  integumentary: { title: 'Skin, hair and nail conditions', path: 'skinhairandnails.html' },
}
