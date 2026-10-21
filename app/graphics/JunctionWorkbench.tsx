import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Color, InstancedMesh, MeshStandardMaterial, Object3D, PerspectiveCamera, Vector3 } from 'three'
import { branchWallGeometry } from './branchGeometry.ts'
import { branchCellFrame } from './branchModel.ts'
import { FLOW, FLOW_COUNTS, cellGeometry, type FlowQuality } from './flowModel.ts'
import { fitStudyCamera } from './cameraFit'
import { SceneBoundary } from './SceneBoundary'

const VIEWS = { above: new Vector3(0, 1, .3), below: new Vector3(0, -1, .3), left: new Vector3(-1, .5, .4), right: new Vector3(1, .5, .4) }
type View = keyof typeof VIEWS

function JunctionScene({ time, quality, view, wireframe, frameKey, onPresented, onFailure }: {
  time: number; quality: FlowQuality; view: View; wireframe: boolean; frameKey: string; onPresented: (key: string) => void; onFailure: () => void
}) {
  const { camera, size, gl, invalidate } = useThree()
  const [resources] = useState(() => {
    const wall = branchWallGeometry(), cell = cellGeometry(), material = new MeshStandardMaterial({ color: '#bb8070', roughness: .72 })
    const cellMaterial = new MeshStandardMaterial({ roughness: .55 })
    const cells = new InstancedMesh(cell, cellMaterial, FLOW_COUNTS.high)
    const bounds = wall.boundingBox!.clone(); bounds.max.y = .4
    return { wall, cell, material, cellMaterial, cells, bounds }
  })
  useEffect(() => () => { resources.wall.dispose(); resources.cell.dispose(); resources.material.dispose(); resources.cellMaterial.dispose(); resources.cells.dispose() }, [resources])
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onFailure() }
    gl.domElement.addEventListener('webglcontextlost', lost)
    return () => gl.domElement.removeEventListener('webglcontextlost', lost)
  }, [gl, onFailure])
  useLayoutEffect(() => {
    const object = new Object3D()
    resources.cells.count = FLOW_COUNTS[quality]
    for (let id = 0; id < FLOW_COUNTS[quality]; id++) {
      const frame = branchCellFrame(id, time)
      object.position.copy(frame.center); object.scale.setScalar(frame.scale)
      object.rotation.set(0, time * .4 + id, 0); object.updateMatrix()
      resources.cells.setMatrixAt(id, object.matrix)
      resources.cells.setColorAt(id, new Color(frame.branch === 'left' ? '#ae3934' : '#d36d54'))
    }
    resources.cells.instanceMatrix.needsUpdate = true
    if (resources.cells.instanceColor) resources.cells.instanceColor.needsUpdate = true
    resources.material.wireframe = wireframe
    invalidate()
  }, [resources, time, quality, wireframe, invalidate])
  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return
    const fit = fitStudyCamera(resources.bounds, size.width / Math.max(1, size.height), VIEWS[view], camera.fov)
    camera.position.copy(fit.position); camera.up.set(0, 1, 0); camera.lookAt(fit.target); camera.updateProjectionMatrix(); invalidate()
  }, [camera, size, resources, view, invalidate])
  return <>
    <color attach="background" args={['#263030']} />
    <ambientLight intensity={1.6} />
    <directionalLight position={[0, 6, 4]} intensity={3} />
    <directionalLight position={[-4, -3, -2]} intensity={1.5} />
    <mesh geometry={resources.wall} material={resources.material} dispose={null} />
    <primitive object={resources.cells} dispose={null} frustumCulled={false} onAfterRender={() => onPresented(frameKey)} />
    <OrbitControls key={view} target={resources.bounds.getCenter(new Vector3())} enablePan={false} enableDamping={false} minDistance={.5} maxDistance={100} minPolarAngle={.15} maxPolarAngle={Math.PI - .15} />
  </>
}

export function JunctionWorkbench() {
  const [time, setTime] = useState(0), [playing, setPlaying] = useState(false)
  const [quality, setQuality] = useState<FlowQuality>('high'), [view, setView] = useState<View>('above')
  const [wireframe, setWireframe] = useState(false), [text, setText] = useState(false)
  const [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0), [presented, setPresented] = useState('')
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const playhead = useRef(0), frameKey = [time, quality, view, wireframe, attempt].join(':')
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => { setReduced(media.matches); if (media.matches) setPlaying(false) }
    const visibility = () => { if (document.hidden) setPlaying(false) }
    media.addEventListener('change', change); document.addEventListener('visibilitychange', visibility)
    return () => { media.removeEventListener('change', change); document.removeEventListener('visibilitychange', visibility) }
  }, [])
  useEffect(() => {
    if (!playing || reduced || failed || text) return
    let previous: number | null = null, request = 0
    const tick = (now: number) => {
      if (previous !== null) playhead.current = Math.min(12, playhead.current + (now - previous) / 1000)
      previous = now; setTime(playhead.current)
      if (playhead.current >= 12) setPlaying(false)
      else request = requestAnimationFrame(tick)
    }
    request = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(request)
  }, [playing, reduced, failed, text])
  const seek = (value: number) => { setPlaying(false); playhead.current = value; setTime(value) }
  const failure = () => { setPlaying(false); setFailed(true) }
  return <div className="workbench">
    <a className="skip-link" href="#junction-controls">Skip to junction controls</a>
    <header className="masthead"><a className="wordmark" href="./heart-study.html">PalDawn<span> / FORM LAB</span></a><span className="status-tag">Branch journey fixture</span></header>
    <main className="study-layout">
      <section className="study-introduction"><p className="eyebrow">FOLLOW THE OPENING</p><h1>One opening.<br /><em>Two paths.</em></h1><p className="lede">A connected synthetic Y wall. Every seeded form chooses one branch and crosses the opening once.</p><p className="boundary">Engineering fixture in arbitrary units. Shape, scale, density, routing and speed are illustrative. No anatomical or clinical approval.</p><p><a href="./flow-study.html">Single-vessel study</a></p></section>
      <section className="specimen" aria-label="Interactive junction study" data-renderer={text ? 'text' : failed ? 'unavailable' : presented === frameKey ? 'ready' : 'loading'} data-time={time.toFixed(3)} data-quality={quality} data-view={view}>
        <div className="specimen-topline"><span>CONNECTED Y CUTAWAY</span><span>ARBITRARY UNITS</span></div>
        <div className="canvas-stage">
          {text ? <div className="scene-message"><h2>One parent, two exits</h2><p>The upper half of the wall is removed for inspection. Each form keeps its identity and branch across seeking and detail changes. It fades only at external entry and exit.</p></div> : failed ? <div className="scene-message" role="alert"><h2>The junction view is unavailable.</h2><p>Retry returns to the same paused frame. The explanation remains available in text mode.</p><button onClick={() => { setPresented(''); setAttempt(n => n + 1); setFailed(false) }}>Retry junction view</button></div> : <SceneBoundary key={attempt} onFailure={failure}><Canvas aria-hidden="true" frameloop="demand" dpr={[1, 1.75]} camera={{ fov: 34, near: .05, far: 150 }} gl={{ antialias: true }}><JunctionScene time={time} quality={quality} view={view} wireframe={wireframe} frameKey={frameKey} onPresented={setPresented} onFailure={failure} /></Canvas></SceneBoundary>}
        </div>
        <p className="canvas-caption">The opening is continuous. No cells wrap or fade at the branch.</p>
      </section>
      <aside className="study-controls" id="junction-controls" aria-label="Junction controls" tabIndex={-1}>
        <fieldset disabled={failed}><legend>Playback</legend><label className="zoom-label" htmlFor="junction-time">Study time <output>{time.toFixed(1)} / {FLOW.duration} s</output></label><input className="flow-time" id="junction-time" aria-label="Study time" type="range" min="0" max="12" step="0.1" value={time} onChange={e => seek(Number(e.target.value))} /><button className="turntable-button" disabled={reduced || text || time >= 12} onClick={() => setPlaying(v => !v)}>{playing ? 'Pause passage' : 'Play passage'}</button><button className="reset-button" onClick={() => seek(0)}>Restart passage</button><p role="status">{reduced ? 'Reduced motion: inspect still frames with the slider.' : playing ? 'Playing the synthetic passage.' : 'Paused. Seek in either direction.'}</p></fieldset>
        <fieldset disabled={failed}><legend>Inspect</legend><div className="profile-options">{(Object.keys(VIEWS) as View[]).map(id => <button key={id} aria-pressed={view === id} onClick={() => { setPlaying(false); setView(id) }}>{id[0]!.toUpperCase() + id.slice(1)}</button>)}</div><label className="check-row">Wireframe<input type="checkbox" checked={wireframe} onChange={e => { setPlaying(false); setWireframe(e.target.checked) }} /></label></fieldset>
        <fieldset disabled={failed}><legend>Detail</legend><div className="segmented">{(['low', 'high'] as const).map(level => <button key={level} aria-pressed={quality === level} onClick={() => setQuality(level)}>{level === 'low' ? 'Low' : 'High'}</button>)}</div><p>{FLOW_COUNTS[quality]} stable identities. Branch allocation is illustrative.</p></fieldset>
        <label className="check-row">Text mode<input type="checkbox" checked={text} onChange={e => { setPlaying(false); setText(e.target.checked) }} /></label>
      </aside>
    </main><footer className="study-footer"><span>Local development only · excluded from the public app</span><span>Synthetic geometry · no clinical approval</span></footer>
  </div>
}
