export type BodyPartId =
  | 'brain'
  | 'eyes'
  | 'lungs'
  | 'heart'
  | 'blood'
  | 'liver'
  | 'pancreas'
  | 'stomach'
  | 'intestines'
  | 'kidneys'
  | 'bladder'
  | 'nerves'
  | 'muscles'
  | 'fat'
  | 'immune'
  | 'bones'

export type DiseaseCategory = 'Cardiovascular' | 'Respiratory' | 'Infectious' | 'Cancer' | 'Neurologic' | 'Metabolic' | 'Renal'

export interface DiseaseSource {
  id: string
  title: string
  organization: string
  url: string
}

export interface DiseaseStep {
  id: string
  label: string
  phase: string
  plain: string
  clinical: string
  bodyParts: BodyPartId[]
  sourceIds: string[]
  caution?: string
}

export interface DiseaseDefinition {
  id: string
  rank: number
  title: string
  shortTitle: string
  category: DiseaseCategory
  accent: string
  summary: string
  affectedSystems: string[]
  pathwayLabel: string
  steps: DiseaseStep[]
  sources: DiseaseSource[]
}

const WHO_TOP_TEN: DiseaseSource = {
  id: 'who-top-ten',
  title: 'The top 10 causes of death (2021 global estimates)',
  organization: 'World Health Organization',
  url: 'https://www.who.int/news-room/fact-sheets/detail/the-top-10-causes-of-death',
}

const WHO_CVD: DiseaseSource = {
  id: 'who-cvd',
  title: 'Cardiovascular diseases',
  organization: 'World Health Organization',
  url: 'https://www.who.int/news-room/fact-sheets/detail/cardiovascular-diseases-(cvds)',
}

const WHO_STROKE: DiseaseSource = {
  id: 'who-stroke',
  title: 'Stroke',
  organization: 'World Health Organization',
  url: 'https://www.who.int/news-room/fact-sheets/detail/stroke',
}

const WHO_COPD: DiseaseSource = {
  id: 'who-copd',
  title: 'Chronic obstructive pulmonary disease (COPD)',
  organization: 'World Health Organization',
  url: 'https://www.who.int/news-room/fact-sheets/detail/chronic-obstructive-pulmonary-disease-(copd)',
}

const WHO_COVID: DiseaseSource = {
  id: 'who-covid',
  title: 'Coronavirus disease (COVID-19)',
  organization: 'World Health Organization',
  url: 'https://www.who.int/news-room/questions-and-answers/item/coronavirus-disease-covid-19',
}

const WHO_LUNG_CANCER: DiseaseSource = {
  id: 'who-lung-cancer',
  title: 'Lung cancer',
  organization: 'World Health Organization',
  url: 'https://www.who.int/news-room/fact-sheets/detail/lung-cancer',
}

const WHO_DEMENTIA: DiseaseSource = {
  id: 'who-dementia',
  title: 'Dementia',
  organization: 'World Health Organization',
  url: 'https://www.who.int/news-room/fact-sheets/detail/dementia',
}

const WHO_TB: DiseaseSource = {
  id: 'who-tb',
  title: 'Tuberculosis',
  organization: 'World Health Organization',
  url: 'https://www.who.int/news-room/fact-sheets/detail/tuberculosis',
}

const NIDDK_DIABETES: DiseaseSource = {
  id: 'niddk-diabetes',
  title: 'What is diabetes?',
  organization: 'NIH · NIDDK',
  url: 'https://www.niddk.nih.gov/health-information/diabetes/overview/what-is-diabetes',
}

const NIDDK_CAUSES: DiseaseSource = {
  id: 'niddk-causes',
  title: 'Symptoms and causes of diabetes',
  organization: 'NIH · NIDDK',
  url: 'https://www.niddk.nih.gov/health-information/diabetes/overview/symptoms-causes',
}

const NIDDK_DIGESTION: DiseaseSource = {
  id: 'niddk-digestion',
  title: 'Your digestive system and how it works',
  organization: 'NIH · NIDDK',
  url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works',
}

const NIDDK_MANAGING: DiseaseSource = {
  id: 'niddk-managing',
  title: 'Managing diabetes',
  organization: 'NIH · NIDDK',
  url: 'https://www.niddk.nih.gov/health-information/diabetes/overview/managing-diabetes',
}

const NIDDK_HEART: DiseaseSource = {
  id: 'niddk-heart',
  title: 'Diabetes, heart disease, and stroke',
  organization: 'NIH · NIDDK',
  url: 'https://www.niddk.nih.gov/health-information/diabetes/overview/preventing-problems/heart-disease-stroke',
}

const NIDDK_KIDNEY: DiseaseSource = {
  id: 'niddk-kidney',
  title: 'Diabetic kidney disease',
  organization: 'NIH · NIDDK',
  url: 'https://www.niddk.nih.gov/health-information/diabetes/overview/preventing-problems/diabetic-kidney-disease',
}

const NIDDK_EYE: DiseaseSource = {
  id: 'niddk-eye',
  title: 'Diabetic eye disease',
  organization: 'NIH · NIDDK',
  url: 'https://www.niddk.nih.gov/health-information/diabetes/overview/preventing-problems/diabetic-eye-disease',
}

const NIDDK_KIDNEYS: DiseaseSource = {
  id: 'niddk-kidneys',
  title: 'Your kidneys and how they work',
  organization: 'NIH · NIDDK',
  url: 'https://www.niddk.nih.gov/health-information/kidney-disease/kidneys-how-they-work',
}

export const DISEASES: DiseaseDefinition[] = [
  {
    id: 'ischaemic-heart-disease',
    rank: 1,
    title: 'Ischaemic heart disease',
    shortTitle: 'Heart disease',
    category: 'Cardiovascular',
    accent: '#f1a86b',
    summary: 'Coronary blood flow becomes too limited to meet the heart muscle’s oxygen needs.',
    affectedSystems: ['Coronary vessels', 'Heart muscle', 'Circulation'],
    pathwayLabel: 'Vessel wall → coronary flow → heart muscle',
    sources: [WHO_TOP_TEN, WHO_CVD],
    steps: [
      {
        id: 'vessel-change',
        label: 'Vessel wall changes',
        phase: 'Develops over time',
        plain: 'Fatty material can build up inside arteries that feed the heart. The open channel becomes narrower.',
        clinical: 'Atherosclerotic plaque develops in coronary artery walls and can progressively limit luminal blood flow.',
        bodyParts: ['blood', 'heart'],
        sourceIds: ['who-cvd'],
      },
      {
        id: 'flow-limited',
        label: 'Oxygen delivery falls',
        phase: 'Demand exceeds supply',
        plain: 'When the heart works harder, narrowed vessels may not deliver enough oxygen-rich blood.',
        clinical: 'Coronary perfusion becomes insufficient for myocardial oxygen demand, producing ischaemia.',
        bodyParts: ['heart', 'blood', 'lungs'],
        sourceIds: ['who-cvd'],
      },
      {
        id: 'acute-block',
        label: 'An acute blockage can form',
        phase: 'Emergency pathway',
        plain: 'A sudden clot can block blood flow and injure heart muscle. A heart attack needs immediate care.',
        clinical: 'Plaque disruption and thrombosis can abruptly occlude a coronary artery and cause myocardial infarction.',
        bodyParts: ['heart', 'blood'],
        sourceIds: ['who-cvd'],
        caution: 'New chest pressure, shortness of breath, faintness, or pain spreading to the arm, jaw, shoulder, or back can be an emergency. Contact local emergency services.',
      },
      {
        id: 'whole-body',
        label: 'Circulation is affected',
        phase: 'Downstream effects',
        plain: 'Injured heart muscle may pump less effectively, affecting oxygen delivery throughout the body.',
        clinical: 'Myocardial injury can impair cardiac output and secondarily affect brain, kidney, and peripheral perfusion.',
        bodyParts: ['heart', 'brain', 'kidneys', 'blood', 'muscles'],
        sourceIds: ['who-cvd'],
      },
    ],
  },
  {
    id: 'covid-19',
    rank: 2,
    title: 'COVID-19',
    shortTitle: 'COVID-19',
    category: 'Infectious',
    accent: '#8ec7d4',
    summary: 'SARS-CoV-2 infection can range from a mild respiratory illness to severe multi-system disease.',
    affectedSystems: ['Airways', 'Lungs', 'Immune system', 'Circulation'],
    pathwayLabel: 'Exposure → respiratory infection → immune response',
    sources: [WHO_TOP_TEN, WHO_COVID],
    steps: [
      {
        id: 'exposure',
        label: 'Virus reaches the airways',
        phase: 'Exposure',
        plain: 'SARS-CoV-2 can enter through the nose or mouth and infect the respiratory tract.',
        clinical: 'SARS-CoV-2 establishes infection in susceptible respiratory epithelial tissue.',
        bodyParts: ['lungs', 'immune'],
        sourceIds: ['who-covid'],
      },
      {
        id: 'response',
        label: 'The immune system responds',
        phase: 'Early illness',
        plain: 'The immune response helps control infection but also produces inflammation and common symptoms.',
        clinical: 'Innate and adaptive immune responses coordinate viral control while contributing to inflammatory symptoms.',
        bodyParts: ['immune', 'lungs', 'blood'],
        sourceIds: ['who-covid'],
      },
      {
        id: 'gas-exchange',
        label: 'Severe illness can impair breathing',
        phase: 'Variable severity',
        plain: 'When lung inflammation is severe, oxygen transfer can become difficult.',
        clinical: 'Lower-respiratory involvement can impair alveolar gas exchange and produce hypoxaemia in severe disease.',
        bodyParts: ['lungs', 'blood', 'heart', 'brain'],
        sourceIds: ['who-covid'],
        caution: 'Trouble breathing, chest pain, confusion, or loss of consciousness needs urgent medical care.',
      },
      {
        id: 'recovery',
        label: 'Recovery varies',
        phase: 'Days to longer term',
        plain: 'Many people recover, while some have severe disease or symptoms that continue after the infection.',
        clinical: 'Clinical course ranges from self-limited infection to critical disease and post-COVID conditions.',
        bodyParts: ['lungs', 'brain', 'heart', 'nerves', 'muscles'],
        sourceIds: ['who-covid'],
      },
    ],
  },
  {
    id: 'stroke',
    rank: 3,
    title: 'Stroke',
    shortTitle: 'Stroke',
    category: 'Cardiovascular',
    accent: '#d6b3f4',
    summary: 'Brain blood flow is interrupted by a blockage or bleeding, so rapid treatment matters.',
    affectedSystems: ['Brain', 'Blood vessels', 'Movement', 'Speech'],
    pathwayLabel: 'Brain vessel → oxygen loss or bleeding → function',
    sources: [WHO_TOP_TEN, WHO_STROKE, WHO_CVD],
    steps: [
      {
        id: 'vessel-event',
        label: 'A brain vessel blocks or ruptures',
        phase: 'Sudden event',
        plain: 'Most strokes begin when a clot blocks a vessel; others begin when a vessel breaks and bleeds.',
        clinical: 'Ischaemic stroke follows arterial occlusion; haemorrhagic stroke follows vessel rupture and intracranial bleeding.',
        bodyParts: ['brain', 'blood'],
        sourceIds: ['who-stroke', 'who-cvd'],
      },
      {
        id: 'brain-injury',
        label: 'Brain tissue loses support',
        phase: 'Minutes matter',
        plain: 'Without normal blood flow, brain cells can be injured or die.',
        clinical: 'Interrupted perfusion deprives neural tissue of oxygen and substrates; haemorrhage also causes direct and pressure-related injury.',
        bodyParts: ['brain', 'blood'],
        sourceIds: ['who-stroke'],
      },
      {
        id: 'function',
        label: 'Functions change by location',
        phase: 'Visible effects',
        plain: 'A stroke can suddenly affect face or limb strength, speech, vision, balance, or understanding.',
        clinical: 'Focal neurologic deficits reflect the affected vascular territory and neural networks.',
        bodyParts: ['brain', 'eyes', 'nerves', 'muscles'],
        sourceIds: ['who-stroke'],
        caution: 'Sudden facial droop, arm weakness, speech trouble, vision loss, or loss of balance is an emergency. Contact local emergency services immediately.',
      },
      {
        id: 'recovery',
        label: 'Recovery uses connected systems',
        phase: 'Rehabilitation',
        plain: 'Rehabilitation can help rebuild movement, daily skills, communication, and independence.',
        clinical: 'Coordinated physiotherapy, occupational therapy, speech-language therapy, and cognitive support address post-stroke deficits.',
        bodyParts: ['brain', 'nerves', 'muscles'],
        sourceIds: ['who-stroke'],
      },
    ],
  },
  {
    id: 'copd',
    rank: 4,
    title: 'Chronic obstructive pulmonary disease',
    shortTitle: 'COPD',
    category: 'Respiratory',
    accent: '#85c4ec',
    summary: 'Damaged, narrowed airways and alveoli restrict airflow and make breathing progressively harder.',
    affectedSystems: ['Airways', 'Alveoli', 'Circulation', 'Muscles'],
    pathwayLabel: 'Exposure → airway and alveolar damage → airflow limit',
    sources: [WHO_TOP_TEN, WHO_COPD],
    steps: [
      {
        id: 'exposure',
        label: 'Repeated harmful exposure',
        phase: 'Usually years',
        plain: 'Tobacco smoke, air pollution, dust, or fumes can repeatedly irritate and injure the lungs.',
        clinical: 'Chronic inhalational exposures are major contributors to airway inflammation and parenchymal injury.',
        bodyParts: ['lungs', 'immune'],
        sourceIds: ['who-copd'],
      },
      {
        id: 'airways',
        label: 'Airways narrow and fill with mucus',
        phase: 'Progressive change',
        plain: 'Inflamed airway walls and mucus reduce the space available for moving air.',
        clinical: 'Airway inflammation, oedema, mucus hypersecretion, and remodelling increase airflow resistance.',
        bodyParts: ['lungs', 'immune'],
        sourceIds: ['who-copd'],
      },
      {
        id: 'alveoli',
        label: 'Air sacs lose working surface',
        phase: 'Gas exchange',
        plain: 'Damage to tiny air sacs reduces the surface that moves oxygen into blood and carbon dioxide out.',
        clinical: 'Emphysematous alveolar destruction reduces gas-exchange area and elastic recoil, contributing to air trapping.',
        bodyParts: ['lungs', 'blood'],
        sourceIds: ['who-copd'],
      },
      {
        id: 'whole-body',
        label: 'Breathing effort affects the body',
        phase: 'Daily function',
        plain: 'Breathlessness and low activity can affect the heart, muscles, bones, and mood.',
        clinical: 'Persistent ventilatory limitation and exacerbations contribute to deconditioning and systemic comorbidity.',
        bodyParts: ['lungs', 'heart', 'muscles', 'bones', 'brain'],
        sourceIds: ['who-copd'],
      },
    ],
  },
  {
    id: 'lower-respiratory-infection',
    rank: 5,
    title: 'Lower respiratory infection',
    shortTitle: 'Lung infection',
    category: 'Infectious',
    accent: '#75d9d2',
    summary: 'Infection and inflammation below the voice box can disrupt airflow and oxygen exchange.',
    affectedSystems: ['Lower airways', 'Alveoli', 'Immune system', 'Circulation'],
    pathwayLabel: 'Pathogen → lower airway → inflammation → gas exchange',
    sources: [WHO_TOP_TEN, WHO_COPD],
    steps: [
      {
        id: 'arrival',
        label: 'A pathogen reaches the lower airway',
        phase: 'Infection begins',
        plain: 'A virus, bacterium, or other pathogen can move into the bronchi or lungs.',
        clinical: 'A lower respiratory pathogen establishes infection distal to the larynx.',
        bodyParts: ['lungs', 'immune'],
        sourceIds: ['who-top-ten'],
      },
      {
        id: 'inflammation',
        label: 'Immune defence creates inflammation',
        phase: 'Host response',
        plain: 'Immune cells respond. Swelling, mucus, and fluid can make the lungs less efficient.',
        clinical: 'Innate immune recruitment and inflammatory exudate can obstruct small airways or occupy alveolar space.',
        bodyParts: ['lungs', 'immune', 'blood'],
        sourceIds: ['who-top-ten'],
      },
      {
        id: 'oxygen',
        label: 'Oxygen transfer can fall',
        phase: 'Severity varies',
        plain: 'When affected air sacs cannot exchange gases normally, the whole body receives less oxygen.',
        clinical: 'Ventilation-perfusion mismatch and alveolar filling may impair oxygenation.',
        bodyParts: ['lungs', 'blood', 'heart', 'brain'],
        sourceIds: ['who-top-ten'],
        caution: 'Severe trouble breathing, blue or grey lips, confusion, or reduced alertness requires urgent medical care.',
      },
      {
        id: 'resolution',
        label: 'Clearance or complication',
        phase: 'Recovery path',
        plain: 'The infection may clear with immune defence and appropriate care, or progress to wider illness.',
        clinical: 'Outcome depends on pathogen, host factors, timeliness of care, and complications such as respiratory failure or sepsis.',
        bodyParts: ['lungs', 'immune', 'blood', 'kidneys', 'brain'],
        sourceIds: ['who-top-ten'],
      },
    ],
  },
  {
    id: 'lung-cancer',
    rank: 6,
    title: 'Trachea, bronchus, and lung cancers',
    shortTitle: 'Lung cancer',
    category: 'Cancer',
    accent: '#f09288',
    summary: 'Abnormal cells grow without normal controls and can disrupt the lung or spread elsewhere.',
    affectedSystems: ['Airways', 'Lungs', 'Lymph', 'Distant organs'],
    pathwayLabel: 'Cell change → local growth → invasion or spread',
    sources: [WHO_TOP_TEN, WHO_LUNG_CANCER],
    steps: [
      {
        id: 'cell-change',
        label: 'Cell controls change',
        phase: 'Begins at cell scale',
        plain: 'Damage and mutations can let a cell keep dividing when it should stop.',
        clinical: 'Accumulated molecular alterations can confer uncontrolled proliferation and survival advantages.',
        bodyParts: ['lungs'],
        sourceIds: ['who-lung-cancer'],
      },
      {
        id: 'local-growth',
        label: 'A tumour grows locally',
        phase: 'Local disease',
        plain: 'A growing mass can irritate or block an airway and interfere with nearby lung tissue.',
        clinical: 'Primary tumour growth may cause bronchial obstruction, tissue invasion, bleeding, or impaired ventilation.',
        bodyParts: ['lungs', 'blood'],
        sourceIds: ['who-lung-cancer'],
      },
      {
        id: 'spread',
        label: 'Cells can spread',
        phase: 'Advanced pathway',
        plain: 'Cancer cells may travel through lymph or blood to other parts of the body.',
        clinical: 'Invasion and lymphatic or haematogenous dissemination can establish metastatic disease.',
        bodyParts: ['lungs', 'blood', 'brain', 'liver', 'bones'],
        sourceIds: ['who-lung-cancer'],
      },
      {
        id: 'whole-body',
        label: 'Effects extend beyond the lungs',
        phase: 'Systemic effects',
        plain: 'Breathing difficulty, fatigue, weight loss, and effects from distant spread can involve the whole body.',
        clinical: 'Local respiratory compromise, systemic cancer effects, and metastatic organ dysfunction shape presentation.',
        bodyParts: ['lungs', 'brain', 'liver', 'bones', 'muscles'],
        sourceIds: ['who-lung-cancer'],
      },
    ],
  },
  {
    id: 'dementia',
    rank: 7,
    title: 'Alzheimer disease and other dementias',
    shortTitle: 'Dementia',
    category: 'Neurologic',
    accent: '#c7a8f2',
    summary: 'Several diseases can progressively damage brain cells and the networks used for memory, thinking, and daily life.',
    affectedSystems: ['Brain networks', 'Memory', 'Language', 'Movement'],
    pathwayLabel: 'Disease process → neural networks → daily function',
    sources: [WHO_TOP_TEN, WHO_DEMENTIA],
    steps: [
      {
        id: 'process',
        label: 'A disease process affects brain cells',
        phase: 'Cause varies',
        plain: 'Dementia is a syndrome with several causes, not one single disease or a normal part of ageing.',
        clinical: 'Multiple neurodegenerative and vascular diseases can produce progressive cognitive impairment beyond usual ageing.',
        bodyParts: ['brain', 'blood'],
        sourceIds: ['who-dementia'],
      },
      {
        id: 'networks',
        label: 'Neural networks lose function',
        phase: 'Progressive change',
        plain: 'Damage interrupts the connected brain networks that support memory, judgement, language, mood, and behaviour.',
        clinical: 'Neuronal injury and loss disrupt distributed cognitive and behavioural networks.',
        bodyParts: ['brain', 'nerves'],
        sourceIds: ['who-dementia'],
      },
      {
        id: 'daily-life',
        label: 'Daily activities become harder',
        phase: 'Functional effect',
        plain: 'As disease progresses, planning, communication, movement, eating, or self-care may need more support.',
        clinical: 'Progressive cognitive and neuropsychiatric impairment compromises instrumental and basic activities of daily living.',
        bodyParts: ['brain', 'nerves', 'muscles', 'stomach'],
        sourceIds: ['who-dementia'],
      },
      {
        id: 'whole-person',
        label: 'Care involves the whole person',
        phase: 'Long-term support',
        plain: 'Health care, safety, communication, movement, nutrition, and caregiver support all become part of the pathway.',
        clinical: 'Multidisciplinary, person-centred care addresses cognition, comorbidity, function, safety, and caregiver needs.',
        bodyParts: ['brain', 'heart', 'lungs', 'muscles', 'bones'],
        sourceIds: ['who-dementia'],
      },
    ],
  },
  {
    id: 'diabetes',
    rank: 8,
    title: 'Diabetes mellitus',
    shortTitle: 'Diabetes',
    category: 'Metabolic',
    accent: '#f0aa54',
    summary: 'Insulin supply or action cannot keep blood glucose in a healthy range, connecting digestion, hormones, cells, and long-term vessel health.',
    affectedSystems: ['Digestive', 'Endocrine', 'Circulatory', 'Renal', 'Nervous'],
    pathwayLabel: 'Food → glucose → insulin → cells → whole-body effects',
    sources: [WHO_TOP_TEN, NIDDK_DIABETES, NIDDK_CAUSES, NIDDK_DIGESTION, NIDDK_MANAGING, NIDDK_HEART, NIDDK_KIDNEY, NIDDK_EYE],
    steps: [
      {
        id: 'meal',
        label: 'Food enters the digestive tract',
        phase: 'Minutes after a meal',
        plain: 'Digestion begins in the mouth. The stomach and small intestine continue breaking food down, including carbohydrates into simple sugars.',
        clinical: 'Mechanical and enzymatic digestion processes macronutrients; digestible carbohydrate is reduced to absorbable monosaccharides.',
        bodyParts: ['stomach', 'intestines', 'pancreas', 'liver'],
        sourceIds: ['niddk-digestion'],
      },
      {
        id: 'absorption',
        label: 'Glucose enters the blood',
        phase: 'Absorption',
        plain: 'The small intestine moves glucose and other nutrients into the bloodstream. Blood carries them first toward the liver and then around the body.',
        clinical: 'Enterocytes transfer absorbed monosaccharides to portal circulation; the liver buffers, stores, transforms, and redistributes nutrients.',
        bodyParts: ['intestines', 'blood', 'liver'],
        sourceIds: ['niddk-digestion'],
      },
      {
        id: 'pancreas-senses',
        label: 'The pancreas releases insulin',
        phase: 'Hormone signal',
        plain: 'As blood glucose rises, beta cells in the pancreas release insulin. Insulin is a signal that helps the body handle the arriving fuel.',
        clinical: 'Rising glucose stimulates pancreatic beta-cell insulin secretion into the circulation.',
        bodyParts: ['pancreas', 'blood'],
        sourceIds: ['niddk-diabetes', 'niddk-causes'],
      },
      {
        id: 'cells-respond',
        label: 'Muscle, fat, and liver respond',
        phase: 'Fuel distribution',
        plain: 'Insulin helps muscle and fat cells take up glucose. It also helps the liver store extra glucose and reduce new glucose release.',
        clinical: 'Insulin promotes peripheral glucose uptake and storage while suppressing hepatic glucose production; liver and muscle can store glucose as glycogen.',
        bodyParts: ['muscles', 'fat', 'liver', 'blood'],
        sourceIds: ['niddk-causes'],
      },
      {
        id: 'types-diverge',
        label: 'Diabetes changes the control loop',
        phase: 'Type 1, type 2, or gestational',
        plain: 'In type 1 diabetes, the immune system destroys insulin-making beta cells. In type 2, cells resist insulin and the pancreas cannot keep up. Gestational diabetes develops during pregnancy.',
        clinical: 'Type 1 diabetes reflects autoimmune beta-cell destruction; type 2 combines insulin resistance with inadequate compensatory secretion; gestational diabetes is first diagnosed during pregnancy.',
        bodyParts: ['immune', 'pancreas', 'liver', 'muscles', 'fat', 'blood'],
        sourceIds: ['niddk-diabetes', 'niddk-causes'],
      },
      {
        id: 'hyperglycaemia',
        label: 'Glucose remains in circulation',
        phase: 'Hyperglycaemia',
        plain: 'Without enough effective insulin, glucose builds up in blood while many cells cannot use or store it normally.',
        clinical: 'Absolute or relative insulin deficiency produces hyperglycaemia through reduced peripheral disposal and continued hepatic glucose output.',
        bodyParts: ['blood', 'liver', 'muscles', 'fat', 'pancreas'],
        sourceIds: ['niddk-diabetes', 'niddk-causes'],
      },
      {
        id: 'kidney-response',
        label: 'The kidneys and fluid balance respond',
        phase: 'Symptoms can emerge',
        plain: 'The kidneys filter the blood. When glucose is very high, more glucose and water can leave in urine, contributing to frequent urination, thirst, and dehydration.',
        clinical: 'Hyperglycaemia can exceed renal reabsorptive capacity, producing glycosuria and osmotic diuresis.',
        bodyParts: ['kidneys', 'bladder', 'blood', 'brain'],
        sourceIds: ['niddk-causes', 'niddk-kidney'],
      },
      {
        id: 'ketones',
        label: 'Severe insulin lack can shift fuel use',
        phase: 'Acute emergency pathway',
        plain: 'When insulin is severely lacking, the body may break down fat rapidly and make ketones. Too many ketones can cause diabetic ketoacidosis.',
        clinical: 'Marked insulin deficiency promotes lipolysis and hepatic ketogenesis; accumulating ketone acids can cause diabetic ketoacidosis (DKA).',
        bodyParts: ['fat', 'liver', 'blood', 'brain', 'lungs'],
        sourceIds: ['niddk-causes', 'niddk-managing'],
        caution: 'DKA is a medical emergency. Trouble breathing, vomiting, abdominal pain, fruity-smelling breath, severe tiredness, or fainting needs urgent care.',
      },
      {
        id: 'large-vessels',
        label: 'Large vessels and the heart face long-term risk',
        phase: 'Over years',
        plain: 'Persistently high glucose can damage blood vessels and nerves that control the heart, raising the risk of heart disease and stroke.',
        clinical: 'Chronic hyperglycaemia contributes to vascular and autonomic injury associated with atherosclerotic cardiovascular disease.',
        bodyParts: ['blood', 'heart', 'brain', 'nerves'],
        sourceIds: ['niddk-heart'],
      },
      {
        id: 'microvessels',
        label: 'Small vessels and nerves can be injured',
        phase: 'Over years',
        plain: 'Tiny vessel damage can affect the retina and kidney filters. Nerve damage can alter feeling, especially in the feet, and can affect automatic body functions.',
        clinical: 'Microvascular injury underlies retinopathy and nephropathy; metabolic and microvascular mechanisms contribute to peripheral and autonomic neuropathy.',
        bodyParts: ['eyes', 'kidneys', 'nerves', 'blood', 'heart', 'stomach', 'bladder'],
        sourceIds: ['niddk-eye', 'niddk-kidney', 'niddk-managing'],
      },
      {
        id: 'management-loop',
        label: 'Management supports the feedback loop',
        phase: 'Ongoing care',
        plain: 'A personal care plan can combine monitoring, food and activity choices, medicines, and checks for blood pressure, cholesterol, eyes, kidneys, nerves, and feet.',
        clinical: 'Individualized glycaemic, cardiovascular-risk, and complication surveillance strategies are coordinated with a health-care team.',
        bodyParts: ['brain', 'eyes', 'heart', 'blood', 'liver', 'pancreas', 'kidneys', 'nerves', 'muscles'],
        sourceIds: ['niddk-managing'],
        caution: 'This visualization cannot set glucose targets, choose medicines, or replace an individual care plan.',
      },
    ],
  },
  {
    id: 'kidney-disease',
    rank: 9,
    title: 'Kidney diseases',
    shortTitle: 'Kidney disease',
    category: 'Renal',
    accent: '#e6a6c3',
    summary: 'Damaged nephrons lose the ability to filter blood and maintain fluid, mineral, acid, blood-pressure, and hormone balance.',
    affectedSystems: ['Kidneys', 'Blood', 'Heart', 'Bones', 'Nerves'],
    pathwayLabel: 'Nephron damage → filtration loss → whole-body balance',
    sources: [WHO_TOP_TEN, NIDDK_KIDNEYS, NIDDK_KIDNEY],
    steps: [
      {
        id: 'nephrons',
        label: 'Filtering units are damaged',
        phase: 'Cause and pace vary',
        plain: 'Each kidney contains many nephrons. Disease can injure their filters, tubules, blood supply, or supporting tissue.',
        clinical: 'Glomerular, tubular, vascular, or interstitial injury can reduce functioning nephron mass.',
        bodyParts: ['kidneys', 'blood'],
        sourceIds: ['niddk-kidneys'],
      },
      {
        id: 'filtration',
        label: 'Filtration and recovery change',
        phase: 'Progressive loss',
        plain: 'Damaged kidneys may remove waste and extra water less effectively or lose useful substances into urine.',
        clinical: 'Declining filtration and tubular function impair waste clearance, reabsorption, secretion, and volume regulation.',
        bodyParts: ['kidneys', 'blood', 'bladder'],
        sourceIds: ['niddk-kidneys'],
      },
      {
        id: 'balance',
        label: 'Body chemistry and fluid shift',
        phase: 'Systemic effects',
        plain: 'Fluid, acids, salts, and minerals can move out of balance, affecting nerves, muscles, lungs, and heart.',
        clinical: 'Disordered volume, electrolyte, and acid-base homeostasis produces multi-system consequences.',
        bodyParts: ['kidneys', 'blood', 'heart', 'lungs', 'nerves', 'muscles'],
        sourceIds: ['niddk-kidneys'],
      },
      {
        id: 'hormones',
        label: 'Hormone functions are affected',
        phase: 'Wider regulation',
        plain: 'Kidneys also help control blood pressure, red blood cell production, and bone health.',
        clinical: 'Renal endocrine functions influence blood pressure, erythropoiesis, and mineral-bone metabolism.',
        bodyParts: ['kidneys', 'heart', 'blood', 'bones'],
        sourceIds: ['niddk-kidneys'],
      },
    ],
  },
  {
    id: 'tuberculosis',
    rank: 10,
    title: 'Tuberculosis',
    shortTitle: 'Tuberculosis',
    category: 'Infectious',
    accent: '#e5ca7b',
    summary: 'Airborne Mycobacterium tuberculosis most often affects the lungs and may remain contained or progress to active disease.',
    affectedSystems: ['Lungs', 'Immune system', 'Lymph', 'Other organs'],
    pathwayLabel: 'Inhalation → immune containment or active disease',
    sources: [WHO_TOP_TEN, WHO_TB],
    steps: [
      {
        id: 'inhalation',
        label: 'Bacteria are inhaled',
        phase: 'Exposure',
        plain: 'Tuberculosis bacteria can travel through air and reach the lungs when a person breathes them in.',
        clinical: 'Airborne Mycobacterium tuberculosis reaches the distal respiratory tract after inhalation.',
        bodyParts: ['lungs'],
        sourceIds: ['who-tb'],
      },
      {
        id: 'immune',
        label: 'Immune cells try to contain infection',
        phase: 'Containment',
        plain: 'The immune system may wall off the bacteria. A person can have TB infection without active symptoms.',
        clinical: 'Cell-mediated immunity may contain bacilli in organized lesions without clinically active disease.',
        bodyParts: ['lungs', 'immune'],
        sourceIds: ['who-tb'],
      },
      {
        id: 'active',
        label: 'Active TB damages tissue',
        phase: 'Disease',
        plain: 'If containment fails, bacteria multiply and lung tissue can be injured, causing cough and other symptoms.',
        clinical: 'Progressive bacillary replication and host inflammation produce active pulmonary disease and tissue damage.',
        bodyParts: ['lungs', 'immune', 'blood'],
        sourceIds: ['who-tb'],
      },
      {
        id: 'spread',
        label: 'Disease can spread',
        phase: 'Transmission or dissemination',
        plain: 'Active pulmonary TB can spread to other people. In some cases, bacteria also spread to other organs in the body.',
        clinical: 'Infectious pulmonary disease enables airborne transmission; lymphohaematogenous dissemination can cause extrapulmonary TB.',
        bodyParts: ['lungs', 'blood', 'brain', 'kidneys', 'bones'],
        sourceIds: ['who-tb'],
        caution: 'A persistent cough, coughing blood, fever, night sweats, or unexplained weight loss needs medical evaluation. TB is treatable with prescribed antibiotics.',
      },
    ],
  },
]

export const BODY_PART_LABELS: Record<BodyPartId, string> = {
  brain: 'Brain',
  eyes: 'Eyes',
  lungs: 'Lungs',
  heart: 'Heart',
  blood: 'Blood vessels',
  liver: 'Liver',
  pancreas: 'Pancreas',
  stomach: 'Stomach',
  intestines: 'Intestines',
  kidneys: 'Kidneys',
  bladder: 'Bladder',
  nerves: 'Nerves',
  muscles: 'Muscles',
  fat: 'Adipose tissue',
  immune: 'Immune system',
  bones: 'Skeleton',
}

export const diseaseById = (id: string): DiseaseDefinition =>
  DISEASES.find((disease) => disease.id === id) ?? DISEASES.find((disease) => disease.id === 'diabetes')!
