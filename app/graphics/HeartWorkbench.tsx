import { Component, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type ComponentRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Box3, Group, Mesh, MeshPhysicalMaterial, PerspectiveCamera } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import manifest from '../../content/graphics/heart-study/manifest.json'
import { fitStudyCamera, type StudyView } from './cameraFit'

const assetUrl = new URL('../../content/graphics/heart-study/heart-study.glb', import.meta.url).href
const VIEWS: StudyView[] = ['front', 'left', 'back', 'right']
const totalTriangles = manifest.parts.reduce((sum, part) => sum + part.triangles, 0)
type MaterialMode = 'tissue' | 'clay'

function disposeModel(model: Group) {
  model.traverse(object => {
    if (!(object instanceof Mesh)) return
    object.geometry.dispose()
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose()
  })
}

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? null : this.props.children }
}

function Scene({ model, mode, view, context, vessels, rotate, zoom, reset, onContextLost, onInspect, frameKey, onPresented }: {
  model: Group; mode: MaterialMode; view: StudyView; context: boolean; vessels: boolean
  rotate: boolean; zoom: number; reset: number; onContextLost: () => void; onInspect: () => void
  frameKey: string; onPresented: (key: string) => void
}) {
  const { camera, gl, invalidate, size } = useThree()
  const orbit = useRef<ComponentRef<typeof OrbitControls>>(null)

  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onContextLost() }
    gl.domElement.addEventListener('webglcontextlost', lost)
    return () => gl.domElement.removeEventListener('webglcontextlost', lost)
  }, [gl, onContextLost])

  useLayoutEffect(() => {
    model.traverse(object => {
      if (!(object instanceof Mesh)) return
      const group = object.userData.group as string
      object.visible = group === 'context' ? context : vessels || !['surface-vessels', 'surface-fat'].includes(group)
      const material = object.material as MeshPhysicalMaterial
      material.vertexColors = mode === 'tissue'
      material.color.set(mode === 'clay' ? '#b4aea0' : '#ffffff')
      material.roughness = mode === 'clay' ? 0.83 : material.userData.originalRoughness
      material.clearcoat = mode === 'tissue' && group !== 'context' ? 0.16 : 0
      material.needsUpdate = true
    })
    invalidate()
  }, [model, mode, context, vessels, invalidate])

  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return
    model.updateMatrixWorld(true)
    const bounds = new Box3()
    model.traverse(object => {
      if (!(object instanceof Mesh) || !object.visible) return
      object.geometry.computeBoundingBox()
      bounds.union(object.geometry.boundingBox!.clone().applyMatrix4(object.matrixWorld))
    })
    const fit = fitStudyCamera(bounds, size.width / Math.max(1, size.height), view, camera.fov)
    camera.position.copy(fit.target).add(fit.position.clone().sub(fit.target).divideScalar(zoom))
    camera.up.set(0, 1, 0)
    camera.lookAt(fit.target)
    camera.updateProjectionMatrix()
    if (orbit.current) {
      orbit.current.target.copy(fit.target)
      orbit.current.minDistance = fit.distance * 0.65
      orbit.current.maxDistance = fit.distance * 1.8
      orbit.current.update()
    }
    invalidate()
  }, [model, context, vessels, view, zoom, reset, camera, size, invalidate])

  useLayoutEffect(() => {
    const surface = model.getObjectByName('ventricular-surface-study')
    if (!(surface instanceof Mesh)) return
    const previous = surface.onAfterRender
    let reported = false
    surface.onAfterRender = () => {
      if (reported) return
      reported = true
      onPresented(frameKey)
    }
    invalidate()
    return () => { surface.onAfterRender = previous }
  }, [model, frameKey, onPresented, invalidate])

  return <>
    <color attach="background" args={['#263030']} />
    <ambientLight intensity={1.45} color="#e5e5db" />
    <directionalLight position={[-3, 5, 6]} intensity={3.0} color="#fff1df" />
    <directionalLight position={[4, 1, 3]} intensity={1.25} color="#d5e1e3" />
    <directionalLight position={[1, 4, -4]} intensity={2.1} color="#e5d6be" />
    <primitive object={model} dispose={null} />
    <OrbitControls ref={orbit} makeDefault enablePan={false} enableDamping={false} onStart={onInspect}
      autoRotate={rotate} autoRotateSpeed={0.65} minPolarAngle={0.25} maxPolarAngle={Math.PI - 0.25} />
  </>
}

export function HeartWorkbench() {
  const [model, setModel] = useState<Group | null>(null)
  const [presented, setPresented] = useState('')
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [mode, setMode] = useState<MaterialMode>('tissue')
  const [view, setView] = useState<StudyView>('front')
  const [context, setContext] = useState(false)
  const [vessels, setVessels] = useState(true)
  const [rotate, setRotate] = useState(false)
  const [inspecting, setInspecting] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [reset, setReset] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [hidden, setHidden] = useState(document.hidden)
  const [showDetails, setShowDetails] = useState(false)
  const frameKey = [attempt, mode, view, context, vessels, zoom, reset].join(':')

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => { setReducedMotion(media.matches); if (media.matches) setRotate(false) }
    const visibility = () => setHidden(document.hidden)
    media.addEventListener('change', change)
    document.addEventListener('visibilitychange', visibility)
    return () => { media.removeEventListener('change', change); document.removeEventListener('visibilitychange', visibility) }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let loaded: Group | null = null
    setModel(null); setPresented(''); setError(false)
    async function load() {
      try {
        const response = await fetch(assetUrl, { signal: controller.signal })
        if (!response.ok) throw new Error('Asset request failed')
        const bytes = await response.arrayBuffer()
        const digest = await crypto.subtle.digest('SHA-256', bytes)
        const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
        if (hash !== manifest.assetSha256) throw new Error('Asset integrity check failed')
        const gltf = await new GLTFLoader().parseAsync(bytes, '')
        loaded = gltf.scene
        if (controller.signal.aborted) { disposeModel(loaded); loaded = null; return }
        loaded.traverse(object => {
          if (!(object instanceof Mesh)) return
          const original = Array.isArray(object.material) ? object.material[0] : object.material
          const material = new MeshPhysicalMaterial({
            vertexColors: true, metalness: 0, roughness: 'roughness' in original ? Number(original.roughness) : 0.55,
            clearcoat: 0.16, clearcoatRoughness: 0.48, side: original.side,
          })
          material.userData.originalRoughness = material.roughness
          for (const old of Array.isArray(object.material) ? object.material : [object.material]) old.dispose()
          object.material = material
        })
        setModel(loaded)
      } catch {
        if (!controller.signal.aborted) setError(true)
      }
    }
    void load()
    return () => { controller.abort(); if (loaded) disposeModel(loaded) }
  }, [attempt])

  const resetView = () => { setRotate(false); setInspecting(false); setView('front'); setZoom(1); setReset(n => n+1) }
  const renderFailed = () => { setRotate(false); setError(true) }

  return <div className="workbench">
    <a className="skip-link" href="#study-controls">Skip to study controls</a>
    <header className="masthead">
      <span className="wordmark">PalDawn<span> / FORM LAB</span></span>
      <span className="edition">GRAPHICS REBUILD · STUDY 001</span>
      <span className="status-tag"><span aria-hidden="true" />Unreviewed artwork</span>
    </header>
    <main className="study-layout">
      <section className="study-introduction" aria-labelledby="study-title">
        <p className="eyebrow">THE FIRST FORM</p>
        <h1 id="study-title">A heart.<br /><em>With substance.</em></h1>
        <p className="lede">An original three-dimensional form study. Explore the surface, follow its branches, and inspect the silhouette from every side.</p>
        <div className="study-number" aria-hidden="true">01<span> / HEART</span></div>
        <dl className="study-facts">
          <div><dt>Focus</dt><dd>Exterior & surface vessels</dd></div>
          <div><dt>Approach</dt><dd>Authored mesh surfaces</dd></div>
          <div><dt>Review</dt><dd>Not anatomically validated</dd></div>
        </dl>
        <p className="boundary">This is a visual development study, not an anatomical reference. Interiors, valves, and blood flow are not included.</p>
      </section>

      <section className="specimen" aria-label="Interactive heart form study" data-renderer={error ? 'unavailable' : model && presented === frameKey ? 'ready' : 'loading'} data-view={inspecting || rotate ? 'free' : view} data-material={mode} data-context={context ? 'chest' : 'heart'}>
        <div className="specimen-topline"><span>{context ? 'CHEST CONTEXT' : 'HEART EXTERIOR'}</span><span>{mode === 'clay' ? 'CLAY / FORM' : 'TISSUE / SURFACE'}</span></div>
        <div className="canvas-stage">
          {!error && model ? <SceneBoundary key={attempt} onFailure={renderFailed}>
            <Canvas aria-hidden="true" dpr={[1, 1.75]} frameloop={rotate && !reducedMotion && !hidden ? 'always' : 'demand'}
              camera={{ fov: 34, near: 0.05, far: 100 }} gl={{ antialias: true, alpha: false }}>
              <Scene model={model} mode={mode} view={view} context={context} vessels={vessels}
                rotate={rotate && !reducedMotion && !hidden} zoom={zoom} reset={reset} onContextLost={renderFailed}
                onInspect={() => { setInspecting(true); setRotate(false) }} frameKey={frameKey} onPresented={setPresented} />
            </Canvas>
          </SceneBoundary> : null}
          {error ? <div className="scene-message" role="alert"><h2>The study could not load.</h2><p>Check your local connection and WebGL support. The coverage notes and controls remain available.</p><button onClick={() => setAttempt(n => n+1)}>Retry the study</button></div>
            : !model ? <div className="scene-message" role="status"><span className="loading-mark" aria-hidden="true">P</span><p>Preparing the surface study…</p></div> : null}
        </div>
        <div className="view-strip" aria-label="Camera views">
          {VIEWS.map(name => <button key={name} aria-pressed={view === name && !rotate && !inspecting} disabled={!model || error}
            onClick={() => { setRotate(false); setInspecting(false); setView(name); setReset(n => n+1) }}>{name[0].toUpperCase()}{name.slice(1)}</button>)}
        </div>
        <p className="canvas-caption" aria-live="polite">{error ? '3D unavailable. Read the study scope beside this view.' : rotate ? 'Turntable running. Pause to inspect a surface.' : inspecting ? 'Free inspection. Choose a fixed view or reset to return.' : `${view[0].toUpperCase()}${view.slice(1)} view. Drag to rotate · scroll to zoom. Buttons provide fixed views.`}</p>
      </section>

      <aside className="study-controls" id="study-controls" aria-label="Study controls" tabIndex={-1}>
        <p className="eyebrow">LOOK CLOSER</p>
        <fieldset disabled={!model || error}><legend>Surface</legend><div className="segmented">
          <button aria-pressed={mode === 'tissue'} onClick={() => setMode('tissue')}>Tissue</button>
          <button aria-pressed={mode === 'clay'} onClick={() => setMode('clay')}>Clay</button>
        </div><p>Remove color to judge the shape itself.</p></fieldset>
        <fieldset disabled={!model || error}><legend>Layers</legend>
          <label className="check-row"><span>Surface vessels</span><input type="checkbox" checked={vessels} onChange={e => setVessels(e.target.checked)} /></label>
          <label className="check-row"><span>Chest context</span><input type="checkbox" checked={context} onChange={e => { setContext(e.target.checked); setZoom(1); setInspecting(false) }} /></label>
          <p>The chest silhouettes give composition context; their placement is unvalidated.</p>
        </fieldset>
        <fieldset disabled={!model || error}><legend>Inspection</legend>
          <label className="zoom-label" htmlFor="study-zoom">Zoom <output>{Math.round(zoom * 100)}%</output></label>
          <input id="study-zoom" aria-label="Study zoom" type="range" min="0.8" max="1.2" step="0.05" value={zoom} onChange={e => { setZoom(Number(e.target.value)); setInspecting(false) }} />
          <button className="turntable-button" aria-pressed={rotate} disabled={reducedMotion} onClick={() => { setRotate(v => !v); setInspecting(true) }}>{rotate ? 'Pause turntable' : 'Start turntable'}<span aria-hidden="true">↻</span></button>
          {reducedMotion ? <p>Reduced motion is on. Use the fixed views to inspect each side.</p> : null}
          <button className="reset-button" onClick={resetView}>Reset view</button>
        </fieldset>
        <div className="coverage"><p className="eyebrow">WHAT THIS STUDY COVERS</p>
          <ul><li>Asymmetric exterior</li><li>Open vessel ends</li><li>Branching surface forms</li><li>Neutral clay inspection</li></ul>
          <button aria-expanded={showDetails} aria-controls="asset-notes" onClick={() => setShowDetails(v => !v)}>{showDetails ? 'Hide asset notes' : 'View asset notes'} <span aria-hidden="true">{showDetails ? '−' : '+'}</span></button>
        </div>
      </aside>
      {showDetails ? <section className="asset-notes" id="asset-notes" aria-labelledby="asset-notes-title">
        <h2 id="asset-notes-title">Authored, reproducible, awaiting review.</h2>
        <p>{manifest.creator}. No third-party anatomy mesh or patient data is used. The source profiles and vessel paths are editable artwork; they are not measurements or verified coronary topology.</p>
        <dl><div><dt>Triangles in complete pack</dt><dd>{totalTriangles.toLocaleString()}</dd></div><div><dt>License</dt><dd>CC BY-SA 4.0</dd></div><div><dt>Publication status</dt><dd>Not eligible; review pending</dd></div></dl>
        <p>Missing: chambers, valves, validated vessel routes, blood flow, physiological contraction, and a complete thorax. This workbench is excluded from PalDawn’s public app build.</p>
      </section> : null}
    </main>
    <footer className="study-footer"><span>PalDawn · A companion voyage</span><span>FORM BEFORE EFFECTS</span><span>Original artwork · CC BY-SA 4.0</span></footer>
  </div>
}
