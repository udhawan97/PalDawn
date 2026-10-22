import { useEffect, useRef, useState } from 'react'
import { Box3, Color, DirectionalLight, DoubleSide, HemisphereLight, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import { fitStudyCamera } from './cameraFit'
import { PACK_CATALOG } from './packCatalog'
import { PACK_LIMITS, ScenePackLoader, type PackLOD, type PackSnapshot } from './scenePack'
import app from '../package.json'

const EMPTY: PackSnapshot = { status: 'idle', active: null, error: '', residentBytes: 0, reservedBytes: 0, peakBytes: 0, pending: 0, cachedIds: [], requestId: 0 }
const SCENES = ['block', 'wedge', 'octahedron'] as const
export function PackWorkbench() {
  const canvas = useRef<HTMLCanvasElement>(null), manager = useRef<ScenePackLoader | null>(null)
  const closing = useRef<Promise<void>>(Promise.resolve())
  const selection = useRef<{ id: string; lod: PackLOD }>({ id: 'block', lod: 'high' })
  const [snapshot, setSnapshot] = useState<PackSnapshot>(EMPTY), [attempt, setAttempt] = useState(0), [text, setText] = useState(false), [unavailable, setUnavailable] = useState(false)
  const [selected, setSelected] = useState(selection.current), [catalogReady, setCatalogReady] = useState(false)
  useEffect(() => {
    if (text) { let live = true; void closing.current.then(() => { if (live) setSnapshot(s => ({ ...s, status: 'ready', residentBytes: 0, reservedBytes: 0, pending: 0, cachedIds: [] })) }); return () => { live = false } }
    const element = canvas.current!
    let live = true, renderer: WebGLRenderer | null = null, loader: ScenePackLoader | null = null, mesh: Mesh | null = null, observer: ResizeObserver | null = null
    const previousClosed = closing.current
    let opening: Promise<void> = Promise.resolve(), failed = false, rendererDisposed = false, materialDisposed = false
    const abort = new AbortController(), scene = new Scene(), camera = new PerspectiveCamera(34, 1, .05, 100)
    const material = new MeshStandardMaterial({ color: '#bd8b77', roughness: .68, metalness: 0, side: DoubleSide })
    scene.background = new Color('#263430'); scene.add(new HemisphereLight('#fff1d9', '#53645e', 2.2)); const light = new DirectionalLight('#fff0d7', 3); light.position.set(4, 6, 7); scene.add(light)
    setUnavailable(false); setCatalogReady(false); setSnapshot(s => ({ ...s, status: 'loading', error: '' }))
    const paint = () => {
      if (!renderer || !mesh || renderer.getContext().isContextLost()) throw new Error('The pack view is unavailable. Use text mode or retry.')
      const rect = element.parentElement!.getBoundingClientRect(); if (rect.width <= 0 || rect.height <= 0) throw new Error('The scene viewport is not ready')
      renderer.setSize(rect.width, rect.height, false); camera.aspect = rect.width / rect.height
      const pose = fitStudyCamera(new Box3().setFromObject(mesh), camera.aspect, 'front'); camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateProjectionMatrix(); renderer.render(scene, camera)
    }
    const disposeMaterial = () => { if (!materialDisposed) { materialDisposed = true; material.dispose() } }
    const disposeRenderer = () => { if (renderer && !rendererDisposed) { rendererDisposed = true; renderer.dispose(); renderer.forceContextLoss() } }
    const lost = (event: Event) => {
      event.preventDefault(); if (!live || failed) return; failed = true; abort.abort()
      const stopped = loader?.destroy() ?? Promise.resolve(); manager.current = null
      disposeMaterial(); disposeRenderer(); scene.clear(); mesh = null; setUnavailable(true)
      const accounting = () => { const state = loader?.snapshot() ?? EMPTY; return { residentBytes: state.residentBytes, reservedBytes: state.reservedBytes, pending: state.pending, cachedIds: state.cachedIds } }
      setSnapshot(s => ({ ...s, ...accounting(), status: 'failed', error: 'The 3D pack view stopped. The last explanation remains available; retry or use text mode.' }))
      void stopped.then(() => { if (live) setSnapshot(s => ({ ...s, ...accounting() })) })
    }
    element.addEventListener('webglcontextlost', lost)
    try {
      renderer = new WebGLRenderer({ canvas: element, antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
      observer = new ResizeObserver(() => { if (mesh && live && !renderer?.getContext().isContextLost()) { try { paint() } catch { lost(new Event('error')) } } }); observer.observe(element.parentElement!)
      opening = previousClosed.then(async () => {
        if (!live || abort.signal.aborted) return
        return ScenePackLoader.open(PACK_CATALOG, app.version, location.origin, abort.signal, (active, geometry) => {
        if (!live || abort.signal.aborted) throw new Error('Pack view is closed')
        const previous = mesh?.geometry
        if (!mesh) { mesh = new Mesh(geometry, material); scene.add(mesh) } else mesh.geometry = geometry
        try { paint() } catch (error) { if (previous) { mesh.geometry = previous; try { paint() } catch { /* Text recovery remains available after context loss. */ } } else { scene.remove(mesh); mesh = null }; throw error }
        // The loader releases the old geometry only after this synchronous draw succeeds.
        void active
      }, state => { if (live) setSnapshot(state) }).then(value => {
        if (!live || abort.signal.aborted) { value.destroy(); return }
        loader = value; manager.current = value; setCatalogReady(true); return value.select(selection.current.id, selection.current.lod)
      })
      }).catch(error => { if (live && !abort.signal.aborted) setSnapshot(s => ({ ...s, status: 'failed', error: error instanceof Error ? error.message : 'Scene pack could not load' })) })
    } catch { setUnavailable(true); setSnapshot(s => ({ ...s, status: 'failed', error: 'The 3D pack view could not start. Text mode is available.' })) }
    return () => {
      live = false; abort.abort(); element.removeEventListener('webglcontextlost', lost); observer?.disconnect(); const stopped = loader?.destroy() ?? Promise.resolve(); closing.current = Promise.allSettled([stopped, opening]).then(() => undefined); if (manager.current === loader) manager.current = null
      disposeMaterial(); disposeRenderer(); scene.clear(); mesh = null
    }
  }, [attempt, text])
  const choose = (id: string, lod: PackLOD) => { const next = { id, lod }; selection.current = next; setSelected(next); if (manager.current) void manager.current.select(id, lod) }
  const retry = () => { if (manager.current && !unavailable) void manager.current.select(selection.current.id, selection.current.lod); else setAttempt(n => n + 1) }
  const active = snapshot.active, showText = text || unavailable || (!snapshot.active && snapshot.status === 'failed'), title = active?.scene.title ?? 'No scene activated', caption = active?.scene.caption ?? 'Choose text mode while the verified mathematical pack is unavailable.'
  return <div className="workbench">
    <a className="skip-link" href="#pack-controls">Skip to pack controls</a>
    <header className="masthead"><a className="wordmark" href="./heart-study.html">PalDawn<span> / FORM LAB</span></a><span className="status-tag">Synthetic scene-pack lab</span></header>
    <main className="study-layout">
      <section className="study-introduction"><p className="eyebrow">VERIFIED BEFORE ACTIVATION</p><h1>One scene.<br /><em>Ready before shown.</em></h1><p className="lede">Switch between three original mathematical shapes. Each mesh is read from digest-checked bytes; the last good scene stays while a replacement loads.</p><p className="boundary">Arbitrary units, right-handed Y-up. Mathematical engineering fixtures, not anatomy. No textures, learner storage or clinical approval.</p><p><a href="./junction-study.html">Return to junction study</a></p></section>
      <section className="specimen" aria-label="Interactive scene pack lab" data-renderer={text ? 'text' : unavailable ? 'unavailable' : active ? 'ready' : 'loading'} data-status={snapshot.status} data-active={active?.sceneId ?? ''} data-lod={active?.lod ?? ''} data-resident={snapshot.residentBytes} data-reserved={snapshot.reservedBytes} data-peak={snapshot.peakBytes} data-pending={snapshot.pending} data-request={snapshot.requestId}>
        <div className="specimen-topline"><span>{title}</span><span>SYNTHETIC / ARBITRARY UNITS</span></div>
        <div className="canvas-stage">
          <canvas key={`${attempt}:${text}`} ref={canvas} aria-hidden="true" style={{ display: showText ? 'none' : 'block', width: '100%', height: '100%' }} />
          {showText ? <div className="scene-message"><h2>{title}</h2><p>{active?.scene.textAlternative ?? caption}</p><p>Static inspection is the reduced-motion alternative. No continuous movement is required.</p></div> : null}
        </div>
        <p className="canvas-caption" aria-live="polite">{caption}</p>
        <details className="scene-notes"><summary>Pack scope and accounting</summary><p>Original mathematical code fixtures, PalDawn contributors, MIT. Schema 1; pack paldawn-synthetic-primitives@1.0.0. Integrity is not medical review.</p><p>At most the active scene and its declared transition neighbors are fetched. The tracked 512 KiB budget includes retained raw manifest bytes, resident CPU/GPU geometry and outstanding stream/decode reservations, including canceled work until settlement. It is not a measurement of browser, JavaScript allocator, canvas or driver memory.</p></details>
      </section>
      <aside className="study-controls" id="pack-controls" aria-label="Scene pack controls" tabIndex={-1}>
        <fieldset disabled={!catalogReady || unavailable || text}><legend>Scene</legend><div className="profile-options">{SCENES.map(id => <button key={id} aria-pressed={selected.id === id} onClick={() => choose(id, selected.lod)}>Load {id}</button>)}</div></fieldset>
        <fieldset disabled={!catalogReady || unavailable || text}><legend>Detail</legend><div className="segmented">{(['low','high'] as const).map(lod => <button key={lod} aria-pressed={selected.lod === lod} onClick={() => choose(selected.id, lod)}>{lod === 'low' ? 'Low detail' : 'High detail'}</button>)}</div><p>Detail changes tessellation, not scene identity.</p></fieldset>
        <fieldset><legend>Readiness</legend><p role="status">{snapshot.status === 'loading' ? 'Loading requested scene. The last good scene and explanation are retained.' : snapshot.status === 'failed' ? `Scene not activated. ${snapshot.error}` : text ? 'Text mode. Scene resources have been released.' : 'Verified scene ready. Static inspection is available.'}</p>{snapshot.status === 'failed' && !text ? <button onClick={retry}>Retry scene pack</button> : null}<label className="check-row">Text mode<input type="checkbox" checked={text} onChange={event => { setText(event.target.checked); if (event.target.checked) setCatalogReady(false) }} /></label></fieldset>
        <details><summary>Tracked payload</summary><p>{snapshot.residentBytes} resident + {snapshot.reservedBytes} reserved bytes. Peak {snapshot.peakBytes} / {PACK_LIMITS.residentBytes}. Geometry outside the selected neighborhood is disposed.</p></details>
      </aside>
    </main><footer className="study-footer"><span>Development only · excluded from the public app</span><span>Synthetic P3 engineering · no clinical approval</span></footer>
  </div>
}
