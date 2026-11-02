import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils } from 'three'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'
import { playerConfig } from '../../config/playerConfig'
import type { Vec3 } from '../../utils/boxBatch'
import { useMovementKeys } from './useMovementKeys'

export interface PlayerControllerHandle {
  /** Captures the mouse. Browsers only allow this during a click or key press. */
  lock: () => void
}

export interface MovementBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

interface PlayerControllerProps {
  ref: Ref<PlayerControllerHandle>
  spawnPosition: Vec3
  spawnLookAt: Vec3
  bounds: MovementBounds
  getFloorHeight: (x: number, z: number) => number
  onLockChange: (locked: boolean) => void
  onLockError: () => void
}

export function PlayerController({
  ref,
  spawnPosition,
  spawnLookAt,
  bounds,
  getFloorHeight,
  onLockChange,
  onLockError,
}: PlayerControllerProps) {
  const camera = useThree((state) => state.camera)
  const canvas = useThree((state) => state.gl.domElement)
  const pressedRef = useMovementKeys()
  const controlsRef = useRef<PointerLockControls>(null)
  const velocityRef = useRef({ forward: 0, right: 0 })

  useEffect(() => {
    const [x, y, z] = spawnPosition
    camera.position.set(x, y + playerConfig.eyeHeight, z)
    camera.lookAt(...spawnLookAt)
  }, [camera, spawnPosition, spawnLookAt])

  useEffect(() => {
    const controls = new PointerLockControls(camera, canvas)
    controls.pointerSpeed = playerConfig.mouseSensitivity
    controlsRef.current = controls

    const handleLock = () => onLockChange(true)
    const handleUnlock = () => {
      velocityRef.current = { forward: 0, right: 0 }
      onLockChange(false)
    }
    controls.addEventListener('lock', handleLock)
    controls.addEventListener('unlock', handleUnlock)
    document.addEventListener('pointerlockerror', onLockError)

    return () => {
      controls.removeEventListener('lock', handleLock)
      controls.removeEventListener('unlock', handleUnlock)
      document.removeEventListener('pointerlockerror', onLockError)
      controls.dispose()
      controlsRef.current = null
    }
  }, [camera, canvas, onLockChange, onLockError])

  useImperativeHandle(
    ref,
    () => ({
      lock: () => {
        // Failures are reported through the pointerlockerror event above.
        canvas.requestPointerLock()?.catch(() => {})
      },
    }),
    [canvas],
  )

  useFrame((state, frameDelta) => {
    const controls = controlsRef.current
    if (!controls?.isLocked) return

    const delta = Math.min(frameDelta, playerConfig.maxFrameDelta)
    const pressed = pressedRef.current
    let inputForward = Number(pressed.has('KeyW')) - Number(pressed.has('KeyS'))
    let inputRight = Number(pressed.has('KeyD')) - Number(pressed.has('KeyA'))
    // Without this, moving diagonally would be faster than moving straight.
    const inputLength = Math.hypot(inputForward, inputRight)
    if (inputLength > 1) {
      inputForward /= inputLength
      inputRight /= inputLength
    }

    const velocity = velocityRef.current
    const { walkSpeed, movementResponse, heightResponse, eyeHeight } = playerConfig
    velocity.forward = MathUtils.damp(
      velocity.forward,
      inputForward * walkSpeed,
      movementResponse,
      delta,
    )
    velocity.right = MathUtils.damp(
      velocity.right,
      inputRight * walkSpeed,
      movementResponse,
      delta,
    )

    controls.moveForward(velocity.forward * delta)
    controls.moveRight(velocity.right * delta)

    const position = state.camera.position
    position.x = MathUtils.clamp(position.x, bounds.minX, bounds.maxX)
    position.z = MathUtils.clamp(position.z, bounds.minZ, bounds.maxZ)
    position.y = MathUtils.damp(
      position.y,
      getFloorHeight(position.x, position.z) + eyeHeight,
      heightResponse,
      delta,
    )
  })

  return null
}
