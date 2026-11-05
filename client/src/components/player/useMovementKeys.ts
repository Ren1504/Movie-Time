import { useEffect, useRef } from 'react'
import { isTyping } from '../../utils/isTyping'

// Physical key positions, so WASD works on any keyboard layout.
const HELD_CODES = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight']

export interface MovementKeys {
  pressed: Set<string>
  /** Set by a fresh press of Space, and cleared once the player has used it. */
  jumpQueued: boolean
}

/** Tracks movement keys in a ref, so key presses don't re-render React. */
export function useMovementKeys() {
  const keysRef = useRef<MovementKeys>({ pressed: new Set(), jumpQueued: false })

  useEffect(() => {
    const keys = keysRef.current

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event)) {
        keys.pressed.clear()
        keys.jumpQueued = false
        return
      }
      if (HELD_CODES.includes(event.code)) keys.pressed.add(event.code)
      if (event.code === 'Space' && document.pointerLockElement) {
        // Otherwise Space would also press whichever button last had focus.
        event.preventDefault()
        // Holding Space jumps once, not over and over.
        if (!event.repeat) keys.jumpQueued = true
      }
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      keys.pressed.delete(event.code)
    }
    // A key released while the window is unfocused never sends a keyup.
    const releaseAll = () => {
      keys.pressed.clear()
      keys.jumpQueued = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', releaseAll)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', releaseAll)
    }
  }, [])

  return keysRef
}
