# Foundation+4: disease systems explorer

Foundation+4 adds an English-only disease library and procedural 3D systems
map without changing the provenance gate for real anatomy. It is an
educational preview, not a reviewed clinical lesson, reviewed anatomy model,
diagnostic tool, or treatment guide.

## How to use it

1. Open PalDawn and choose **Explore diabetes**, select one of the ten cards on
   the landing page, or open **Atlas** from the desktop header.
2. Use **Find a route** to search the preview’s existing conditions, phases,
   and highlighted structures, or choose a condition from the **Condition
   library**. The order follows the
   World Health Organization's 2021 global causes-of-death ranking; it does not
   describe an individual's probability or severity.
3. Use the numbered timeline, **Previous**, and **Next step** to follow the
   mechanism. The model highlights the body systems named by the current step.
4. Choose **Explode systems** to separate overlapping structures. Choose an
   organ label to keep that structure highlighted. The geometry is conceptual
   and not to anatomical scale.
5. Switch between **Plain English** and **Clinical terms**. Both tracks use the
   same underlying step and source links; neither is professional training.
6. Open **Evidence for this step** to inspect the supporting WHO or NIH/NIDDK
   page. Choose **How to use** inside the explorer for the same controls and
   keyboard guide.

Keyboard controls in the explorer:

- `/`: focus Find a route
- `Left Arrow` / `Right Arrow`: previous or next mechanism step
- `Escape`: close the how-to guide, then close the explorer

## Initial condition set

The ten entries match WHO's published 2021 global top ten causes of death:
ischaemic heart disease, COVID-19, stroke, COPD, lower respiratory infection,
trachea/bronchus/lung cancers, Alzheimer disease and other dementias, diabetes
mellitus, kidney diseases, and tuberculosis.

Diabetes receives the deepest first journey. Its eleven stages connect the
digestive tract, portal circulation and liver, pancreatic beta cells and
insulin, muscle and adipose tissue, the type 1/type 2/gestational divergence,
hyperglycaemia, renal glucose and fluid handling, ketones and DKA, large-vessel
risk, microvascular and nerve injury, and ongoing care coordination.

## Evidence and review boundary

Primary public sources used by the in-app content:

- [WHO: The top 10 causes of death](https://www.who.int/news-room/fact-sheets/detail/the-top-10-causes-of-death)
- [WHO: Cardiovascular diseases](https://www.who.int/news-room/fact-sheets/detail/cardiovascular-diseases-(cvds))
- [WHO: Stroke](https://www.who.int/news-room/fact-sheets/detail/stroke)
- [WHO: COPD](https://www.who.int/news-room/fact-sheets/detail/chronic-obstructive-pulmonary-disease-(copd))
- [WHO: Lung cancer](https://www.who.int/news-room/fact-sheets/detail/lung-cancer)
- [WHO: Dementia](https://www.who.int/news-room/fact-sheets/detail/dementia)
- [WHO: Tuberculosis](https://www.who.int/news-room/fact-sheets/detail/tuberculosis)
- [NIH/NIDDK: What is diabetes?](https://www.niddk.nih.gov/health-information/diabetes/overview/what-is-diabetes)
- [NIH/NIDDK: Symptoms and causes of diabetes](https://www.niddk.nih.gov/health-information/diabetes/overview/symptoms-causes)
- [NIH/NIDDK: Your digestive system and how it works](https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works)
- [NIH/NIDDK: Managing diabetes](https://www.niddk.nih.gov/health-information/diabetes/overview/managing-diabetes)
- [NIH/NIDDK: Diabetes, heart disease, and stroke](https://www.niddk.nih.gov/health-information/diabetes/overview/preventing-problems/heart-disease-stroke)
- [NIH/NIDDK: Diabetic kidney disease](https://www.niddk.nih.gov/health-information/diabetes/overview/preventing-problems/diabetic-kidney-disease)
- [NIH/NIDDK: Diabetic eye disease](https://www.niddk.nih.gov/health-information/diabetes/overview/preventing-problems/diabetic-eye-disease)

Sources were checked on 22 August 2026. The project-authored synthesis has not
received named qualified-human medical review. The app states that limitation
in the landing view, every journey detail panel, the how-to guide, and the
persistent safety line.

## 3D and open-source boundary

The explorer uses the project's existing Three.js and React Three Fiber stack.
The body shell, organs, vessels, nerves, and skeleton are authored from
procedural primitives in `app/src/scene/HumanSystemsScene.tsx`; no mesh, texture,
patient scan, or third-party anatomical model is incorporated.

Open-source projects such as Z-Anatomy, BodyParts3D, vtk.js, Kitware Glance,
and browser-based Three.js anatomy viewers informed the product vocabulary and
future architecture. Their source or assets were not copied into this preview.
The audited Z-Anatomy candidates remain blocked exactly as recorded in
`docs/research/paldawn-heart-coronary-asset-audit.md` and `NOTICE.md`.
