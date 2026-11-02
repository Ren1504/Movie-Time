import type { BufferGeometry } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { theatreConfig } from '../../config/theatreConfig'

const { seating } = theatreConfig

// Rounding detail per box. Shown on every seat, so it is kept low.
const CUSHION_SEGMENTS = 2
const SMALL_PART_SEGMENTS = 1
const BACK_TILT = 0.14
const ARM_X = seating.seatPitch / 2 - 0.01

// Seat model: the origin is on the floor below the cushion, and it faces -Z.
function rounded(
  width: number,
  height: number,
  depth: number,
  radius: number,
  segments = SMALL_PART_SEGMENTS,
) {
  return new RoundedBoxGeometry(width, height, depth, segments, radius)
}

function merge(parts: BufferGeometry[]) {
  // Rounded boxes are non-indexed, so they merge without any conversion.
  const merged = mergeGeometries(parts, false)
  parts.forEach((part) => part.dispose())
  return merged
}

export const velvetGeometry = merge([
  rounded(0.52, 0.14, 0.52, 0.06, CUSHION_SEGMENTS).translate(0, 0.44, -0.02),
  rounded(0.52, 0.72, 0.14, 0.06, CUSHION_SEGMENTS).rotateX(BACK_TILT).translate(0, 0.86, 0.27),
  rounded(0.54, 0.76, 0.04, 0.015).rotateX(BACK_TILT).translate(0, 0.85, 0.35),
])

export const frameGeometry = merge([
  ...[-1, 1].flatMap((side) => [
    rounded(0.05, 0.66, 0.52, 0.02).translate(side * ARM_X, 0.33, 0.02),
    rounded(0.07, 0.05, 0.5, 0.02).translate(side * ARM_X, 0.68, 0.02),
  ]),
])
