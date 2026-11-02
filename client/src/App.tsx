import { useCallback, useRef, useState } from 'react'
import type { PlayerControllerHandle } from './components/player/PlayerController'
import { SceneCanvas } from './components/scene/SceneCanvas'
import { TheatreOverlay } from './components/ui/TheatreOverlay'

type GameState = 'start' | 'playing' | 'paused'

const LOCK_ERROR_NOTICE =
  "Your browser didn't release the mouse yet. Wait a moment and try again."

function App() {
  const playerRef = useRef<PlayerControllerHandle>(null)
  const [gameState, setGameState] = useState<GameState>('start')
  const [notice, setNotice] = useState<string | null>(null)

  const handleLockChange = useCallback((locked: boolean) => {
    setGameState(locked ? 'playing' : 'paused')
    if (locked) setNotice(null)
  }, [])

  const handleLockError = useCallback(() => setNotice(LOCK_ERROR_NOTICE), [])

  const handleEnter = () => {
    setNotice(null)
    playerRef.current?.lock()
  }

  return (
    <>
      <SceneCanvas
        playerRef={playerRef}
        onLockChange={handleLockChange}
        onLockError={handleLockError}
      />
      {gameState !== 'playing' && (
        <TheatreOverlay
          title={gameState === 'start' ? 'Movie With Friends' : 'Paused'}
          actionLabel={gameState === 'start' ? 'Enter Theatre' : 'Resume'}
          notice={notice}
          onAction={handleEnter}
        />
      )}
    </>
  )
}

export default App
