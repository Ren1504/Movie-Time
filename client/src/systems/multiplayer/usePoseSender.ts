import { useRef } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'
import { Euler, type Camera } from 'three'
import type { PlayerPose } from '@movie/shared'
import { socket } from '../../network/socket'

const SEND_INTERVAL_SECONDS = 1 / 15
const CHANGE_THRESHOLD = 0.005
const lookAngles = new Euler(0, 0, 0, 'YXZ')

/** Sends this player's pose at a fixed rate, and only when it has changed. */
export function usePoseSender() {
  const elapsedRef = useRef(0)
  const lastPoseRef = useRef<PlayerPose | null>(null)

  return (camera: Camera, body: RapierRigidBody, delta: number) => {
    elapsedRef.current += delta
    if (elapsedRef.current < SEND_INTERVAL_SECONDS) return
    elapsedRef.current = 0

    const { x, z } = body.translation()
    lookAngles.setFromQuaternion(camera.quaternion)
    const pose = { x, z, yaw: lookAngles.y, pitch: lookAngles.x }

    const last = lastPoseRef.current
    const changed =
      !last ||
      Math.abs(last.x - pose.x) > CHANGE_THRESHOLD ||
      Math.abs(last.z - pose.z) > CHANGE_THRESHOLD ||
      Math.abs(last.yaw - pose.yaw) > CHANGE_THRESHOLD ||
      Math.abs(last.pitch - pose.pitch) > CHANGE_THRESHOLD
    if (!changed) return

    lastPoseRef.current = pose
    // Volatile: if this one is lost, the next is newer anyway.
    socket.volatile.emit('player:pose', pose)
  }
}
