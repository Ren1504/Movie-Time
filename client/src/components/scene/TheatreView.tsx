import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { SeatPrompt } from '../../systems/seats/useSeatInteraction'
import type { PlayerControllerHandle } from '../player/PlayerController'
import { SeatPromptLabel } from '../ui/SeatPromptLabel'
import { TheatreOverlay } from '../ui/TheatreOverlay'
import { SceneCanvas } from './SceneCanvas'

type GameState = 'start' | 'playing' | 'paused'

const LOCK_ERROR_NOTICE =
  "Your browser didn't release the mouse yet. Wait a moment and try again."

interface TheatreViewProps {
  /** Renders room details, which can only be clicked when the mouse is free. */
  renderRoomPanel: (interactive: boolean) => ReactNode
}

export function TheatreView({ renderRoomPanel }: TheatreViewProps) {
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

  // The room can end during play, which must give the mouse back.
  useEffect(() => () => document.exitPointerLock(), [])

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
      {renderRoomPanel(gameState !== 'playing')}
    </>
  )
}
