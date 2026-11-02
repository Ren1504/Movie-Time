import { useEffect, useRef } from 'react'

// Physical key positions, so WASD works on any keyboard layout.
const MOVEMENT_CODES = ['KeyW', 'KeyA', 'KeyS', 'KeyD']

/** Tracks held movement keys in a ref, so key presses don't re-render React. */
export function useMovementKeys() {
  const pressedRef = useRef(new Set<string>())

  useEffect(() => {
    const pressed = pressedRef.current

    const handleKeyDown = (event: KeyboardEvent) => {
      if (MOVEMENT_CODES.includes(event.code)) pressed.add(event.code)
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      pressed.delete(event.code)
    }
    // A key released while the window is unfocused never sends a keyup.
    const releaseAll = () => pressed.clear()

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', releaseAll)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', releaseAll)
    }
  }, [])

  return pressedRef
}
