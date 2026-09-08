import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { InstancedBufferAttribute, InstancedBufferGeometry, MeshStandardMaterial, PerspectiveCamera, Vector3 } from 'three'
import { fitStudyCamera } from './cameraFit'
import { SceneBoundary } from './SceneBoundary'
import { FLOW, FLOW_COUNTS, FLOW_VIEW, cellGeometry, cellSeeds, flowBounds, flowShader, wallGeometry, type FlowQuality } from './flowModel'

function FlowScene({ time, quality, reset, onFailure, onPresented }: {
  time: number; quality: FlowQuality; reset: number; onFailure: () => void; onPresented: (time: number) => void
}) {
  const { camera, size, gl, invalidate } = useThree()
  const [resources] = useState(() => {
    const base = cellGeometry()
    const cells = new InstancedBufferGeometry()
    cells.index = base.index
    cells.attributes = base.attributes
    cells.setAttribute('flowSeed', new InstancedBufferAttribute(new Float32Array(cellSeeds(FLOW_COUNTS.high).flat()), 4))
    const clock = { value: 0 }
    const material = new MeshStandardMaterial({ color: '#ae3934', roughness: .49, metalness: 0 })
    material.onBeforeCompile = shader => {
      shader.uniforms.studyTime = clock
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n' + flowShader)
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = flowBasis() * objectNormal;')
        .replace('#include <begin_vertex>', 'vec3 transformed = flowCenter() + flowBasis() * position * flowScale();')
    }
    const wall = wallGeometry(), bounds = flowBounds(wall)
    return { cells, material, clock, wall, bounds, target: bounds.getCenter(new Vector3()), wallMaterial: new MeshStandardMaterial({ color: '#bb8070', roughness: .72 }) }
  })
  useEffect(() => () => { resources.cells.dispose(); resources.material.dispose(); resources.wall.dispose(); resources.wallMaterial.dispose() }, [resources])
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onFailure() }
    gl.domElement.addEventListener('webglcontextlost', lost)
    return () => gl.domElement.removeEventListener('webglcontextlost', lost)
  }, [gl, onFailure])
  useLayoutEffect(() => {
    resources.clock.value = time
    resources.cells.instanceCount = FLOW_COUNTS[quality]
    invalidate()
  }, [resources, time, quality, invalidate])
  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return
    const fit = fitStudyCamera(resources.bounds, size.width / Math.max(1, size.height), FLOW_VIEW, camera.fov)
    camera.position.copy(fit.position)
    camera.lookAt(fit.target)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, size, reset, resources, invalidate])
  return <>
    <color attach="background" args={['#263030']} />
    <ambientLight intensity={1.6} />
    <directionalLight position={[0, 6, 4]} intensity={3} />
    <directionalLight position={[-4, 2, -2]} intensity={1.5} color="#dcc5b2" />
    <mesh geometry={resources.wall} material={resources.wallMaterial} dispose={null} />
    <mesh geometry={resources.cells} material={resources.material} dispose={null} frustumCulled={false} onAfterRender={() => onPresented(time)} />
    <OrbitControls key={reset} target={resources.target} enablePan={false} enableDamping={false} minDistance={5} maxDistance={100} minPolarAngle={.15} maxPolarAngle={Math.PI * .49} />
  </>
}

export function FlowWorkbench() {
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [quality, setQuality] = useState<FlowQuality>('high')
  const [reset, setReset] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)
  const [presented, setPresented] = useState(-1)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const playhead = useRef(0)
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => { setReduced(media.matches); if (media.matches) setPlaying(false) }
    const visibility = () => { if (document.hidden) setPlaying(false) }
    media.addEventListener('change', change)
    document.addEventListener('visibilitychange', visibility)
    return () => { media.removeEventListener('change', change); document.removeEventListener('visibilitychange', visibility) }
  }, [])
  useEffect(() => {
    if (!playing || reduced || failed) return
    let last: number | null = null, request = 0
    const tick = (now: number) => {
      if (last !== null) playhead.current = Math.min(FLOW.duration, playhead.current + (now - last) / 1000)
      last = now
      setTime(playhead.current)
      if (playhead.current >= FLOW.duration) setPlaying(false)
      else request = requestAnimationFrame(tick)
    }
    request = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(request)
  }, [playing, reduced, failed])
  const seek = (value: number) => { setPlaying(false); playhead.current = value; setTime(value) }
  const failure = () => { setPlaying(false); setFailed(true) }
  return <div className="workbench">
    <a className="skip-link" href="#flow-controls">Skip to flow controls</a>
    <header className="masthead"><a className="wordmark" href="./heart-study.html">PalDawn<span> / FORM LAB</span></a><span className="edition">GRAPHICS REBUILD · STUDY 002</span><span className="status-tag">Synthetic flow fixture</span></header>
    <main className="study-layout">
      <section className="study-introduction" aria-labelledby="flow-title">
        <p className="eyebrow">INSIDE THE CURVE</p><h1 id="flow-title">Space.<br /><em>Then motion.</em></h1>
        <p className="lede">Inspect three-dimensional cell-shaped forms moving through a curved, open wall. One clock determines every position.</p>
        <div className="study-number" aria-hidden="true">02<span> / FLOW</span></div>
        <p className="boundary">Synthetic engineering fixture, not blood physiology or an anatomical vessel. Arbitrary units, density, shape and speed. The upper half is intentionally removed for inspection.</p>
        <p className="boundary"><a href="./heart-study.html">Return to the heart study</a></p>
      </section>
      <section className="specimen" aria-label="Interactive flow study" data-renderer={failed ? 'unavailable' : presented === time ? 'ready' : 'loading'} data-time={time.toFixed(3)} data-quality={quality}>
        <div className="specimen-topline"><span>CURVED CUTAWAY</span><span>ARBITRARY STUDY UNITS</span></div>
        <div className="canvas-stage">
          {!failed ? <SceneBoundary key={attempt} onFailure={failure}><Canvas aria-hidden="true" frameloop="demand" dpr={[1, 1.75]} camera={{ fov: 34, near: .05, far: 100 }} gl={{ antialias: true }}>
            <FlowScene time={time} quality={quality} reset={reset} onFailure={failure} onPresented={setPresented} />
          </Canvas></SceneBoundary> : <div className="scene-message" role="alert"><h2>The flow view is unavailable.</h2><p>The explanation remains available. Retry to restore the paused frame.</p><button onClick={() => { setPresented(-1); setAttempt(n => n + 1); setFailed(false) }}>Retry flow view</button></div>}
        </div>
        <p className="canvas-caption">Drag to inspect · scroll to zoom. Cells enter and leave once; they never wrap around.</p>
      </section>
      <aside className="study-controls" id="flow-controls" aria-label="Flow controls" tabIndex={-1}>
        <p className="eyebrow">A REPEATABLE PASSAGE</p>
        <fieldset disabled={failed}><legend>Playback</legend>
          <label className="zoom-label" htmlFor="flow-time">Study time <output>{time.toFixed(1)} / {FLOW.duration} s</output></label>
          <input className="flow-time" id="flow-time" aria-label="Study time" type="range" min="0" max={FLOW.duration} step="0.1" value={time} onChange={e => seek(Number(e.target.value))} />
          <button className="turntable-button" disabled={reduced || time >= FLOW.duration} onClick={() => setPlaying(v => !v)}>{playing ? 'Pause flow' : 'Play flow'}</button>
          <button className="reset-button" onClick={() => seek(0)}>Restart passage</button>
          <p role="status">{reduced ? 'Reduced motion: use the time slider for still frames.' : time >= FLOW.duration ? 'Passage complete. Restart or seek to inspect.' : playing ? 'Playing the synthetic passage.' : 'Paused. Seek in either direction to inspect.'}</p>
        </fieldset>
        <fieldset disabled={failed}><legend>Detail</legend><div className="segmented">{(['low', 'high'] as const).map(level => <button key={level} aria-pressed={quality === level} onClick={() => setQuality(level)}>{level === 'low' ? 'Low' : 'High'}</button>)}</div><p>{FLOW_COUNTS[quality]} seeded fixtures. Density is illustrative, not measured concentration.</p><button className="reset-button" onClick={() => setReset(n => n + 1)}>Reset camera</button></fieldset>
        <div className="coverage"><p className="eyebrow">ENGINEERING SCOPE</p><ul><li>3D cell-shaped geometry</li><li>Full-extent wall clearance</li><li>Repeatable seeded positions</li><li>One finite passage</li></ul><p>Missing: branches, varying radii, exterior continuity, reviewed cell shape and scale, and physiological motion. Performance targets remain unmeasured.</p></div>
      </aside>
    </main>
    <footer className="study-footer"><span>Local development only · excluded from the public app</span><span>No anatomical or clinical approval</span></footer>
  </div>
}
