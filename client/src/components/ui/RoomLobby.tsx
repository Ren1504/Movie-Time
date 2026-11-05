import { useState, type FormEvent } from 'react'
import { MAX_NAME_LENGTH, ROOM_CODE_LENGTH } from '@movie/shared'
import { FullscreenTip } from './FullscreenTip'

interface RoomLobbyProps {
  connected: boolean
  busy: boolean
  notice: string | null
  onCreate: (name: string) => void
  onJoin: (code: string, name: string) => void
}

export function RoomLobby({ connected, busy, notice, onCreate, onJoin }: RoomLobbyProps) {
  const [name, setName] = useState('')
  // Invite links carry the code, so friends only need to add a name.
  const [code, setCode] = useState(() =>
    (new URLSearchParams(window.location.search).get('room') ?? '')
      .toUpperCase()
      .slice(0, ROOM_CODE_LENGTH),
  )
  const hasName = name.trim().length > 0
  const canAct = connected && !busy && hasName

  const handleJoin = (event: FormEvent) => {
    event.preventDefault()
    if (canAct && code.length === ROOM_CODE_LENGTH) onJoin(code, name)
  }

  return (
    <div className="theatre-overlay">
      <div className="theatre-overlay-panel">
        <h1>Movie With Friends</h1>
        <label className="room-field">
          Your name
          <input
            value={name}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="nickname"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button type="button" disabled={!canAct} onClick={() => onCreate(name)}>
          Create Room
        </button>
        <div className="room-divider">or join a friend</div>
        <form onSubmit={handleJoin}>
          <label className="room-field">
            Room code
            <input
              className="room-code-input"
              value={code}
              maxLength={ROOM_CODE_LENGTH}
              autoComplete="off"
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
          </label>
          <button
            type="submit"
            className="secondary"
            disabled={!canAct || code.length !== ROOM_CODE_LENGTH}
          >
            Join Room
          </button>
        </form>
        {!connected && <p role="status">Connecting to the server...</p>}
        {notice && <p role="alert">{notice}</p>}
        <FullscreenTip />
      </div>
    </div>
  )
}
