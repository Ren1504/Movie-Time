import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { AmbienceId, RoomMember } from '@movie/shared'
import type { SeatPrompt } from '../../systems/seats/useSeatInteraction'
import {
  allowStreamAudio,
  connectStream,
  disconnectStream,
} from '../../systems/stream/streamConnection'
import type { PlayerControllerHandle } from '../player/PlayerController'
import { ChatBox } from '../ui/ChatBox'
import { HostStreamPanel } from '../ui/HostStreamPanel'
import { SeatPromptLabel } from '../ui/SeatPromptLabel'
import { TheatreOverlay } from '../ui/TheatreOverlay'
import { SceneCanvas } from './SceneCanvas'

type GameState = 'start' | 'playing' | 'paused'

const SEAT_ACTIONS: Record<SeatPrompt, string> = {
  sit: 'Sit',
  stand: 'Stand',
}

const LOCK_ERROR_NOTICE =
  "Your browser didn't release the mouse yet. Wait a moment and try again."

// After Esc, browsers refuse to capture the mouse again for a little over a second.
const RELOCK_COOLDOWN_MS = 1500

interface TheatreViewProps {
  members: RoomMember[]
  localMemberId: string
  ownerId: string
  ambience: AmbienceId
  onSeatDenied: (message: string) => void
  /** Renders room details, which can only be clicked when the mouse is free. */
  renderRoomPanel: (interactive: boolean) => ReactNode
}

export function TheatreView({
  members,
  localMemberId,
  ownerId,
  ambience,
  onSeatDenied,
  renderRoomPanel,
}: TheatreViewProps) {
  const playerRef = useRef<PlayerControllerHandle>(null)
  const [gameState, setGameState] = useState<GameState>('start')
  const [playerReady, setPlayerReady] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [seatPrompt, setSeatPrompt] = useState<SeatPrompt | null>(null)
  const [popcornPrompt, setPopcornPrompt] = useState<string | null>(null)
  const promptAction = seatPrompt ? SEAT_ACTIONS[seatPrompt] : popcornPrompt

  const [resumeBlocked, setResumeBlocked] = useState(false)

  const handleLockChange = useCallback((locked: boolean) => {
    setGameState(locked ? 'playing' : 'paused')
    setResumeBlocked(!locked)
    if (locked) setNotice(null)
  }, [])

  useEffect(() => {
    if (!resumeBlocked) return
    const timer = setTimeout(() => setResumeBlocked(false), RELOCK_COOLDOWN_MS)
    return () => clearTimeout(timer)
  }, [resumeBlocked])

  const handleLockError = useCallback(() => setNotice(LOCK_ERROR_NOTICE), [])
  const handlePlayerReady = useCallback(() => setPlayerReady(true), [])

  // The room can end during play, which must give the mouse back.
  useEffect(() => () => document.exitPointerLock(), [])

  const isHost = members.some(
    (member) => member.id === localMemberId && member.id === ownerId,
  )

  // A new host needs new access, as only the host's allows publishing.
  useEffect(() => {
    void connectStream()
    return disconnectStream
  }, [isHost])

  const handleEnter = () => {
    allowStreamAudio()
    setNotice(null)
    playerRef.current?.lock()
  }

  return (
    <>
      <SceneCanvas
        playerRef={playerRef}
        members={members}
        localMemberId={localMemberId}
        onSeatDenied={onSeatDenied}
        onPlayerReady={handlePlayerReady}
        onLockChange={handleLockChange}
        onLockError={handleLockError}
        onSeatPromptChange={setSeatPrompt}
        onPopcornPromptChange={setPopcornPrompt}
      />
      {gameState === 'playing' && promptAction && (
        <SeatPromptLabel action={promptAction} />
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
          actionDisabled={!playerReady || resumeBlocked}
          notice={notice}
          onAction={handleEnter}
        />
      )}
      {isHost && (
        <HostStreamPanel interactive={gameState !== 'playing'} ambience={ambience} />
      )}
      {renderRoomPanel(gameState !== 'playing')}
      <ChatBox />
    </>
  )
}
