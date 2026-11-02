import { BoxGeometry, CapsuleGeometry, SphereGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// A simple figure made of shared parts. To change how avatars look, replace this
// file and the meshes in Avatar.tsx. The origin is on the floor, facing -Z.

export const HIP_HEIGHT = 0.9
export const HIP_OFFSET_X = 0.09
export const LEG_SEGMENT_LENGTH = 0.45
export const HEAD_PIVOT_HEIGHT = 1.5
// How far the body drops to rest its hips on a seat cushion.
export const SEATED_DROP = 0.32
export const NAMEPLATE_HEIGHT = 2.05

const CAPSULE_SEGMENTS = 4
const ROUND_SEGMENTS = 8

export const torsoGeometry = mergeGeometries([
  new CapsuleGeometry(0.17, 0.38, CAPSULE_SEGMENTS, ROUND_SEGMENTS)
    .translate(0, 1.18, 0)
    .toNonIndexed(),
  new CapsuleGeometry(0.05, 0.46, CAPSULE_SEGMENTS, ROUND_SEGMENTS)
    .translate(-0.23, 1.14, 0)
    .toNonIndexed(),
  new CapsuleGeometry(0.05, 0.46, CAPSULE_SEGMENTS, ROUND_SEGMENTS)
    .translate(0.23, 1.14, 0)
    .toNonIndexed(),
])

// Relative to the neck pivot, so the head turns around its base.
export const headGeometry = new SphereGeometry(0.13, 12, 10).translate(0, 0.13, 0)
export const visorGeometry = new BoxGeometry(0.2, 0.05, 0.04).translate(0, 0.15, -0.115)

// Both leg segments hang down from their pivot.
export const legGeometry = new CapsuleGeometry(
  0.07,
  LEG_SEGMENT_LENGTH - 0.14,
  CAPSULE_SEGMENTS,
  ROUND_SEGMENTS,
).translate(0, -LEG_SEGMENT_LENGTH / 2, 0)

const SHIRT_COLORS = [
  '#3f7fd1',
  '#d1693f',
  '#3fa877',
  '#b24fc4',
  '#d1b13f',
  '#3fb3c4',
  '#d14f7e',
  '#7f8f3f',
]

/** Always the same colour for the same player, on every screen. */
export function shirtColorFor(memberId: string): string {
  let hash = 0
  for (const character of memberId) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0
  }
  return SHIRT_COLORS[Math.abs(hash) % SHIRT_COLORS.length]
}
