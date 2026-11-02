import { BoxGeometry, BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export type Vec3 = readonly [number, number, number]

export interface Box {
  center: Vec3
  size: Vec3
  /** Tilt around the X axis in radians. Only colliders use this. */
  rotationX?: number
}

/**
 * Merges boxes into one geometry (one draw call). UVs are in metres, so a
 * repeating texture keeps the same scale on boxes of any size.
 */
export function createBoxBatch(boxes: readonly Box[]): BufferGeometry {
  const parts = boxes.map(({ center, size }) => {
    const [width, height, depth] = size
    const box = new BoxGeometry(width, height, depth)
    const uv = box.getAttribute('uv')
    // BoxGeometry stores 4 vertices per face in the order +x, -x, +y, -y, +z, -z.
    const faceSizes = [
      [depth, height],
      [depth, height],
      [width, depth],
      [width, depth],
      [width, height],
      [width, height],
    ]
    for (let i = 0; i < uv.count; i++) {
      const [faceU, faceV] = faceSizes[Math.floor(i / 4)]
      uv.setXY(i, uv.getX(i) * faceU, uv.getY(i) * faceV)
    }
    box.translate(center[0], center[1], center[2])
    return box
  })

  const merged = mergeGeometries(parts, false)
  parts.forEach((part) => part.dispose())
  return merged
}
