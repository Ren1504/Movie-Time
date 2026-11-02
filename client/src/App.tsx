import { useCallback, useRef, useState } from 'react'
import type { PlayerControllerHandle } from './components/player/PlayerController'
import { SceneCanvas } from './components/scene/SceneCanvas'
import { SeatPromptLabel } from './components/ui/SeatPromptLabel'
import { TheatreOverlay } from './components/ui/TheatreOverlay'
import type { SeatPrompt } from './systems/seats/useSeatInteraction'

type GameState = 'start' | 'playing' | 'paused'

const LOCK_ERROR_NOTICE =
  "Your browser didn't release the mouse yet. Wait a moment and try again."

function App() {
  const playerRef = useRef<PlayerControllerHandle>(null)
  const [gameState, setGameState] = useState<GameState>('start')
  const [playerReady, setPlayerReady] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [seatPrompt, setSeatPrompt] = useState<SeatPrompt | null>(null)

  const handleLockChange = useCallback((locked: boolean) => {
    setGameState(locked ? 'playing' : 'paused')
    if (locked) setNotice(null)
  }, [])

  const handleLockError = useCallback(() => setNotice(LOCK_ERROR_NOTICE), [])
  const handlePlayerReady = useCallback(() => setPlayerReady(true), [])

  const handleEnter = () => {
    setNotice(null)
    playerRef.current?.lock()
  }

  return (
    <>
      <SceneCanvas
        playerRef={playerRef}
        onPlayerReady={handlePlayerReady}
        onLockChange={handleLockChange}
        onLockError={handleLockError}
        onSeatPromptChange={setSeatPrompt}
      />
      {gameState === 'playing' && seatPrompt && (
        <SeatPromptLabel prompt={seatPrompt} />
      )}
      {gameState !== 'playing' && (
        <TheatreOverlay
          title={gameState === 'start' ? 'Movie With Friends' : 'Paused'}
          actionLabel={
            !playerReady
              ? 'Loading...'
              : gameState === 'start'
                ? 'Enter Theatre'
                : 'Resume'
          }
          actionDisabled={!playerReady}
          notice={notice}
          onAction={handleEnter}
        />
      )}
    </>
  )
}

export default App
