import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { updateSurroundListener } from '../../systems/stream/surroundSound'

const forward = new Vector3()
const up = new Vector3()

/** Places the listener's ears at the camera, so sound follows the player's head. */
export function SurroundListener() {
  useFrame(({ camera }) => {
    camera.getWorldDirection(forward)
    up.copy(camera.up).applyQuaternion(camera.quaternion)
    updateSurroundListener({
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      forwardX: forward.x,
      forwardY: forward.y,
      forwardZ: forward.z,
      upX: up.x,
      upY: up.y,
      upZ: up.z,
    })
  })
  return null
}
