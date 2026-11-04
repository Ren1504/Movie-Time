import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { POPCORN_BOOTH, type PopcornFlavor, type RoomErrorCode } from '@movie/shared'
import { REQUEST_TIMEOUT_MS, socket } from '../../network/socket'
import { boothFocus } from '../../systems/popcorn/boothFocus'
import { localSeat } from '../../systems/seats/seatOccupancy'
import { isTyping } from '../../utils/isTyping'
import { boothDisplay } from '../theatre/theatreLayout'
import { FLAVOR_NAMES } from './popcornModel'

// Shorter than the server's limit, which allows for movement it hasn't seen yet.
const REACH = 2.4
// How far off-centre a bucket can be and still count as looked at, in radians.
const AIM_TOLERANCE = 0.45
const BUCKET_MIDDLE = 0.12

const FAILED_MESSAGES: Partial<Record<RoomErrorCode, string>> = {
  TOO_FAR: 'Walk up to the popcorn booth first.',
  RATE_LIMITED: "You're swapping buckets too quickly.",
}
const FAILED_MESSAGE = "Couldn't get popcorn. Try again."

const forward = new Vector3()
const toBucket = new Vector3()

interface PopcornInteractionProps {
  /** What the local player is holding, as the server last confirmed. */
  holding: PopcornFlavor | null
  onPromptChange: (action: string | null) => void
  onDenied: (message: string) => void
}

/** Taking a bucket at the booth with E, and putting it down anywhere with G. */
export function PopcornInteraction({ holding, onPromptChange, onDenied }: PopcornInteractionProps) {
  const keysRef = useRef({ take: false, drop: false, waiting: false, prompt: null as string | null })
  const holdingRef = useRef(holding)
  useEffect(() => {
    holdingRef.current = holding
  }, [holding])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event) || event.repeat || !document.pointerLockElement) return
      if (event.code === 'KeyE') keysRef.current.take = true
      if (event.code === 'KeyG') keysRef.current.drop = true
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      boothFocus.flavor = null
    }
  }, [])

  useFrame(({ camera }) => {
    const keys = keysRef.current
    const { take, drop } = keys
    keys.take = keys.drop = false

    const { x, z } = camera.position
    const atBooth =
      localSeat.id === null && Math.hypot(x - POPCORN_BOOTH.x, z - POPCORN_BOOTH.z) < REACH

    let focused: PopcornFlavor | null = null
    if (atBooth) {
      camera.getWorldDirection(forward)
      let closestAngle = AIM_TOLERANCE
      for (const { flavor, position } of boothDisplay) {
        toBucket.set(position[0], position[1] + BUCKET_MIDDLE, position[2]).sub(camera.position)
        const angle = forward.angleTo(toBucket)
        if (angle < closestAngle) {
          closestAngle = angle
          focused = flavor
        }
      }
    }
    boothFocus.flavor = focused

    const offer = focused && focused !== holdingRef.current ? focused : null
    const prompt = offer ? `get ${FLAVOR_NAMES[offer]} popcorn` : null
    if (prompt !== keys.prompt) {
      keys.prompt = prompt
      onPromptChange(prompt)
    }

    if (take && offer && !keys.waiting) {
      keys.waiting = true
      socket.timeout(REQUEST_TIMEOUT_MS).emit('popcorn:take', { flavor: offer }, (error, result) => {
        keys.waiting = false
        if (!error && result.ok) return
        onDenied((!error && !result.ok && FAILED_MESSAGES[result.error]) || FAILED_MESSAGE)
      })
    }
    if (drop && holdingRef.current) socket.emit('popcorn:drop')
  })

  return null
}
