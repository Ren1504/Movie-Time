import { lazy, Suspense } from 'react'
import { RoomLobby } from './components/ui/RoomLobby'
import { RoomPanel } from './components/ui/RoomPanel'
import { useRoom } from './network/useRoom'

// The 3D scene, physics and streaming are most of the download, so the lobby doesn't wait for them.
const TheatreView = lazy(() =>
  import('./components/scene/TheatreView').then((module) => ({ default: module.TheatreView })),
)

const loadingScreen = (
  <div className="theatre-overlay">
    <p role="status">Entering the theatre...</p>
  </div>
)

function App() {
  const {
    current,
    connected,
    restoring,
    busy,
    notice,
    announcement,
    announce,
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
      <Suspense fallback={loadingScreen}>
        <TheatreView
          members={current.room.members}
          localMemberId={current.memberId}
          ownerId={current.room.ownerId}
          ambience={current.room.ambience}
          onSeatDenied={announce}
          renderRoomPanel={(interactive) => (
            <RoomPanel
              room={current.room}
              memberId={current.memberId}
              connected={connected}
              interactive={interactive}
              onLeave={leaveRoom}
              onClose={closeRoom}
              inviteOrigin={current.inviteOrigin}
            />
          )}
        />
      </Suspense>
      {announcement && (
        <div className="room-announcement" role="status">
          {announcement}
        </div>
      )}
    </>
  )
}

export default App
