import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BoxGeometry,
  CylinderGeometry,
  MathUtils,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
  type Group,
} from 'three'
import { theatreConfig } from '../../config/theatreConfig'
import type { Vec3 } from '../../utils/boxBatch'
import { reach } from '../avatars/armPoses'
import {
  ARM_SEGMENT_LENGTH,
  HEAD_PIVOT_HEIGHT,
  HIP_HEIGHT,
  HIP_OFFSET_X,
  LEG_SEGMENT_LENGTH,
  SHOULDER_HEIGHT,
  SHOULDER_OFFSET_X,
  SKIN_COLOR,
  armGeometry,
  headGeometry,
  legGeometry,
  torsoGeometry,
} from '../avatars/avatarModel'

// Decoration only: a vendor behind the counter, built from the avatar parts.
// Nothing here is sent over the network, and everyone sees their own copy.

const { booth } = theatreConfig
// Turns the avatar, which faces -Z, to face -X, back towards the doorway.
const FACING_DOORWAY = Math.PI / 2
const BREATH_RATE = 1.6
const BREATH_DEPTH = 0.006
const IDLE_SWAY_RATE = 0.35
const IDLE_SWAY = 0.5
const MAX_HEAD_TURN = 1.1
const HEAD_RESPONSE = 3
// Watches whoever is close enough to be at the counter.
const WATCH_DISTANCE = 5

const shirtMaterial = new MeshStandardMaterial({ color: booth.vendorShirt, roughness: 0.8 })
const skinMaterial = new MeshStandardMaterial({ color: SKIN_COLOR, roughness: 0.8 })
const legMaterial = new MeshStandardMaterial({ color: '#23252e', roughness: 0.9 })
const hatMaterial = new MeshStandardMaterial({ color: booth.vendorHat, roughness: 0.9 })
const eyeMaterial = new MeshStandardMaterial({ color: '#15161c', roughness: 0.4 })

// A paper cap with a red band, like old-fashioned cinema staff.
const hatGeometry = new CylinderGeometry(0.12, 0.135, 0.1, 12).translate(0, 0.26, 0)
const hatBandGeometry = new CylinderGeometry(0.137, 0.137, 0.025, 12).translate(0, 0.225, 0)
const eyeGeometry = new SphereGeometry(0.018, 6, 4)
const bowTieGeometry = new BoxGeometry(0.12, 0.05, 0.03)

// Both hands rest on the counter top, in front of the vendor.
const HANDS_Y = booth.counterHeight + 0.07
const leftArm = reach(-1, new Vector3(-0.2, HANDS_Y, -0.4), new Vector3(-1, -0.4, 0.3))
const rightArm = reach(1, new Vector3(0.2, HANDS_Y, -0.4), new Vector3(1, -0.4, 0.3))

const toCamera = new Vector3()

export function PopcornVendor({ position }: { position: Vec3 }) {
  const bodyRef = useRef<Group>(null)
  const headRef = useRef<Group>(null)

  useFrame(({ camera, clock }, delta) => {
    const body = bodyRef.current
    const head = headRef.current
    if (!body || !head) return
    const time = clock.elapsedTime
    body.position.y = Math.sin(time * BREATH_RATE) * BREATH_DEPTH

    // Head angle towards the camera, measured from the way the vendor faces.
    toCamera.set(camera.position.x - position[0], 0, camera.position.z - position[2])
    const watching = toCamera.length() < WATCH_DISTANCE
    const towardsCamera = Math.atan2(toCamera.z, -toCamera.x)
    const target = watching
      ? MathUtils.clamp(towardsCamera, -MAX_HEAD_TURN, MAX_HEAD_TURN)
      : Math.sin(time * IDLE_SWAY_RATE) * IDLE_SWAY
    head.rotation.y = MathUtils.damp(head.rotation.y, target, HEAD_RESPONSE, delta)
  })

  return (
    <group position={position} rotation={[0, FACING_DOORWAY, 0]}>
      <group ref={bodyRef}>
        <mesh geometry={torsoGeometry} material={shirtMaterial} />
        <mesh
          geometry={bowTieGeometry}
          material={eyeMaterial}
          position={[0, SHOULDER_HEIGHT - 0.03, -0.15]}
        />
        {[leftArm, rightArm].map((arm, index) => (
          <group
            key={index}
            position={[(index === 0 ? -1 : 1) * SHOULDER_OFFSET_X, SHOULDER_HEIGHT, 0]}
            quaternion={arm.upper}
          >
            <mesh geometry={armGeometry} material={shirtMaterial} />
            <group position={[0, -ARM_SEGMENT_LENGTH, 0]} quaternion={arm.fore}>
              <mesh geometry={armGeometry} material={skinMaterial} />
            </group>
          </group>
        ))}
        <group ref={headRef} position={[0, HEAD_PIVOT_HEIGHT, 0]}>
          <mesh geometry={headGeometry} material={skinMaterial} />
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              geometry={eyeGeometry}
              material={eyeMaterial}
              position={[side * 0.045, 0.15, -0.118]}
            />
          ))}
          <mesh geometry={hatGeometry} material={hatMaterial} />
          <mesh geometry={hatBandGeometry} material={shirtMaterial} />
        </group>
      </group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * HIP_OFFSET_X, HIP_HEIGHT, 0]}>
          <mesh geometry={legGeometry} material={legMaterial} />
          <mesh
            geometry={legGeometry}
            material={legMaterial}
            position={[0, -LEG_SEGMENT_LENGTH, 0]}
          />
        </group>
      ))}
    </group>
  )
}
