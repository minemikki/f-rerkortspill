import * as THREE from 'three'

/**
 * World-space UV projection. UVs are written in METRES (1 unit = 1 m) so
 * shared materials (see materials.ts) tile at a consistent physical scale
 * regardless of the mesh size. Box projection picks the dominant axis of
 * each face normal.
 *
 * Call AFTER the geometry has its final transform baked (or pass the matrix).
 */
export function boxUV(geo: THREE.BufferGeometry, matrix?: THREE.Matrix4): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo
  const pos = g.attributes.position
  const nor = g.attributes.normal ?? (g.computeVertexNormals(), g.attributes.normal)
  const uv = new Float32Array(pos.count * 2)
  const p = new THREE.Vector3()
  const n = new THREE.Vector3()
  const nm = matrix ? new THREE.Matrix3().getNormalMatrix(matrix) : null
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i)
    n.fromBufferAttribute(nor, i)
    if (matrix) {
      p.applyMatrix4(matrix)
      n.applyMatrix3(nm!).normalize()
    }
    const ax = Math.abs(n.x)
    const ay = Math.abs(n.y)
    const az = Math.abs(n.z)
    let u: number
    let v: number
    if (ay >= ax && ay >= az) {
      u = p.x
      v = p.z
    } else if (ax >= az) {
      u = p.z
      v = p.y
    } else {
      u = p.x
      v = p.y
    }
    uv[i * 2] = u
    uv[i * 2 + 1] = v
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return g
}

/** Ground plane (XZ) w × d centred at (x, z) with metre UVs. */
export function groundPlane(x: number, z: number, w: number, d: number, y = 0, segX = 1, segZ = 1) {
  const g = new THREE.PlaneGeometry(w, d, segX, segZ)
  g.rotateX(-Math.PI / 2)
  g.translate(x, y, z)
  const pos = g.attributes.position
  const uv = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i), pos.getZ(i))
  uv.needsUpdate = true
  return g
}

/** Axis-aligned box with metre UVs, positioned by its centre. */
export function worldBox(x: number, y: number, z: number, w: number, h: number, d: number) {
  const g = new THREE.BoxGeometry(w, h, d)
  g.translate(x, y, z)
  return boxUV(g)
}
