import { Quaternion, Vector3 } from 'three'
import { ARM_SEGMENT_LENGTH, HIP_HEIGHT, SHOULDER_HEIGHT, SHOULDER_OFFSET_X } from './avatarModel'

// Arm poses for holding and eating popcorn, worked out once from where the hand
// should be. Positions are in the avatar's own space: origin on the floor,
// facing -Z, with +X on its right.

export interface ArmPose {
  upper: Quaternion
  fore: Quaternion
}

const HANGING = new Vector3(0, -1, 0)

/**
 * Two-bone reach: the elbow bends towards `bendTowards`, and the hand ends at
 * `target`, or as close as the arm allows.
 */
export function reach(side: -1 | 1, target: Vector3, bendTowards: Vector3): ArmPose {
  const shoulder = new Vector3(side * SHOULDER_OFFSET_X, SHOULDER_HEIGHT, 0)
  const toTarget = target.clone().sub(shoulder)
  const length = ARM_SEGMENT_LENGTH
  const distance = Math.min(Math.max(toTarget.length(), 0.05), 2 * length - 0.001)
  const direction = toTarget.normalize()

  const bend = bendTowards.clone().sub(direction.clone().multiplyScalar(bendTowards.dot(direction)))
  bend.normalize()
  // The elbow's angle out from the shoulder-to-hand line, by the law of cosines.
  const angle = Math.acos(distance / (2 * length))
  const elbow = shoulder
    .clone()
    .addScaledVector(direction, Math.cos(angle) * length)
    .addScaledVector(bend, Math.sin(angle) * length)
  const hand = shoulder.clone().addScaledVector(direction, distance)

  const upper = new Quaternion().setFromUnitVectors(HANGING, elbow.clone().sub(shoulder).normalize())
  const foreWorld = new Quaternion().setFromUnitVectors(HANGING, hand.sub(elbow).normalize())
  // The forearm is attached to the upper arm, so its turn is relative to it.
  const fore = upper.clone().invert().multiply(foreWorld)
  return { upper, fore }
}

const OUT_AND_DOWN = (side: -1 | 1) => new Vector3(side, -0.5, 0.3)
const DOWN_AND_OUT = (side: -1 | 1) => new Vector3(side * 0.6, -1, 0)

export const hanging: ArmPose = { upper: new Quaternion(), fore: new Quaternion() }

// A bucket on a seated avatar's lap, and in the left hand while standing.
export const LAP_BUCKET = new Vector3(0, HIP_HEIGHT + 0.07, -0.26)
export const CARRIED_BUCKET = new Vector3(-0.27, 0.86, -0.2)

export const leftArm = {
  carrying: reach(-1, new Vector3(-0.27, 0.97, -0.17), DOWN_AND_OUT(-1)),
  // Steadying the bucket from the side.
  holdingLap: reach(-1, new Vector3(-0.1, LAP_BUCKET.y + 0.09, LAP_BUCKET.z), OUT_AND_DOWN(-1)),
}

export const rightArm = {
  resting: reach(1, new Vector3(0.2, HIP_HEIGHT + 0.12, -0.3), OUT_AND_DOWN(1)),
  inBucket: reach(1, new Vector3(0.02, LAP_BUCKET.y + 0.14, LAP_BUCKET.z), OUT_AND_DOWN(1)),
  atMouth: reach(1, new Vector3(0.03, 1.55, -0.15), DOWN_AND_OUT(1)),
}
