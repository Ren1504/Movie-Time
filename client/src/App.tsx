import { TheatreView } from './components/scene/TheatreView'
import { RoomLobby } from './components/ui/RoomLobby'
import { RoomPanel } from './components/ui/RoomPanel'
import { useRoom } from './network/useRoom'

function App() {
  const {
    current,
    connected,
    restoring,
    busy,
    notice,
    announcement,
    createRoom,
    joinRoom,
    leaveRoom,
    closeRoom,
  } = useRoom()

  if (restoring) {
    return (
      <div className="theatre-overlay">
        <p role="status">Returning to your room...</p>
      </div>
    )
  }

  if (!current) {
    return (
      <RoomLobby
        connected={connected}
        busy={busy}
        notice={notice}
        onCreate={createRoom}
        onJoin={joinRoom}
      />
    )
  }

  return (
    <>
      <TheatreView
        renderRoomPanel={(interactive) => (
          <RoomPanel
            room={current.room}
            memberId={current.memberId}
            connected={connected}
            interactive={interactive}
            onLeave={leaveRoom}
            onClose={closeRoom}
          />
        )}
      />
      {announcement && (
        <div className="room-announcement" role="status">
          {announcement}
        </div>
      )}
    </>
  )
}

export default App
