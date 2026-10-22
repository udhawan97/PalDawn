import { BufferAttribute, BufferGeometry } from 'three'

export const PACK_LIMITS = Object.freeze({ manifestBytes: 65_536, assetBytes: 65_536, vertices: 4096, triangles: 8192, residentBytes: 524_288, textureBytes: 0, timeoutMs: 5000 })
export type PackLOD = 'low' | 'high'
type Point = [number, number, number]
type Bounds = [Point, Point]
export interface PackAsset { id: string; byteLength: number; sha256: string; geometryBytes: number; vertices: number; triangles: number; bounds: Bounds; sourceIds: string[] }
export interface PackScene { id: string; title: string; lods: Record<PackLOD, string>; neighbors: string[]; anchorId: string; caption: string; textAlternative: string; reducedMotionAlternative: string }
export interface ScenePack {
  schemaVersion: 1; packId: string; version: string; kind: 'synthetic-mathematical-fixture'; app: { min: string; maxExclusive: string }; units: 'arbitrary'; coordinateFrame: 'right-handed-y-up'; bounds: Bounds
  anchors: { id: string; position: Point }[]; assets: PackAsset[]; scenes: PackScene[]
  budgets: { residentBytes: number; textureBytes: 0 }; sources: { id: string; creator: string; license: 'MIT'; editableSource: string; sha256: string; lineage: string; changes: string }[]
  attribution: string; review: { status: 'not_applicable'; scope: 'synthetic-engineering-only'; reviewer: null }
}
export interface PackCatalog { manifestUrl: string; manifestBytes: number; manifestSha256: string; assets: Readonly<Record<string, string>> }
export interface ActivePackScene { sceneId: string; assetId: string; lod: PackLOD; scene: PackScene }
export interface PackSnapshot { status: 'idle' | 'loading' | 'ready' | 'failed'; active: ActivePackScene | null; error: string; residentBytes: number; reservedBytes: number; peakBytes: number; pending: number; cachedIds: string[]; requestId: number }
const id = (v: unknown) => typeof v === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(v)
const digest = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v)
const text = (v: unknown, max = 600) => typeof v === 'string' && v.trim().length > 0 && v.length <= max
const integer = (v: unknown, min: number, max: number) => Number.isSafeInteger(v) && Number(v) >= min && Number(v) <= max
function check(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message) }
function object(v: unknown): Record<string, unknown> { check(v !== null && typeof v === 'object' && !Array.isArray(v), 'Expected a manifest object'); return v as Record<string, unknown> }
function keys(v: unknown, expected: string[]) { const o = object(v); check(Object.keys(o).sort().join('|') === [...expected].sort().join('|'), 'Unknown or missing manifest fields'); return o }
function list(v: unknown, max: number) { check(Array.isArray(v) && v.length > 0 && v.length <= max, 'Invalid manifest list'); return v as unknown[] }
function unique(values: unknown[]) { check(new Set(values).size === values.length && values.every(id), 'Duplicate or invalid ID') }
function point(v: unknown): asserts v is Point { check(Array.isArray(v) && v.length === 3 && v.every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 100), 'Invalid coordinate') }
function bounds(v: unknown): asserts v is Bounds { check(Array.isArray(v) && v.length === 2, 'Invalid bounds'); point(v[0]); point(v[1]); check(v[0].every((n, i) => n < v[1][i]), 'Empty bounds') }
const contains = (b: Bounds, p: Point) => p.every((n, i) => n >= b[0][i] && n <= b[1][i])
function version(v: unknown) { check(typeof v === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(v), 'Invalid app or pack version'); const parts = v.split('.').map(Number); check(parts.every(n => Number.isSafeInteger(n) && n <= 9999), 'Version exceeds supported range'); return parts }
function compare(a: number[], b: number[]) { for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i]! - b[i]!; return 0 }

// This runtime contract deliberately cannot admit anatomical content or proposal dossiers.
export function validateScenePack(input: unknown, appVersion: string, catalog: PackCatalog): ScenePack {
  const p = keys(input, ['schemaVersion', 'packId', 'version', 'kind', 'app', 'units', 'coordinateFrame', 'bounds', 'anchors', 'assets', 'scenes', 'budgets', 'sources', 'attribution', 'review'])
  check(p.schemaVersion === 1 && p.kind === 'synthetic-mathematical-fixture', 'Unsupported scene-pack schema or scope')
  version(p.version); check(typeof p.packId === 'string' && p.packId === `paldawn-synthetic-primitives@${p.version}`, 'Pack identity is not immutable')
  const compatibility = keys(p.app, ['min', 'maxExclusive']), min = version(compatibility.min), max = version(compatibility.maxExclusive), app = version(appVersion)
  check(compare(min, max) < 0 && compare(app, min) >= 0 && compare(app, max) < 0, 'Scene pack is incompatible with this app')
  check(p.units === 'arbitrary' && p.coordinateFrame === 'right-handed-y-up', 'Unsupported units or coordinate frame'); bounds(p.bounds)
  const budget = keys(p.budgets, ['residentBytes', 'textureBytes'])
  check(integer(budget.residentBytes, 1, PACK_LIMITS.residentBytes) && budget.textureBytes === 0, 'Unsupported residency or texture budget')
  const review = keys(p.review, ['status', 'scope', 'reviewer'])
  check(review.status === 'not_applicable' && review.scope === 'synthetic-engineering-only' && review.reviewer === null, 'Synthetic integrity is not medical approval')
  check(text(p.attribution), 'Attribution is required')
  const sources = list(p.sources, 8).map(s => keys(s, ['id', 'creator', 'license', 'editableSource', 'sha256', 'lineage', 'changes']))
  unique(sources.map(s => s.id))
  for (const s of sources) check(text(s.creator, 160) && s.license === 'MIT' && typeof s.editableSource === 'string' && /^app\/graphics\/[a-zA-Z0-9/-]+\.mjs$/.test(s.editableSource) && !s.editableSource.includes('..') && digest(s.sha256) && text(s.lineage) && text(s.changes), 'Unresolved synthetic source/attribution')
  const anchors = list(p.anchors, 16).map(a => keys(a, ['id', 'position'])); unique(anchors.map(a => a.id))
  for (const a of anchors) { point(a.position); check(contains(p.bounds, a.position), 'Anchor outside pack bounds') }
  const assets = list(p.assets, 12).map(a => keys(a, ['id', 'byteLength', 'sha256', 'geometryBytes', 'vertices', 'triangles', 'bounds', 'sourceIds'])); unique(assets.map(a => a.id))
  check(Object.keys(catalog.assets).sort().join('|') === assets.map(a => a.id).sort().join('|'), 'Asset catalog does not match manifest IDs')
  for (const a of assets) {
    check(integer(a.vertices, 3, PACK_LIMITS.vertices) && integer(a.triangles, 1, PACK_LIMITS.triangles), 'LOD geometry ceiling exceeded')
    check(a.byteLength === 16 + Number(a.vertices) * 12 + Number(a.triangles) * 12 && integer(a.byteLength, 1, PACK_LIMITS.assetBytes), 'Invalid asset byte budget')
    check(a.geometryBytes === Number(a.vertices) * 24 + Number(a.triangles) * 12 && digest(a.sha256), 'Invalid geometry allocation or digest'); bounds(a.bounds)
    check(contains(p.bounds, a.bounds[0]) && contains(p.bounds, a.bounds[1]), 'Asset outside pack bounds')
    const refs = list(a.sourceIds, 8); unique(refs); check(refs.every(ref => sources.some(s => s.id === ref)), 'Unknown asset source')
  }
  const scenes = list(p.scenes, 8).map(s => keys(s, ['id', 'title', 'lods', 'neighbors', 'anchorId', 'caption', 'textAlternative', 'reducedMotionAlternative'])); unique(scenes.map(s => s.id))
  for (const s of scenes) {
    check(text(s.title, 80) && text(s.caption) && text(s.textAlternative) && text(s.reducedMotionAlternative), 'Scene alternatives are required')
    const lods = keys(s.lods, ['low', 'high']); check(Object.values(lods).every(ref => assets.some(a => a.id === ref)), 'Unknown scene LOD asset')
    check(anchors.some(a => a.id === s.anchorId), 'Unknown scene anchor')
    check(Array.isArray(s.neighbors) && s.neighbors.length <= 2, 'Too many transition neighbors'); unique(s.neighbors)
    check(s.neighbors.every(ref => ref !== s.id && scenes.some(other => other.id === ref)), 'Unknown transition neighbor')
    const needed = new Set([s, ...s.neighbors.map(ref => scenes.find(other => other.id === ref)!)].flatMap(other => Object.values(object(other.lods))))
    const worst = catalog.manifestBytes + Math.max(...assets.map(a => 2 * Number(a.geometryBytes))) + [...needed].reduce<number>((sum, ref) => { const a = assets.find(value => value.id === ref)!; return sum + 2 * Number(a.byteLength) + 2 * Number(a.geometryBytes) }, 0)
    check(worst <= Number(budget.residentBytes), 'Transient neighborhood exceeds residency budget')
  }
  // Copy and freeze so a caller cannot change validated references during asynchronous loading.
  const copy = structuredClone(input) as ScenePack
  const freeze = (v: object) => { for (const item of Object.values(v)) if (item && typeof item === 'object') freeze(item); Object.freeze(v) }; freeze(copy)
  return copy
}

export async function sha256(bytes: Uint8Array) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer))].map(n => n.toString(16).padStart(2, '0')).join('') }
const abortError = () => new DOMException('Superseded or stopped scene request', 'AbortError')
function safeURL(value: string, origin: string) { const url = new URL(value, origin); check(url.origin === new URL(origin).origin && ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.hash && !url.search, 'Only compiled same-origin pack URLs are allowed'); return url.href }
export type PackFetch = (url: string, options: RequestInit) => Promise<Response>
async function readBytes(url: string, length: number, signal: AbortSignal, fetcher: PackFetch) {
  const response = await fetcher(url, { signal, credentials: 'omit', redirect: 'error', cache: 'no-store' }).catch(error => { throw signal.aborted ? signal.reason ?? abortError() : error })
  check(response.ok && !response.redirected && (!response.url || response.url === url), 'Scene bytes unavailable or redirected')
  const declared = response.headers.get('content-length'); check(declared === null || (/^\d+$/.test(declared) && Number(declared) === length), 'Unexpected response size')
  check(response.body, 'Scene response has no body'); const reader = response.body.getReader(), chunks: Uint8Array[] = []; let total = 0
  const cancel = () => { void reader.cancel(signal.reason).catch(() => {}) }; signal.addEventListener('abort', cancel, { once: true })
  try {
    while (true) { if (signal.aborted) throw signal.reason ?? abortError(); const item = await reader.read(); if (signal.aborted) throw signal.reason ?? abortError(); if (item.done) break; total += item.value.byteLength; check(total <= length, 'Scene stream exceeds byte ceiling'); chunks.push(item.value) }
    check(total === length && !signal.aborted, 'Missing or superseded scene bytes'); const bytes = new Uint8Array(total); let cursor = 0; for (const chunk of chunks) { bytes.set(chunk, cursor); cursor += chunk.length }; return bytes
  } catch (error) { throw signal.aborted ? signal.reason ?? abortError() : error } finally { signal.removeEventListener('abort', cancel); await reader.cancel().catch(() => {}); reader.releaseLock() }
}

export function decodePackMesh(bytes: Uint8Array, asset: PackAsset): BufferGeometry {
  check(bytes.byteLength === asset.byteLength, 'Mesh byte length mismatch'); const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  check(new TextDecoder().decode(bytes.subarray(0, 8)) === 'PDMSH001' && view.getUint32(8, true) === asset.vertices && view.getUint32(12, true) === asset.triangles * 3, 'Unsupported mesh header')
  const positions = new Float32Array(asset.vertices * 3), indices = new Uint32Array(asset.triangles * 3)
  for (let i = 0; i < positions.length; i++) { const n = view.getFloat32(16 + i * 4, true); check(Number.isFinite(n) && n >= asset.bounds[0][i % 3]! && n <= asset.bounds[1][i % 3]!, 'Mesh vertex outside declared bounds'); positions[i] = n }
  const offset = 16 + positions.byteLength
  for (let i = 0; i < indices.length; i++) { const n = view.getUint32(offset + i * 4, true); check(n < asset.vertices, 'Mesh index outside vertex range'); indices[i] = n }
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i]! * 3, b = indices[i + 1]! * 3, c = indices[i + 2]! * 3
    const u = [0, 1, 2].map(k => positions[b + k]! - positions[a + k]!), v = [0, 1, 2].map(k => positions[c + k]! - positions[a + k]!)
    const area = (u[1]! * v[2]! - u[2]! * v[1]!) ** 2 + (u[2]! * v[0]! - u[0]! * v[2]!) ** 2 + (u[0]! * v[1]! - u[1]! * v[0]!) ** 2
    check(area > 1e-12, 'Degenerate mesh triangle')
  }
  const geometry = new BufferGeometry()
  try {
    geometry.setAttribute('position', new BufferAttribute(positions, 3)); geometry.setIndex(new BufferAttribute(indices, 1)); geometry.computeVertexNormals(); geometry.computeBoundingBox()
    const actual = positions.byteLength + indices.byteLength + geometry.getAttribute('normal').array.byteLength
    check(actual === asset.geometryBytes, 'Decoded allocation differs from manifest')
    for (const n of geometry.getAttribute('normal').array) check(Number.isFinite(n), 'Invalid mesh normals')
    return geometry
  } catch (error) { geometry.dispose(); throw error }
}

export class ScenePackLoader {
  readonly manifest: ScenePack
  private readonly catalog: PackCatalog
  private rawManifest: Uint8Array
  private readonly fetcher: PackFetch
  private readonly present: (active: ActivePackScene, geometry: BufferGeometry) => void
  private readonly changed: (snapshot: PackSnapshot) => void
  private readonly cache = new Map<string, BufferGeometry>()
  private readonly pending = new Map<AbortController, number>()
  private readonly running = new Set<Promise<BufferGeometry>>()
  private generation = 0
  private destroyed = false
  private active: ActivePackScene | null = null
  private status: PackSnapshot['status'] = 'idle'
  private error = ''
  private peak = 0
  private readonly origin: string
  private constructor(manifest: ScenePack, catalog: PackCatalog, raw: Uint8Array, origin: string, present: ScenePackLoader['present'], changed: ScenePackLoader['changed'], fetcher: PackFetch) {
    this.manifest = manifest; this.catalog = Object.freeze({ ...catalog, assets: Object.freeze({ ...catalog.assets }) }); this.rawManifest = raw; this.origin = origin; this.present = present; this.changed = changed; this.fetcher = fetcher; this.peak = 2 * raw.byteLength; this.updatePeak()
  }
  static async open(catalog: PackCatalog, appVersion: string, origin: string, signal: AbortSignal, present: ScenePackLoader['present'], changed: ScenePackLoader['changed'], fetcher: PackFetch = fetch) {
    check(integer(catalog.manifestBytes, 1, PACK_LIMITS.manifestBytes) && digest(catalog.manifestSha256), 'Invalid trusted manifest descriptor')
    const trusted = { ...catalog, assets: { ...catalog.assets } }; const url = safeURL(trusted.manifestUrl, origin)
    for (const value of Object.values(trusted.assets)) safeURL(value, origin)
    const controller = new AbortController(), stop = () => controller.abort(signal.reason ?? abortError()); signal.addEventListener('abort', stop, { once: true }); if (signal.aborted) stop()
    const timer = setTimeout(() => controller.abort(new Error('Scene manifest timed out')), PACK_LIMITS.timeoutMs)
    try {
      const bytes = await readBytes(url, trusted.manifestBytes, controller.signal, fetcher); check(await sha256(bytes) === trusted.manifestSha256, 'Scene manifest digest mismatch'); if (controller.signal.aborted) throw controller.signal.reason
      const manifest = validateScenePack(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), appVersion, trusted)
      check(2 * bytes.byteLength <= manifest.budgets.residentBytes, 'Manifest stream exceeds aggregate budget')
      return new ScenePackLoader(manifest, trusted, bytes, origin, present, changed, fetcher)
    } finally { clearTimeout(timer); signal.removeEventListener('abort', stop) }
  }
  snapshot(): PackSnapshot {
    const residentBytes = this.rawManifest.byteLength + [...this.cache.keys()].reduce((sum, id) => sum + 2 * this.manifest.assets.find(a => a.id === id)!.geometryBytes, 0)
    const reservedBytes = [...this.pending.values()].reduce((sum, n) => sum + n, 0)
    return { status: this.status, active: this.active, error: this.error, residentBytes, reservedBytes, peakBytes: this.peak, pending: this.pending.size, cachedIds: [...this.cache.keys()].sort(), requestId: this.generation }
  }
  private updatePeak() { const s = this.snapshot(); check(s.residentBytes + s.reservedBytes <= this.manifest.budgets.residentBytes, 'Tracked scene residency ceiling exceeded'); this.peak = Math.max(this.peak, s.residentBytes + s.reservedBytes) }
  private notify() { this.updatePeak(); if (!this.destroyed) this.changed(this.snapshot()) }
  private prune(keep: Set<string>) { for (const [id, geometry] of this.cache) if (!keep.has(id)) { this.cache.delete(id); geometry.dispose() } }
  private stop() { for (const controller of this.pending.keys()) controller.abort(abortError()) }
  private async asset(id: string, generation: number) {
    const cached = this.cache.get(id); if (cached) return cached
    const asset = this.manifest.assets.find(a => a.id === id)!, controller = new AbortController(), reservation = 2 * asset.byteLength + 2 * asset.geometryBytes
    const s = this.snapshot(); check(s.residentBytes + s.reservedBytes + reservation <= this.manifest.budgets.residentBytes, 'Earlier scene requests still hold the residency budget; retry after they settle')
    this.pending.set(controller, reservation); this.notify()
    const timer = setTimeout(() => controller.abort(new Error('Scene asset timed out')), PACK_LIMITS.timeoutMs); let geometry: BufferGeometry | undefined
    const current = () => { if (this.destroyed || generation !== this.generation || controller.signal.aborted) throw controller.signal.reason ?? abortError() }
    try {
      const bytes = await readBytes(safeURL(this.catalog.assets[id]!, this.origin), asset.byteLength, controller.signal, this.fetcher); current()
      check(await sha256(bytes) === asset.sha256, 'Scene asset digest mismatch'); current(); geometry = decodePackMesh(bytes, asset); current()
      // Reservation remains charged until transfer into resident cache; no await between them.
      this.pending.delete(controller); this.cache.set(id, geometry); geometry = undefined; this.notify(); return this.cache.get(id)!
    } finally { clearTimeout(timer); geometry?.dispose(); this.pending.delete(controller); this.notify() }
  }
  async select(sceneId: string, lod: PackLOD): Promise<void> {
    check(!this.destroyed, 'Scene loader is closed'); const scene = this.manifest.scenes.find(s => s.id === sceneId); check(scene && (lod === 'low' || lod === 'high'), 'Unknown scene or LOD')
    const generation = ++this.generation; this.stop(); this.status = 'loading'; this.error = ''
    const target = scene.lods[lod], needed = new Set([target, ...scene.neighbors.map(id => this.manifest.scenes.find(s => s.id === id)!.lods[lod])])
    this.prune(new Set([...needed, ...(this.active ? [this.active.assetId] : [])])); this.notify()
    const jobs = [...needed].map(id => this.asset(id, generation)), settled = Promise.allSettled(jobs)
    for (const job of jobs) { this.running.add(job); void job.then(() => this.running.delete(job), () => this.running.delete(job)) }
    try {
      const geometry = await jobs[0]!; if (this.destroyed || generation !== this.generation) return
      const active = Object.freeze({ sceneId, assetId: target, lod, scene }); this.present(active, geometry)
      if (this.destroyed || generation !== this.generation) return
      this.active = active; this.status = 'ready'; this.prune(needed); this.notify()
    } catch (error) { if (!this.destroyed && generation === this.generation) { this.status = 'failed'; this.error = error instanceof Error ? error.message : 'Scene load failed'; this.notify() } }
    finally { await settled; if (!this.destroyed && generation === this.generation) { if (this.status === 'failed') this.prune(new Set(this.active ? [this.active.assetId] : [])); this.notify() } }
  }
  destroy(): Promise<void> { if (!this.destroyed) { this.destroyed = true; ++this.generation; this.stop(); this.prune(new Set()); this.rawManifest = new Uint8Array(); this.active = null }; return Promise.allSettled([...this.running]).then(() => undefined) }
}
