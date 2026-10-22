import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BufferGeometry } from 'three'
import { createPackFixtures } from './pack-fixtures.mjs'
import { PACK_LIMITS, ScenePackLoader, validateScenePack, decodePackMesh, sha256 } from './scenePack.ts'

const fixture = createPackFixtures(), origin = 'http://127.0.0.1:49111/'
const manifestBytes = fixture.files['scene-pack.json']
const catalog = { manifestUrl: origin+'scene-pack.json', manifestBytes: manifestBytes.length, manifestSha256: await sha256(manifestBytes), assets: Object.fromEntries(fixture.manifest.assets.map(a => [a.id,origin+a.id+'.mesh'])) }
for (const [name,bytes] of Object.entries(fixture.files)) assert.deepEqual(readFileSync(new URL('./fixtures/'+name,import.meta.url)),bytes,'Generated fixture is stale: '+name)
assert.equal(readFileSync(new URL('./packCatalog.ts',import.meta.url),'utf8'),fixture.catalog,'Trusted catalog is stale')
const clone = () => structuredClone(fixture.manifest)
const valid = validateScenePack(clone(),'0.6.2',catalog)
assert(Object.isFrozen(valid.scenes[0].lods));assert.equal(valid.review.reviewer,null)
const mutations = [
 p=>p.schemaVersion=2,p=>p.packId='mutable',p=>p.kind='anatomical',p=>p.version='1.0',p=>p.app.min='0.7.0',p=>p.app.maxExclusive='0.6.2',p=>p.app.min='99999999999999.0.0',
 p=>p.units='metres',p=>p.coordinateFrame='anatomical',p=>p.bounds[0][0]=NaN,p=>p.bounds[1]=p.bounds[0],p=>p.anchors[0].position=[5,0,0],p=>p.anchors.push(p.anchors[0]),
 p=>p.assets.push(p.assets[0]),p=>p.assets[0].sourceIds=['unknown'],p=>p.assets[0].sha256='missing',p=>p.assets[0].geometryBytes++,p=>p.assets[0].byteLength++,p=>p.assets[0].vertices=5000,
 p=>p.assets[0].bounds=[[-2,-1,-1],[1,1,1]],p=>p.scenes[0].lods.low='unknown',p=>p.scenes[0].neighbors=['unknown'],p=>p.scenes[0].neighbors=['block'],p=>p.scenes[0].neighbors=['wedge','wedge'],p=>p.scenes[0].anchorId='missing',p=>p.scenes.push(p.scenes[0]),
 p=>p.scenes[0].textAlternative='',p=>delete p.scenes[0].reducedMotionAlternative,p=>p.budgets.residentBytes=100,p=>p.budgets.residentBytes=PACK_LIMITS.residentBytes+1,p=>p.budgets.textureBytes=1,
 p=>p.review.status='approved',p=>p.review.reviewer='Invented reviewer',p=>p.sources[0].license='UNKNOWN',p=>p.sources[0].editableSource='../../secret.mjs',p=>p.sources[0].sha256='',p=>p.attribution='',p=>p.url='https://remote.invalid/pack',
]
for (const mutate of mutations) { const p=clone();mutate(p);assert.throws(()=>validateScenePack(p,'0.6.2',catalog)) }
assert.throws(()=>validateScenePack(clone(),'0.6.2',{...catalog,assets:{...catalog.assets,unknown:origin+'unknown'}}))
let disposals=0;const disposed=new WeakSet(), originalDispose=BufferGeometry.prototype.dispose
BufferGeometry.prototype.dispose=function(){assert(!disposed.has(this),'Geometry disposed twice');disposed.add(this);disposals++;originalDispose.call(this)}
const response = bytes => new Response(new Uint8Array(bytes),{status:200})
const realBytes = url => fixture.files[new URL(url).pathname.slice(1)]
const changes=[], presented=[]
const open = (fetcher=async url=>response(realBytes(url)),present=(active,geometry)=>presented.push({active,geometry})) => ScenePackLoader.open(catalog,'0.6.2',origin,new AbortController().signal,present,s=>{assert(s.residentBytes+s.reservedBytes<=PACK_LIMITS.residentBytes);changes.push(s)},fetcher)
try {
 for (const asset of valid.assets) { const bytes=fixture.files[asset.id+'.mesh'];const geometry=decodePackMesh(bytes,asset);assert.equal(geometry.getAttribute('position').count,asset.vertices);geometry.dispose() }
 const asset=valid.assets[0], bytes=fixture.files[asset.id+'.mesh']
 for (const change of [b=>b[0]=0,b=>new DataView(b.buffer,b.byteOffset,b.byteLength).setFloat32(16,NaN,true),b=>new DataView(b.buffer,b.byteOffset,b.byteLength).setUint32(16+asset.vertices*12,asset.vertices,true),b=>new DataView(b.buffer,b.byteOffset,b.byteLength).setUint32(20+asset.vertices*12,0,true)]) {const bad=Buffer.from(bytes);change(bad);assert.throws(()=>decodePackMesh(bad,asset))}
 assert.throws(()=>decodePackMesh(bytes.subarray(1),asset))
 const requested=[];const loader=await open(async url=>{requested.push(new URL(url).pathname);return response(realBytes(url))})
 await loader.select('block','high');assert.equal(loader.snapshot().active.sceneId,'block');assert.deepEqual(loader.snapshot().cachedIds,['block-high','wedge-high']);assert(!requested.some(url=>url.includes('octahedron')))
 await loader.select('octahedron','low');assert.equal(loader.snapshot().active.lod,'low');assert.deepEqual(loader.snapshot().cachedIds,['octahedron-low','wedge-low'])
 await assert.rejects(loader.select('missing','low'));await assert.rejects(loader.select('block','medium'));loader.destroy();assert.equal(loader.snapshot().residentBytes,0);assert.equal(loader.snapshot().reservedBytes,0)
 for (const mode of ['digest','short','missing','redirect','header','oversized']) {
  let fail=false;const resources=[];const badLoader=await open(async url=>{if(url.endsWith('scene-pack.json'))return response(manifestBytes);const raw=realBytes(url);if(!fail)return response(raw);if(mode==='missing')return new Response('',{status:404});if(mode==='redirect'){const result=response(raw);Object.defineProperty(result,'redirected',{value:true});return result}if(mode==='header')return new Response(raw,{headers:{'content-length':String(raw.length+1)}});if(mode==='oversized')return response(Buffer.concat([raw,Buffer.from([1])]));if(mode==='short')return response(raw.subarray(0,raw.length-1));const wrong=Buffer.from(raw);wrong[wrong.length-1]^=1;return response(wrong)},(active,geometry)=>resources.push({active,geometry}))
  await badLoader.select('block','high');const previous=badLoader.snapshot().active;fail=true;await badLoader.select('octahedron','low');assert.equal(badLoader.snapshot().status,'failed',mode);assert.equal(badLoader.snapshot().active,previous,mode);assert.equal(resources.length,1,mode);assert.deepEqual(badLoader.snapshot().cachedIds,['block-high']);fail=false;await badLoader.select('octahedron','low');assert.equal(badLoader.snapshot().status,'ready');badLoader.destroy()
 }
 const deferred=[];const late=await open(async(url,options)=>url.endsWith('scene-pack.json')?response(manifestBytes):new Promise(resolve=>deferred.push({url,signal:options.signal,resolve})))
 const first=late.select('block','high');await Promise.resolve();const reserved=late.snapshot().reservedBytes;assert(reserved>0);const second=late.select('octahedron','low');assert(deferred.slice(0,2).every(r=>r.signal.aborted));assert(late.snapshot().reservedBytes>reserved,'Aborted reservations must remain charged until settlement')
 for (const request of deferred)request.resolve(response(realBytes(request.url)));await Promise.all([first,second]);assert.equal(late.snapshot().active.sceneId,'octahedron');assert.equal(late.snapshot().reservedBytes,0);late.destroy()
 const blocked=[];const torn=await open(async(url,options)=>url.endsWith('scene-pack.json')?response(manifestBytes):new Promise(resolve=>blocked.push({url,resolve,signal:options.signal})))
 const unfinished=torn.select('wedge','high');await Promise.resolve();torn.destroy();assert(torn.snapshot().reservedBytes>0);for(const request of blocked)request.resolve(response(realBytes(request.url)));await unfinished;assert.equal(torn.snapshot().residentBytes+torn.snapshot().reservedBytes,0);assert.equal(torn.snapshot().active,null)
 let rejectPresentation=false;const retained=[];const renderFailure=await open(undefined,(active,geometry)=>{if(rejectPresentation)throw Error('Synthetic renderer failure');retained.push({active,geometry})});await renderFailure.select('block','high');rejectPresentation=true;await renderFailure.select('octahedron','low');assert.equal(renderFailure.snapshot().active.sceneId,'block');assert.equal(renderFailure.snapshot().status,'failed');assert.equal(retained.length,1);renderFailure.destroy()
 const timeout=await open(async url=>url.endsWith('scene-pack.json')?response(manifestBytes):new Response(new ReadableStream({start(){}})))
 await timeout.select('block','high');assert.equal(timeout.snapshot().status,'failed');assert.match(timeout.snapshot().error,/timed out/);assert.equal(timeout.snapshot().reservedBytes,0);timeout.destroy()
 await assert.rejects(ScenePackLoader.open({...catalog,manifestUrl:'https://remote.invalid/pack'},'0.6.2',origin,new AbortController().signal,()=>{},()=>{},async()=>{throw Error('Must not fetch')}),/same-origin/)
 await assert.rejects(ScenePackLoader.open({...catalog,manifestSha256:'0'.repeat(64)},'0.6.2',origin,new AbortController().signal,()=>{},()=>{},async()=>response(manifestBytes)),/digest mismatch/)
 const aborted=new AbortController();aborted.abort();await assert.rejects(ScenePackLoader.open(catalog,'0.6.2',origin,aborted.signal,()=>{},()=>{},async()=>response(manifestBytes)))
 console.log(`Scene-pack checks passed: ${mutations.length} malformed manifest cases; exact generated bytes/digests; actual mesh parsing; active+neighbors; stream/redirect/digest rejection; old-scene retention; supersession/reservations/teardown/timeout/presentation rollback; ${disposals} exactly-once geometry disposals; peak tracked payload ${Math.max(...changes.map(s=>s.peakBytes))}/${PACK_LIMITS.residentBytes} bytes.`)
}finally{BufferGeometry.prototype.dispose=originalDispose}
