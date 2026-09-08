import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { buildMeshes, encodeGLB } from './mesh-builder.mjs'

const root=new URL('../../content/graphics/heart-study/',import.meta.url)
const source=readFileSync(new URL('source.json',root))
const sha=b=>createHash('sha256').update(b).digest('hex')
const spec=JSON.parse(source)
const meshes=buildMeshes(spec)
const output=encodeGLB(meshes,{id:spec.id,review:spec.review,units:spec.units,license:spec.license})
const manifest={
  id:spec.id,asset:'heart-study.glb',status:spec.status,publicationEligible:false,
  creator:spec.creator,license:spec.license,sourceSha256:sha(source),assetSha256:sha(output),
  generatorSha256:sha(readFileSync(new URL('mesh-builder.mjs',import.meta.url))),
  bytes:output.length,units:spec.units,review:spec.review,
  parts:meshes.map(({name,geometry,group})=>({name,group,vertices:geometry.getAttribute('position').count,triangles:geometry.index.count/3})),
  absent:['reviewed anatomical accuracy','chamber interiors','valves','validated coronary topology','blood flow','physiological deformation','complete thorax','patient measurements'],
}
writeFileSync(new URL('heart-study.glb',root),output)
writeFileSync(new URL('manifest.json',root),JSON.stringify(manifest,null,2)+'\n')
for (const {geometry} of meshes) geometry.dispose()
console.log(`Heart study: ${meshes.length} mesh parts, ${manifest.parts.reduce((n,p)=>n+p.triangles,0)} triangles, ${output.length} bytes; unreviewed artwork.`)
