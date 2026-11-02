import { Suspense, useState, type Ref } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import type { RoomMember } from '@movie/shared'
import { sceneConfig } from '../../config/sceneConfig'
import { remotePoses } from '../../systems/multiplayer/remotePoses'
import { StaticColliders } from '../../systems/physics/StaticColliders'
import { occupiedSeatIds } from '../../systems/seats/seatOccupancy'
import type { SeatPrompt } from '../../systems/seats/useSeatInteraction'
import { RemoteAvatars } from '../avatars/RemoteAvatars'
import {
  PlayerController,
  type PlayerControllerHandle,
} from '../player/PlayerController'
import { Theatre } from '../theatre/Theatre'
import {
  collisionBoxes,
  spawnLookAt,
  spawnPositionFor,
} from '../theatre/theatreLayout'

const webglFallback = (
  <p className="webgl-fallback">
    This cinema needs WebGL. Please enable hardware acceleration or try another
    browser.
  </p>
)

// Open the page with ?debug=physics to draw the collision shapes.
const physicsDebug =
  new URLSearchParams(window.location.search).get('debug') === 'physics'

interface SceneCanvasProps {
  playerRef: Ref<PlayerControllerHandle>
  members: RoomMember[]
  localMemberId: string
  onPlayerReady: () => void
  onLockChange: (locked: boolean) => void
  onLockError: () => void
  onSeatPromptChange: (prompt: SeatPrompt | null) => void
  onSeatDenied: (message: string) => void
}

export function SceneCanvas({
  playerRef,
  members,
  localMemberId,
  onPlayerReady,
  onLockChange,
  onLockError,
  onSeatPromptChange,
  onSeatDenied,
}: SceneCanvasProps) {
  // Fixed on arrival, so people leaving later doesn't move this player.
  const [spawnPosition] = useState(() =>
    spawnPositionFor(members.findIndex((member) => member.id === localMemberId)),
  )

  return (
    <Canvas
      camera={{ ...sceneConfig.camera }}
      dpr={[1, 2]}
      shadows
      onCreated={({ gl, camera }) => {
        // The room itself never moves, so its shadows are only drawn once.
        // Avatars don't cast shadows, as redrawing them every frame is expensive.
        gl.shadowMap.autoUpdate = false
        gl.shadowMap.needsUpdate = true
        if (physicsDebug) {
          Object.assign(window, {
            debugCamera: camera,
            debugOccupiedSeats: occupiedSeatIds,
            debugRemotePoses: remotePoses,
          })
        }
      }}
      fallback={webglFallback}
    >
      <color attach="background" args={[sceneConfig.background]} />
      <Theatre />
      <RemoteAvatars members={members} localMemberId={localMemberId} />
      <Suspense fallback={null}>
        <Physics timeStep="vary" debug={physicsDebug}>
          <StaticColliders boxes={collisionBoxes} />
          <PlayerController
            ref={playerRef}
            spawnPosition={spawnPosition}
            spawnLookAt={spawnLookAt}
            onReady={onPlayerReady}
            onLockChange={onLockChange}
            onLockError={onLockError}
            onSeatPromptChange={onSeatPromptChange}
            onSeatDenied={onSeatDenied}
          />
        </Physics>
      </Suspense>
    </Canvas>
  )
}
