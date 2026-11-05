import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  CapsuleCollider,
  RigidBody,
  useRapier,
  type RapierCollider,
  type RapierRigidBody,
} from '@react-three/rapier'
import { MathUtils, Vector3, type Mesh } from 'three'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'
import { playerConfig } from '../../config/playerConfig'
import { usePoseSender } from '../../systems/multiplayer/usePoseSender'
import {
  useSeatInteraction,
  type SeatPrompt,
} from '../../systems/seats/useSeatInteraction'
import type { Vec3 } from '../../utils/boxBatch'
import { SeatHighlight } from '../theatre/SeatHighlight'
import { useMovementKeys } from './useMovementKeys'

export interface PlayerControllerHandle {
  /** Captures the mouse. Browsers only allow this during a click or key press. */
  lock: () => void
}

interface PlayerControllerProps {
  ref: Ref<PlayerControllerHandle>
  /** Where the player's feet start. */
  spawnPosition: Vec3
  spawnLookAt: Vec3
  onReady: () => void
  onLockChange: (locked: boolean) => void
  onLockError: () => void
  onSeatPromptChange: (prompt: SeatPrompt | null) => void
  onSeatDenied: (message: string) => void
}

const { bodyHeight, bodyRadius } = playerConfig
const BODY_CENTER_HEIGHT = bodyHeight / 2
const CAPSULE_HALF_HEIGHT = BODY_CENTER_HEIGHT - bodyRadius
// Starts just above the floor, so the player settles onto it.
const SPAWN_CLEARANCE = 0.05
// Runs before the physics step, which uses the default priority of 0.
const BEFORE_PHYSICS_STEP = -1

const WORLD_UP = new Vector3(0, 1, 0)
const forward = new Vector3()
const right = new Vector3()

export function PlayerController({
  ref,
  spawnPosition,
  spawnLookAt,
  onReady,
  onLockChange,
  onLockError,
  onSeatPromptChange,
  onSeatDenied,
}: PlayerControllerProps) {
  const camera = useThree((state) => state.camera)
  const canvas = useThree((state) => state.gl.domElement)
  const { world } = useRapier()
  const keysRef = useMovementKeys()
  const seatHighlightRef = useRef<Mesh>(null)
  const updateSeating = useSeatInteraction(
    seatHighlightRef,
    onSeatPromptChange,
    onSeatDenied,
  )
  const sendPose = usePoseSender()
  const controlsRef = useRef<PointerLockControls>(null)
  const bodyRef = useRef<RapierRigidBody>(null)
  const colliderRef = useRef<RapierCollider>(null)
  const characterRef = useRef<ReturnType<typeof world.createCharacterController>>(null)
  const velocityRef = useRef({ forward: 0, right: 0, vertical: 0 })
  // Where the feet were when the player last left the ground, and how far above
  // that they are now. Others see the jump from this.
  const takeoffYRef = useRef(0)
  const liftRef = useRef(0)

  useEffect(() => {
    const [x, y, z] = spawnPosition
    camera.position.set(x, y + playerConfig.eyeHeight, z)
    camera.lookAt(...spawnLookAt)
  }, [camera, spawnPosition, spawnLookAt])

  useEffect(() => {
    const character = world.createCharacterController(playerConfig.collisionOffset)
    character.enableSnapToGround(playerConfig.snapToGroundDistance)
    characterRef.current = character
    return () => {
      characterRef.current = null
      world.removeCharacterController(character)
    }
  }, [world])

  useEffect(() => {
    const controls = new PointerLockControls(camera, canvas)
    controls.pointerSpeed = playerConfig.mouseSensitivity
    controlsRef.current = controls

    const handleLock = () => onLockChange(true)
    const handleUnlock = () => {
      velocityRef.current = { forward: 0, right: 0, vertical: 0 }
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

  useEffect(() => {
    onReady()
  }, [onReady])

  useFrame((state, frameDelta) => {
    const controls = controlsRef.current
    const body = bodyRef.current
    const collider = colliderRef.current
    const character = characterRef.current
    if (!controls?.isLocked || !body || !collider || !character) return

    const delta = Math.min(frameDelta, playerConfig.maxFrameDelta)
    sendPose(state.camera, body, delta, liftRef.current)
    const keys = keysRef.current
    if (!updateSeating(state.camera, body, delta)) {
      velocityRef.current = { forward: 0, right: 0, vertical: 0 }
      liftRef.current = 0
      keys.jumpQueued = false
      return
    }

    const { pressed } = keys
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
    const sprinting = pressed.has('ShiftLeft') || pressed.has('ShiftRight')
    const speed = walkSpeed * (sprinting ? playerConfig.sprintMultiplier : 1)
    velocity.forward = MathUtils.damp(
      velocity.forward,
      inputForward * speed,
      movementResponse,
      delta,
    )
    velocity.right = MathUtils.damp(
      velocity.right,
      inputRight * speed,
      movementResponse,
      delta,
    )
    // Still rising counts as airborne, as the ground can be detected for a
    // frame or two after take-off.
    const onGround = character.computedGrounded() && velocity.vertical <= 0
    const wasAirborne = velocity.vertical !== 0
    if (onGround && keys.jumpQueued) {
      velocity.vertical = playerConfig.jumpSpeed
    } else if (onGround) {
      // No downward push while grounded, as it would drag the player down the
      // slope. Snap-to-ground keeps the player on the floor instead.
      velocity.vertical = 0
    } else {
      velocity.vertical = Math.max(
        velocity.vertical - playerConfig.gravity * delta,
        -playerConfig.maxFallSpeed,
      )
    }
    // A press in the air is dropped, so it doesn't fire on landing.
    keys.jumpQueued = false

    // Looking up or down must not change walking speed, so only heading counts.
    state.camera.getWorldDirection(forward)
    forward.setY(0).normalize()
    right.crossVectors(forward, WORLD_UP)

    character.computeColliderMovement(collider, {
      x: (forward.x * velocity.forward + right.x * velocity.right) * delta,
      y: velocity.vertical * delta,
      z: (forward.z * velocity.forward + right.z * velocity.right) * delta,
    })
    const movement = character.computedMovement()
    // Hitting a ceiling ends the rise, instead of sticking to it. Just below
    // zero, so the player still counts as airborne and starts to fall.
    if (velocity.vertical > 0 && movement.y < velocity.vertical * delta * 0.5) {
      velocity.vertical = -0.01
    }
    const current = body.translation()
    const next = {
      x: current.x + movement.x,
      y: current.y + movement.y,
      z: current.z + movement.z,
    }
    body.setNextKinematicTranslation(next)

    const feetY = next.y - BODY_CENTER_HEIGHT
    const airborne = velocity.vertical !== 0
    if (airborne && !wasAirborne) takeoffYRef.current = current.y - BODY_CENTER_HEIGHT
    liftRef.current = airborne ? Math.max(0, feetY - takeoffYRef.current) : 0

    const position = state.camera.position
    position.x = next.x
    position.z = next.z
    // On the ground, height is smoothed so changes in floor height don't jolt
    // the view. In the air it follows exactly, or jumps would feel sluggish.
    const eyeY = feetY + eyeHeight
    position.y = airborne ? eyeY : MathUtils.damp(position.y, eyeY, heightResponse, delta)
  }, BEFORE_PHYSICS_STEP)

  return (
    <>
      <RigidBody
        ref={bodyRef}
        type="kinematicPosition"
        colliders={false}
        position={[
          spawnPosition[0],
          spawnPosition[1] + BODY_CENTER_HEIGHT + SPAWN_CLEARANCE,
          spawnPosition[2],
        ]}
      >
        <CapsuleCollider ref={colliderRef} args={[CAPSULE_HALF_HEIGHT, bodyRadius]} />
      </RigidBody>
      <SeatHighlight ref={seatHighlightRef} />
    </>
  )
}
