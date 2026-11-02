import { Suspense, type Ref } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { sceneConfig } from '../../config/sceneConfig'
import { StaticColliders } from '../../systems/physics/StaticColliders'
import {
  PlayerController,
  type PlayerControllerHandle,
} from '../player/PlayerController'
import { Theatre } from '../theatre/Theatre'
import {
  collisionBoxes,
  spawnLookAt,
  spawnPosition,
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
  onPlayerReady: () => void
  onLockChange: (locked: boolean) => void
  onLockError: () => void
}

export function SceneCanvas({
  playerRef,
  onPlayerReady,
  onLockChange,
  onLockError,
}: SceneCanvasProps) {
  return (
    <Canvas
      camera={{ ...sceneConfig.camera }}
      dpr={[1, 2]}
      shadows
      onCreated={({ gl, camera }) => {
        // Nothing in the room moves yet, so shadows are only drawn once.
        gl.shadowMap.autoUpdate = false
        gl.shadowMap.needsUpdate = true
        if (physicsDebug) {
          ;(window as unknown as { debugCamera: unknown }).debugCamera = camera
        }
      }}
      fallback={webglFallback}
    >
      <color attach="background" args={[sceneConfig.background]} />
      <Theatre />
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
          />
        </Physics>
      </Suspense>
    </Canvas>
  )
}
