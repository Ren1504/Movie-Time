import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils, MeshStandardMaterial, type Group } from 'three'
import type { RoomMember } from '@movie/shared'
import { remotePoses } from '../../systems/multiplayer/remotePoses'
import {
  drawnFloorY,
  seatsById,
  spawnPositionFor,
} from '../theatre/theatreLayout'
import {
  HEAD_PIVOT_HEIGHT,
  HIP_HEIGHT,
  HIP_OFFSET_X,
  LEG_SEGMENT_LENGTH,
  SEATED_DROP,
  headGeometry,
  legGeometry,
  shirtColorFor,
  torsoGeometry,
  visorGeometry,
} from './avatarModel'
import { Nameplate } from './Nameplate'

const POSITION_RESPONSE = 12
const HEIGHT_RESPONSE = 10
const TURN_RESPONSE = 12
const SIT_RESPONSE = 6
const SPEED_RESPONSE = 10
const SEATED_BACK_OFFSET = 0.04
const STRIDE_RATE = 3
const WALK_SPEED_FOR_FULL_SWING = 3
const MAX_THIGH_SWING = 0.6
const MAX_HEAD_TURN = 1.2
const MAX_HEAD_TILT = 0.7
const RIGHT_ANGLE = Math.PI / 2
const HIDE_WITHIN = 0.45

const skinMaterial = new MeshStandardMaterial({ color: '#e0b597', roughness: 0.8 })
const legMaterial = new MeshStandardMaterial({ color: '#23252e', roughness: 0.9 })
const visorMaterial = new MeshStandardMaterial({ color: '#15161c', roughness: 0.4 })

/** The shortest way round from one angle to another, between -PI and PI. */
function angleBetween(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from))
}

function targetFor(member: RoomMember, spawnSlot: number) {
  const [spawnX, , spawnZ] = spawnPositionFor(spawnSlot)
  const pose = remotePoses.get(member.id) ?? { x: spawnX, z: spawnZ, yaw: 0, pitch: 0 }
  const seat = member.seatId ? seatsById.get(member.seatId) : undefined
  if (!seat) {
    return { pose, seated: false, x: pose.x, z: pose.z, yaw: pose.yaw }
  }
  // Seats face the screen, so only the head follows where a seated player looks.
  const [x, , z] = seat.position
  return { pose, seated: true, x, z: z + SEATED_BACK_OFFSET, yaw: 0 }
}

interface AvatarProps {
  member: RoomMember
  /** Where to stand until this player's first movement arrives. */
  spawnSlot: number
}

export function Avatar({ member, spawnSlot }: AvatarProps) {
  const rootRef = useRef<Group>(null)
  const headRef = useRef<Group>(null)
  const thighRefs = useRef<(Group | null)[]>([])
  const shinRefs = useRef<(Group | null)[]>([])
  const motionRef = useRef({ seatedAmount: 0, speed: 0, stride: 0 })

  // Starts in place, instead of gliding in from the middle of the room.
  useLayoutEffect(() => {
    const root = rootRef.current!
    const { x, z, yaw } = targetFor(member, spawnSlot)
    root.position.set(x, drawnFloorY(z), z)
    root.rotation.y = yaw
    // Only the first placement. Later changes are smoothed in useFrame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((state, frameDelta) => {
    const root = rootRef.current
    const head = headRef.current
    if (!root || !head || frameDelta === 0) return

    const { pose, seated, x, z, yaw } = targetFor(member, spawnSlot)
    const motion = motionRef.current
    const { position } = root
    const previousX = position.x
    const previousZ = position.z

    position.x = MathUtils.damp(position.x, x, POSITION_RESPONSE, frameDelta)
    position.z = MathUtils.damp(position.z, z, POSITION_RESPONSE, frameDelta)

    // Players can walk through each other, and shouldn't see inside the model.
    const { position: camera } = state.camera
    root.visible = Math.hypot(position.x - camera.x, position.z - camera.z) > HIDE_WITHIN

    motion.seatedAmount = MathUtils.damp(
      motion.seatedAmount,
      Number(seated),
      SIT_RESPONSE,
      frameDelta,
    )
    const seat = member.seatId ? seatsById.get(member.seatId) : undefined
    const floorY = seat ? seat.position[1] : drawnFloorY(position.z)
    const targetY = floorY - motion.seatedAmount * SEATED_DROP
    position.y = MathUtils.damp(position.y, targetY, HEIGHT_RESPONSE, frameDelta)

    root.rotation.y += MathUtils.damp(
      0,
      angleBetween(root.rotation.y, yaw),
      TURN_RESPONSE,
      frameDelta,
    )

    head.rotation.y = MathUtils.clamp(
      angleBetween(root.rotation.y, pose.yaw),
      -MAX_HEAD_TURN,
      MAX_HEAD_TURN,
    )
    head.rotation.x = MathUtils.clamp(pose.pitch, -MAX_HEAD_TILT, MAX_HEAD_TILT)

    const moved = Math.hypot(position.x - previousX, position.z - previousZ)
    const speed = seated ? 0 : moved / frameDelta
    motion.speed = MathUtils.damp(motion.speed, speed, SPEED_RESPONSE, frameDelta)
    motion.stride += motion.speed * frameDelta * STRIDE_RATE

    const swing =
      MathUtils.clamp(motion.speed / WALK_SPEED_FOR_FULL_SWING, 0, 1) * MAX_THIGH_SWING
    for (const [index, side] of [1, -1].entries()) {
      const thigh = thighRefs.current[index]
      const shin = shinRefs.current[index]
      if (!thigh || !shin) continue
      const angle = Math.sin(motion.stride) * side * swing
      thigh.rotation.x = MathUtils.lerp(angle, RIGHT_ANGLE, motion.seatedAmount)
      // Knees only bend backwards, on the part of the stride behind the body.
      shin.rotation.x = MathUtils.lerp(
        -Math.max(0, -angle),
        -RIGHT_ANGLE,
        motion.seatedAmount,
      )
    }
  })

  return (
    <group ref={rootRef}>
      <mesh geometry={torsoGeometry}>
        <meshStandardMaterial color={shirtColorFor(member.id)} roughness={0.8} />
      </mesh>
      <group ref={headRef} position={[0, HEAD_PIVOT_HEIGHT, 0]}>
        <mesh geometry={headGeometry} material={skinMaterial} />
        <mesh geometry={visorGeometry} material={visorMaterial} />
      </group>
      {[-1, 1].map((side, index) => (
        <group
          key={side}
          ref={(thigh) => {
            thighRefs.current[index] = thigh
          }}
          position={[side * HIP_OFFSET_X, HIP_HEIGHT, 0]}
        >
          <mesh geometry={legGeometry} material={legMaterial} />
          <group
            ref={(shin) => {
              shinRefs.current[index] = shin
            }}
            position={[0, -LEG_SEGMENT_LENGTH, 0]}
          >
            <mesh geometry={legGeometry} material={legMaterial} />
          </group>
        </group>
      ))}
      <Nameplate name={member.name} />
    </group>
  )
}
