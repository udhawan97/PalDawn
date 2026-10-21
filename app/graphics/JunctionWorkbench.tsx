import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Box3, InstancedBufferAttribute, InstancedBufferGeometry, MeshStandardMaterial, PerspectiveCamera, Vector3 } from 'three'
import { branchWallGeometry } from './branchGeometry.ts'
import { branchSeed, branchShader } from './branchModel.ts'
import { FLOW, FLOW_COUNTS, cellGeometry, type FlowQuality } from './flowModel.ts'
import { fitStudyCamera } from './cameraFit'
import { SceneBoundary } from './SceneBoundary'
import { CAPTIONS, SHOTS, SYNTHETIC_SCENE, resolveSceneFrame, shotAt } from './sceneFrame.ts'
import { INITIAL_PLAYBACK, playback, type PlaybackEvent } from './playback.ts'

const VIEWS = { above: new Vector3(0, 1, .3), below: new Vector3(0, -1, .3), left: new Vector3(-1, .5, .4), right: new Vector3(1, .5, .4) }
type View = keyof typeof VIEWS

function JunctionScene({ time, quality, view, inspecting, reduced, wireframe, frameKey, probe, onPresented, onFailure }: {
  time: number; quality: FlowQuality; view: View | null; inspecting: boolean; reduced: boolean; wireframe: boolean; frameKey: string; probe: number | null; onPresented: (key: string, camera: number[][], frame: ReturnType<typeof resolveSceneFrame>) => void; onFailure: () => void
}) {
  const { camera, size, gl, invalidate } = useThree()
  const [resources] = useState(() => {
    const wall = branchWallGeometry(), cell = cellGeometry(), material = new MeshStandardMaterial({ color: '#bb8070', roughness: .72 })
    const cellMaterial = new MeshStandardMaterial({ color: '#d44935', roughness: .55 }), clock = { value: 0 }
    const cells = new InstancedBufferGeometry(); cells.index = cell.index; cells.attributes = cell.attributes
    cells.setAttribute('branchSeed', new InstancedBufferAttribute(new Float32Array(Array.from({ length: probe === null ? 240 : 1 }, (_, i) => branchSeed(probe ?? i)).flat()), 4))
    cellMaterial.onBeforeCompile = shader => {
      shader.uniforms.studyTime = clock
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n' + branchShader).replace('#include <begin_vertex>', 'vec3 transformed = branchCenter() + position * branchScale();')
    }
    const bounds = wall.boundingBox!.clone(); bounds.max.y = .4
    const junction = new Box3(), positions = wall.getAttribute('position'), point = new Vector3()
    for (let i = 0; i < positions.count; i++) { point.fromBufferAttribute(positions, i); if (Math.abs(point.z) <= 2.06) junction.expandByPoint(point) }
    junction.min.z = -2; junction.max.z = 2; junction.max.y = .4
    return { wall, cell, material, cellMaterial, cells, bounds, sceneBounds: { whole: bounds, junction }, clock }
  })
  const frame = resolveSceneFrame(SYNTHETIC_SCENE, time, { width: Math.max(1, size.width), height: Math.max(1, size.height), reduced }, resources.sceneBounds)
  useEffect(() => () => { resources.wall.dispose(); resources.cell.dispose(); resources.material.dispose(); resources.cellMaterial.dispose(); resources.cells.dispose() }, [resources])
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onFailure() }
    gl.domElement.addEventListener('webglcontextlost', lost)
    return () => gl.domElement.removeEventListener('webglcontextlost', lost)
  }, [gl, onFailure])
  useLayoutEffect(() => {
    resources.cells.instanceCount = probe === null ? FLOW_COUNTS[quality] : 1
    resources.clock.value = frame.flowTime
    resources.material.wireframe = wireframe
    invalidate()
  }, [resources, time, quality, wireframe, probe, invalidate])
  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera) || size.width <= 0 || size.height <= 0 || (inspecting && view === null)) return
    if (inspecting && view !== null) {
      const fit = fitStudyCamera(resources.bounds, size.width / size.height, VIEWS[view], camera.fov)
      camera.position.copy(fit.position); camera.lookAt(fit.target)
    } else { camera.position.fromArray(frame.camera.position); camera.lookAt(new Vector3().fromArray(frame.camera.target)) }
    camera.up.set(0, 1, 0); camera.near = frame.camera.near; camera.far = frame.camera.far; camera.updateProjectionMatrix(); invalidate()
  }, [camera, size, resources, view, time, inspecting, reduced, invalidate])
  return <>
    <color attach="background" args={['#263030']} />
    <ambientLight intensity={1.6} />
    <directionalLight position={[0, 6, 4]} intensity={3} />
    <directionalLight position={[-4, -3, -2]} intensity={1.5} />
    <mesh geometry={resources.wall} material={resources.material} dispose={null} />
    <mesh geometry={resources.cells} material={resources.cellMaterial} dispose={null} frustumCulled={false} onAfterRender={() => onPresented(frameKey, [camera.projectionMatrix.elements, camera.matrixWorldInverse.elements], frame)} />
    <OrbitControls key={`${inspecting}:${view}`} enabled={inspecting} target={inspecting && view !== null ? resources.bounds.getCenter(new Vector3()) : new Vector3().fromArray(frame.camera.target)} enablePan={false} enableDamping={false} minDistance={.25} maxDistance={50} minPolarAngle={.15} maxPolarAngle={Math.PI - .15} />
  </>
}

export function JunctionWorkbench() {
  const [state, setState] = useState(() => ({ ...INITIAL_PLAYBACK, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches }))
  const current = useRef(state)
  const send = useCallback((event: PlaybackEvent) => { current.current = playback(current.current, event); setState(current.current) }, [])
  const { time, playing, inspecting, reduced, text, status, pendingTime } = state
  const [quality, setQuality] = useState<FlowQuality>('high'), [view, setView] = useState<View | null>(null)
  const [wireframe, setWireframe] = useState(false), [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0), [presented, setPresented] = useState('')
  const [cameraState, setCameraState] = useState(''), [frameState, setFrameState] = useState('')
  const [probe] = useState(() => { const value = new URLSearchParams(location.search).get('probe'); return value !== null && /^\d+$/.test(value) && Number(value) < 240 ? Number(value) : null })
  const [deferred] = useState(() => new URLSearchParams(location.search).get('fixture') === 'deferred')
  const pending = useRef<AbortController | null>(null)
  const requestFrame = useCallback((value: number) => {
    pending.current?.abort(); setView(null)
    if (!deferred) { send({ type: 'seek', time: value }); return }
    send({ type: 'request', time: value })
    const requestId = current.current.requestId, controller = new AbortController()
    pending.current = controller
    // Synthetic readiness fixture only; production packs belong to P3.
    void fetch(`./junction-study.html?scene-ready=${requestId}`, { signal: controller.signal, cache: 'no-store' })
      .then(response => send({ type: 'settled', requestId, ok: response.ok }))
      .catch(error => { if (error.name !== 'AbortError') send({ type: 'settled', requestId, ok: false }) })
  }, [deferred, send])
  useEffect(() => () => pending.current?.abort(), [])
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => send({ type: 'reduced', value: media.matches })
    const visibility = () => { if (document.hidden) send({ type: 'hidden' }) }
    media.addEventListener('change', change); document.addEventListener('visibilitychange', visibility)
    return () => { media.removeEventListener('change', change); document.removeEventListener('visibilitychange', visibility) }
  }, [send])
  useEffect(() => {
    if (!playing || status !== 'ready' || reduced || failed || text || inspecting) return
    let previous: number | null = null, request = 0
    const tick = (now: number) => {
      if (previous !== null) {
        const delta = Math.min(.25, (now - previous) / 1000), next = Math.min(12, current.current.time + delta)
        if (deferred && shotAt(next).id !== shotAt(current.current.time).id) requestFrame(next)
        else send({ type: 'tick', delta })
      }
      previous = now
      if (current.current.playing) request = requestAnimationFrame(tick)
    }
    request = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(request)
  }, [playing, status, reduced, failed, text, inspecting, deferred, requestFrame, send])
  const restart = () => { pending.current?.abort(); setView(null); send({ type: 'restart' }) }
  const failure = () => { send({ type: 'pause' }); setFailed(true) }
  const frameKey = [time, quality, view, inspecting, reduced, wireframe, attempt].join(':')
  const shot = shotAt(time), caption = CAPTIONS[shot.caption as keyof typeof CAPTIONS]
  return <div className="workbench">
    <a className="skip-link" href="#junction-controls">Skip to junction controls</a>
    <header className="masthead"><a className="wordmark" href="./heart-study.html">PalDawn<span> / FORM LAB</span></a><span className="status-tag">Branch journey fixture</span></header>
    <main className="study-layout">
      <section className="study-introduction"><p className="eyebrow">FOLLOW THE OPENING</p><h1>One opening.<br /><em>Two paths.</em></h1><p className="lede">Locate the opening, follow a branch choice, then inspect the central lane. One teaching clock determines the entire scene.</p><p className="boundary">Engineering fixture in arbitrary units. Shape, scale, density, routing and speed are illustrative. No anatomical or clinical approval.</p><p><a href="./flow-study.html">Single-vessel study</a></p></section>
      <section className="specimen" aria-label="Interactive junction study" data-renderer={text ? 'text' : failed ? 'unavailable' : presented === frameKey ? 'ready' : 'loading'} data-time={time.toFixed(3)} data-quality={quality} data-view={view ?? 'journey'} data-shot={shot.id} data-playback={status} data-inspecting={String(inspecting)} data-probe={probe ?? ''} data-camera={cameraState} data-frame={frameState}>
        <div className="specimen-topline"><span>{shot.id.toUpperCase()} · SYNTHETIC Y</span><span>ARBITRARY UNITS</span></div>
        <div className="canvas-stage">
          {text ? <div className="scene-message"><h2>One parent, two exits</h2><p>{caption}</p><p>Forms keep their identity and branch. They fade only at external entry and exit. Source: original synthetic engineering fixture.</p></div> : failed ? <div className="scene-message" role="alert"><h2>The junction view is unavailable.</h2><p>Retry returns to the same paused frame. The explanation remains available in text mode.</p><button onClick={() => { setPresented(''); setAttempt(n => n + 1); setFailed(false) }}>Retry junction view</button></div> : <SceneBoundary key={attempt} onFailure={failure}><Canvas aria-hidden="true" frameloop="demand" dpr={[1, 2]} camera={{ fov: 34, near: .05, far: 150 }} gl={{ antialias: true, preserveDrawingBuffer: probe !== null }}><JunctionScene time={time} quality={quality} view={view} inspecting={inspecting} reduced={reduced} wireframe={wireframe} frameKey={frameKey} probe={probe} onPresented={(key, camera, frame) => { setPresented(key); setCameraState(JSON.stringify(camera)); setFrameState(JSON.stringify(frame)) }} onFailure={failure} /></Canvas></SceneBoundary>}
        </div>
        <p className="canvas-caption" aria-live="polite">{caption}</p>
        <details className="scene-notes"><summary>Scene notes</summary><p>Source: original synthetic fixture (synthetic:y-v1). Upper wall removed for inspection. Teaching seconds do not represent physiological elapsed time. No reviewed anatomy or clinical content.</p></details>
      </section>
      <aside className="study-controls" id="junction-controls" aria-label="Junction controls" tabIndex={-1}>
        <fieldset disabled={failed}><legend>Playback</legend><label className="zoom-label" htmlFor="junction-time">Study time <output>{time.toFixed(1)} / {FLOW.duration} s</output></label><input className="flow-time" id="junction-time" aria-label="Study time" type="range" min="0" max="12" step="0.001" value={time} onChange={e => requestFrame(Number(e.target.value))} /><button className="turntable-button" disabled={reduced || text || inspecting || status !== 'ready' || time >= 12} onClick={() => send({ type: playing ? 'pause' : 'play' })}>{playing ? 'Pause passage' : 'Play passage'}</button><button className="reset-button" onClick={restart}>Restart passage</button><p role="status">{status === 'pending' ? 'Waiting for the requested scene. Teaching time is paused.' : status === 'failed' ? 'The requested scene is unavailable. Retry or choose another shot.' : reduced ? 'Reduced motion: inspect still frames with the slider.' : playing ? 'Playing the synthetic passage.' : 'Paused. Seek in either direction.'}</p>{status === 'failed' && <button onClick={() => requestFrame(pendingTime!)}>Retry scene</button>}</fieldset>
        <fieldset disabled={failed}><legend>Shots</legend><div className="profile-options">{SHOTS.map((id, index) => <button key={id} aria-pressed={shot.id === id} onClick={() => requestFrame(index * 4)}>{id === 'overview' ? 'Overview shot' : id === 'junction' ? 'Junction shot' : 'Inside shot'}</button>)}</div></fieldset>
        <fieldset disabled={failed}><legend>Inspect</legend><button className="turntable-button" onClick={() => { setView(null); send({ type: 'inspect' }) }}>Inspect freely</button><button className="reset-button" onClick={() => { setView(null); send({ type: 'return' }) }}>Return to journey</button><div className="profile-options">{(Object.keys(VIEWS) as View[]).map(id => <button key={id} aria-pressed={view === id} onClick={() => { send({ type: 'inspect' }); setView(id) }}>{id[0]!.toUpperCase() + id.slice(1)}</button>)}</div><label className="check-row">Wireframe<input type="checkbox" checked={wireframe} onChange={e => { send({ type: 'pause' }); setWireframe(e.target.checked) }} /></label></fieldset>
        <fieldset disabled={failed}><legend>Detail</legend><div className="segmented">{(['low', 'high'] as const).map(level => <button key={level} aria-pressed={quality === level} onClick={() => setQuality(level)}>{level === 'low' ? 'Low' : 'High'}</button>)}</div><p>{FLOW_COUNTS[quality]} stable identities. Branch allocation is illustrative.</p></fieldset>
        <label className="check-row">Text mode<input type="checkbox" checked={text} onChange={e => send({ type: 'text', value: e.target.checked })} /></label>
      </aside>
    </main><footer className="study-footer"><span>Local development only · excluded from the public app</span><span>Synthetic geometry · no clinical approval</span></footer>
  </div>
}
