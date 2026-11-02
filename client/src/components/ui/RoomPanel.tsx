import type { RoomSnapshot } from '@movie/shared'
import { VolumeControl } from './VolumeControl'

interface RoomPanelProps {
  room: RoomSnapshot
  memberId: string
  connected: boolean
  /** The mouse is captured during play, so buttons only appear when paused. */
  interactive: boolean
  onLeave: () => void
  onClose: () => void
  inviteOrigin: string | null
}

function copyText(text: string) {
  if (navigator.clipboard) {
    void navigator.clipboard.writeText(text)
    return
  }
  // Browsers only offer the clipboard API over a secure connection.
  const field = document.createElement('textarea')
  field.value = text
  document.body.append(field)
  field.select()
  document.execCommand('copy')
  field.remove()
}

export function RoomPanel({
  room,
  memberId,
  connected,
  interactive,
  onLeave,
  onClose,
  inviteOrigin,
}: RoomPanelProps) {
  const isOwner = room.ownerId === memberId
  const inviteLink = `${inviteOrigin ?? window.location.origin}/?room=${room.code}`

  return (
    <aside className="room-panel">
      <div className="room-panel-code">
        Room <strong>{room.code}</strong>
        {interactive && (
          <button
            type="button"
            onClick={() => copyText(room.code)}
          >
            Copy
          </button>
        )}
      </div>
      {room.streaming && <span className="live-pill">LIVE</span>}
      <ul>
        {room.members.map((member) => (
          <li key={member.id} className={member.connected ? undefined : 'room-member-away'}>
            {member.name}
            {member.id === memberId && ' (you)'}
            {member.id === room.ownerId && <span className="room-owner-badge">Host</span>}
            {!member.connected && <span> reconnecting...</span>}
          </li>
        ))}
      </ul>
      {!connected && <p role="status">Connection lost. Reconnecting...</p>}
      {interactive && !isOwner && <VolumeControl />}
      {interactive && (
        <button type="button" onClick={() => copyText(inviteLink)}>
          Copy Invite Link
        </button>
      )}
      {interactive && (
        <button type="button" onClick={onLeave}>
          Leave Room
        </button>
      )}
      {interactive && isOwner && (
        <button type="button" onClick={onClose}>
          Close Room for Everyone
        </button>
      )}
    </aside>
  )
}
