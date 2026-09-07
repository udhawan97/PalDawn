// Original geometric artwork tools. No external anatomical geometry is sampled.
import { BufferGeometry, Float32BufferAttribute, Color, CatmullRomCurve3, Vector3 } from 'three'

export function shellPoint(sections, t, angle, offset = 0) {
  const n = sections.length - 1
  const f = Math.max(0, Math.min(1, t)) * n
  const i = Math.min(n - 1, Math.floor(f))
  const u = f - i
  const values = Array.from({ length: 5 }, (_, k) => {
    const a = sections[Math.max(0, i - 1)][k]
    const b = sections[i][k]
    const c = sections[i + 1][k]
    const d = sections[Math.min(n, i + 2)][k]
    return 0.5 * ((2*b) + (-a+c)*u + (2*a-5*b+4*c-d)*u*u + (-a+3*b-3*c+d)*u*u*u)
  })
  const [y, x, z, rx, rz] = values
  const frontGroove = Math.exp(-Math.pow((Math.sin(angle) - (0.17 - t*0.24)) / 0.115, 2))
    * Math.pow(Math.max(0, Math.cos(angle)), 6) * Math.sin(Math.PI*t)
  const rearGroove = Math.exp(-Math.pow(Math.sin(angle + 0.2) / 0.16, 2))
    * Math.pow(Math.max(0, -Math.cos(angle)), 6) * Math.sin(Math.PI*t)
  const fold = 1 + 0.018 * Math.sin(angle*3 + t*4) * Math.sin(Math.PI*t)
  const surface = 0.0018 * Math.sin(t*95 + angle*33) * Math.sin(angle*51 - t*73)
  return new Vector3(
    x + (rx*fold + offset + surface) * Math.sin(angle),
    y + 0.022 * Math.sin(angle*2 + t*3) * Math.sin(Math.PI*t),
    z + (rz*fold + offset + surface - 0.055*frontGroove - 0.027*rearGroove) * Math.cos(angle),
  )
}

function gridGeometry(rows, columns, point, tint, closePoles = false) {
  const positions = [], colors = [], indices = []
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= columns; col++) {
      const t = row / rows, a = col / columns * Math.PI * 2
      const p = point(t, a)
      positions.push(...p.toArray())
      const c = new Color(tint)
      const fiber = Math.sin(t*330 + a*19) * Math.sin(t*42 - a*51)
      const mottling = Math.sin(a*7+t*29) * Math.sin(a*13-t*37)
      c.multiplyScalar(0.91 + fiber*0.036 + mottling*0.05)
      colors.push(c.r, c.g, c.b)
      if (row < rows && col < columns) {
        const k = row*(columns+1)+col
        indices.push(k, k+1, k+columns+1, k+1, k+columns+2, k+columns+1)
      }
    }
  }
  if (closePoles) {
    for (const row of [0, rows]) {
      const base = row*(columns+1), center = new Vector3()
      for (let i=0; i<columns; i++) center.add(new Vector3().fromArray(positions, (base+i)*3))
      center.divideScalar(columns)
      const idx = positions.length/3
      positions.push(...center.toArray())
      colors.push(...colors.slice(base*3, base*3+3))
      for (let i=0; i<columns; i++) {
        if (row===0) indices.push(idx, base+i+1, base+i)
        else indices.push(idx, base+i, base+i+1)
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  // Merge seam normals to make the authored periodic surface continuous.
  const normal = geometry.getAttribute('normal')
  for (let row=0; row<=rows; row++) {
    const a=row*(columns+1), b=a+columns
    const average = new Vector3().fromBufferAttribute(normal,a).add(new Vector3().fromBufferAttribute(normal,b)).normalize()
    normal.setXYZ(a,average.x,average.y,average.z)
    normal.setXYZ(b,average.x,average.y,average.z)
  }
  return geometry
}

export function tubeGeometry(points, radius, tint, { open = false, taper = 1, segments = 72, sides = 12 } = {}) {
  const curve = new CatmullRomCurve3(points.map(p => p.isVector3 ? p : new Vector3(...p)))
  const frames = curve.computeFrenetFrames(segments, false)
  const geometry = gridGeometry(segments, sides, (t, a) => {
    const idx = Math.min(segments, Math.round(t*segments))
    const r = radius * (1-(1-taper)*t)
    return curve.getPoint(t).addScaledVector(frames.normals[idx], Math.cos(a)*r)
      .addScaledVector(frames.binormals[idx], Math.sin(a)*r)
  }, tint, !open)
  return geometry
}

export function buildMeshes(spec) {
  const meshes = []
  const add = (name, geometry, group, roughness = 0.48) => meshes.push({ name, geometry, group, roughness })
  add('ventricular-surface-study', gridGeometry(130, 150, (t,a) => shellPoint(spec.shell,t,a), '#9b4c48', true), 'heart')
  for (const lobe of spec.lobes) {
    add(lobe.id, gridGeometry(48, 64, (t,a) => {
      const lat = Math.PI * (0.002 + 0.996*t)
      const radial = Math.sin(lat)*(1+lobe.fold*Math.cos(a*5+t*15)*Math.sin(lat))
      const x = radial*Math.sin(a)*lobe.scale[0], y = -Math.cos(lat)*lobe.scale[1]
      return new Vector3(lobe.center[0]+x*Math.cos(lobe.tilt)-y*Math.sin(lobe.tilt),
        lobe.center[1]+x*Math.sin(lobe.tilt)+y*Math.cos(lobe.tilt), lobe.center[2]+radial*Math.cos(a)*lobe.scale[2])
    }, '#98564e', true), 'heart')
  }
  for (const vessel of spec.greatVessels) {
    add(vessel.id, tubeGeometry(vessel.points,vessel.radius,vessel.color,{ open:true, sides:32 }), 'great-vessels', 0.46)
    // Recessed dark interior plus annular rims make vessel ends read as walls.
    const inner = tubeGeometry(vessel.points,vessel.radius*0.77,'#5c3438',{open:true,sides:32})
    const index = inner.index.array
    for (let i=0;i<index.length;i+=3) [index[i+1],index[i+2]]=[index[i+2],index[i+1]]
    inner.computeVertexNormals()
    add(`${vessel.id}-interior`,inner,'great-vessels',0.65)
    for (const end of [0,1]) {
      const curve=new CatmullRomCurve3(vessel.points.map(p=>new Vector3(...p)))
      const f=curve.computeFrenetFrames(1,false), center=curve.getPoint(end)
      const rim=gridGeometry(1,32,(t,a)=> center.clone()
        .addScaledVector(f.normals[end],Math.cos(a)*vessel.radius*(0.77+0.23*t))
        .addScaledVector(f.binormals[end],Math.sin(a)*vessel.radius*(0.77+0.23*t)), '#cda18d')
      // Rims are explicitly double-sided in the exporter, unlike the opaque shell.
      add(`${vessel.id}-rim-${end}`,rim,'vessel-rims',0.58)
    }
  }
  for (const vessel of spec.surfaceVessels) {
    const radius = vessel.radius
    const points = vessel.samples.map(([t,a])=>shellPoint(spec.shell,t,a,radius*0.48))
    if (vessel.kind==='arterial') {
      add(`${vessel.id}-fat-bed`,tubeGeometry(vessel.samples.map(([t,a])=>shellPoint(spec.shell,t,a,-radius*1.15)),radius*2.0,'#bc9c67',{taper:0.3,sides:12}), 'surface-fat',0.70)
    }
    add(vessel.id,tubeGeometry(points,radius,vessel.kind==='arterial'?'#ae6555':'#65687b',{taper:0.35,sides:14}), 'surface-vessels',0.42)
  }
  // Subtle authored epicardial striations follow the same surface parameterization.
  for (let i=0;i<28;i++) {
    const start=0.17+(i%7)*0.075, a=-1.13+Math.floor(i/7)*0.61
    const points=Array.from({length:9},(_,j)=>shellPoint(spec.shell,start+j*0.017,a+j*0.045,0.001))
    add(`surface-fold-${i}`,tubeGeometry(points,0.003,'#a96559',{segments:20,sides:5,taper:0.2}),'surface-detail',0.62)
  }
  // Chest context is intentionally a neutral, original silhouette study.
  for (const side of [-1,1]) {
    const rings=[[-1.08,side*1.1,-0.56,0.20,0.22],[-0.97,side*1.22,-0.58,0.62,0.46],[-0.51,side*1.35,-0.62,0.71,0.48],[0.1,side*1.36,-0.65,0.64,0.49],[0.75,side*1.23,-0.67,0.5,0.42],[1.31,side*1.06,-0.67,0.3,0.31],[1.52,side*1.01,-0.67,0.015,0.015]]
    add(`chest-context-${side}`,gridGeometry(80,80,(t,a)=>shellPoint(rings,t,a),'#9c9c98',true),'context',0.84)
  }
  return meshes
}

export function encodeGLB(meshes, extras) {
  const chunks=[], views=[], accessors=[], materials=[], gltfMeshes=[], nodes=[]
  let offset=0
  const append=(array,type,componentType,target)=>{
    const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength)
    const aligned=Buffer.alloc(Math.ceil(bytes.length/4)*4)
    bytes.copy(aligned);chunks.push(aligned)
    const view=views.length
    views.push({buffer:0,byteOffset:offset,byteLength:bytes.length,target})
    offset+=aligned.length
    const width=type==='VEC3'?3:1
    const accessor={bufferView:view,componentType,count:array.length/width,type}
    if (type==='VEC3') {
      accessor.min=[Infinity,Infinity,Infinity];accessor.max=[-Infinity,-Infinity,-Infinity]
      for(let i=0;i<array.length;i++) { const k=i%3;accessor.min[k]=Math.min(accessor.min[k],array[i]);accessor.max[k]=Math.max(accessor.max[k],array[i]) }
    }
    accessors.push(accessor);return accessors.length-1
  }
  for (const {name,geometry,group,roughness} of meshes) {
    const attributes={}
    for (const [key,gltf] of [['position','POSITION'],['normal','NORMAL'],['color','COLOR_0']]) attributes[gltf]=append(geometry.getAttribute(key).array,'VEC3',5126,34962)
    const index=geometry.index.array
    const indices=append(index,'SCALAR',index instanceof Uint16Array?5123:5125,34963)
    const material=materials.length
    materials.push({name:group,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:roughness},doubleSided:group==='vessel-rims'})
    gltfMeshes.push({name,primitives:[{attributes,indices,material}]})
    nodes.push({name,mesh:nodes.length,extras:{group}})
  }
  const document={asset:{version:'2.0',generator:'PalDawn original heart study exporter v1',extras},scene:0,scenes:[{nodes:nodes.map((_,i)=>i)}],nodes,meshes:gltfMeshes,materials,accessors,bufferViews:views,buffers:[{byteLength:offset}]}
  const raw=Buffer.from(JSON.stringify(document)), json=Buffer.alloc(Math.ceil(raw.length/4)*4,0x20)
  raw.copy(json)
  const binary=Buffer.concat(chunks), header=Buffer.alloc(20), binHeader=Buffer.alloc(8)
  header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+binary.length,8)
  header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16)
  binHeader.writeUInt32LE(binary.length,0);binHeader.writeUInt32LE(0x004e4942,4)
  return Buffer.concat([header,json,binHeader,binary])
}
