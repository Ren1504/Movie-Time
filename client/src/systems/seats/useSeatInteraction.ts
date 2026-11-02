import { useEffect, useRef, type RefObject } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'
import {
  MathUtils,
  Matrix4,
  Quaternion,
  Vector3,
  type Camera,
  type Mesh,
} from 'three'
import {
  seats,
  spawnLookAt,
  type Seat,
} from '../../components/theatre/theatreLayout'
import { playerConfig } from '../../config/playerConfig'
import { seatConfig } from '../../config/seatConfig'
import { REQUEST_TIMEOUT_MS, socket } from '../../network/socket'
import { isTyping } from '../../utils/isTyping'
import { localSeat, occupiedSeatIds } from './seatOccupancy'

export type SeatPrompt = 'sit' | 'stand'

type SeatMode = 'walking' | 'claiming' | 'sitting' | 'seated' | 'standing'

const SEAT_TAKEN_MESSAGE = 'Someone just took that seat.'
const SEAT_FAILED_MESSAGE = "Couldn't take that seat. Try again."

const WORLD_UP = new Vector3(0, 1, 0)
const STAND_CLEARANCE = 0.02
const lookMatrix = new Matrix4()
const screenCenter = new Vector3(...spawnLookAt)

/**
 * Only seats the player is in front of count. A seat in the row ahead is closer
 * than it looks, but its back is facing the player.
 */
function findNearestAvailableSeat(x: number, z: number): Seat | null {
  let nearest: Seat | null = null
  let nearestDistance: number = seatConfig.interactDistance
  for (const seat of seats) {
    const [seatX, , seatZ] = seat.position
    if (z >= seatZ || occupiedSeatIds.has(seat.id)) continue
    const distance = Math.hypot(x - seatX, z - seatZ)
    if (distance < nearestDistance) {
      nearest = seat
      nearestDistance = distance
    }
  }
  return nearest
}

/**
 * Owns sitting and standing. Everything is kept in refs and only touches React
 * when the prompt changes, as the checks below run every frame.
 */
export function useSeatInteraction(
  highlightRef: RefObject<Mesh | null>,
  onPromptChange: (prompt: SeatPrompt | null) => void,
  onSeatDenied: (message: string) => void,
) {
  const stateRef = useRef({
    mode: 'walking' as SeatMode,
    focusedSeat: null as Seat | null,
    currentSeat: null as Seat | null,
    approvedSeat: null as Seat | null,
    prompt: null as SeatPrompt | null,
    interactPressed: false,
    progress: 0,
    fromPosition: new Vector3(),
    toPosition: new Vector3(),
    fromRotation: new Quaternion(),
    toRotation: new Quaternion(),
  })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event)) return
      if (event.code === 'KeyE' && !event.repeat && document.pointerLockElement) {
        stateRef.current.interactPressed = true
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(
    () => () => {
      localSeat.id = null
    },
    [],
  )

  const setPrompt = (prompt: SeatPrompt | null) => {
    const state = stateRef.current
    if (state.prompt === prompt) return
    state.prompt = prompt
    onPromptChange(prompt)
  }

  const setFocusedSeat = (seat: Seat | null) => {
    const state = stateRef.current
    if (state.focusedSeat === seat) return
    state.focusedSeat = seat
    const highlight = highlightRef.current
    if (highlight) {
      highlight.visible = seat !== null
      if (seat) highlight.position.set(...seat.position)
    }
    setPrompt(seat ? 'sit' : null)
  }

  /** Runs once per frame. Returns true while the player can walk. */
  const update = (camera: Camera, body: RapierRigidBody, delta: number) => {
    const state = stateRef.current
    const interact = state.interactPressed
    state.interactPressed = false

    if (state.mode === 'walking') {
      const { x, z } = body.translation()
      const seat = findNearestAvailableSeat(x, z)
      setFocusedSeat(seat)
      if (!interact || !seat) return true

      // The server decides, as someone else may be taking this seat right now.
      state.mode = 'claiming'
      setFocusedSeat(null)
      socket
        .timeout(REQUEST_TIMEOUT_MS)
        .emit('seat:claim', { seatId: seat.id }, (error, result) => {
          if (!error && result.ok) {
            state.approvedSeat = seat
            return
          }
          state.mode = 'walking'
          onSeatDenied(
            !error && !result.ok && result.error === 'SEAT_TAKEN'
              ? SEAT_TAKEN_MESSAGE
              : SEAT_FAILED_MESSAGE,
          )
        })
      return false
    }

    if (state.mode === 'claiming') {
      const seat = state.approvedSeat
      if (!seat) return false

      const [seatX, seatY, seatZ] = seat.position
      state.approvedSeat = null
      state.currentSeat = seat
      localSeat.id = seat.id
      state.mode = 'sitting'
      state.progress = 0
      state.fromPosition.copy(camera.position)
      state.fromRotation.copy(camera.quaternion)
      state.toPosition.set(
        seatX,
        seatY + seatConfig.seatedEyeHeight,
        seatZ + seatConfig.seatedEyeOffsetZ,
      )
      lookMatrix.lookAt(state.toPosition, screenCenter, WORLD_UP)
      state.toRotation.setFromRotationMatrix(lookMatrix)
      return false
    }

    if (state.mode === 'seated') {
      if (interact && state.currentSeat) {
        const [x, y, z] = state.currentSeat.standPosition
        socket.emit('seat:release')
        localSeat.id = null
        state.currentSeat = null
        // The body waits here so the view can glide to it, and then walking resumes.
        body.setTranslation(
          { x, y: y + playerConfig.bodyHeight / 2 + STAND_CLEARANCE, z },
          true,
        )
        state.mode = 'standing'
        state.progress = 0
        state.fromPosition.copy(camera.position)
        state.toPosition.set(x, y + playerConfig.eyeHeight, z)
        setPrompt(null)
      }
      return false
    }

    state.progress = Math.min(state.progress + delta / seatConfig.transitionSeconds, 1)
    const eased = MathUtils.smoothstep(state.progress, 0, 1)
    camera.position.lerpVectors(state.fromPosition, state.toPosition, eased)
    // Only sitting turns the view, so standing up doesn't take over the mouse.
    if (state.mode === 'sitting') {
      camera.quaternion.slerpQuaternions(state.fromRotation, state.toRotation, eased)
    }
    if (state.progress === 1) {
      if (state.mode === 'sitting') {
        state.mode = 'seated'
        setPrompt('stand')
      } else {
        state.mode = 'walking'
      }
    }
    return false
  }

  return update
}
