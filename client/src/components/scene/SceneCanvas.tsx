import type { Ref } from 'react'
import { Canvas } from '@react-three/fiber'
import { sceneConfig } from '../../config/sceneConfig'
import {
  PlayerController,
  type PlayerControllerHandle,
} from '../player/PlayerController'
import { Theatre } from '../theatre/Theatre'
import {
  getFloorHeight,
  movementBounds,
  spawnLookAt,
  spawnPosition,
} from '../theatre/theatreLayout'

const webglFallback = (
  <p className="webgl-fallback">
    This cinema needs WebGL. Please enable hardware acceleration or try another
    browser.
  </p>
)

interface SceneCanvasProps {
  playerRef: Ref<PlayerControllerHandle>
  onLockChange: (locked: boolean) => void
  onLockError: () => void
}

export function SceneCanvas({
  playerRef,
  onLockChange,
  onLockError,
}: SceneCanvasProps) {
  return (
    <Canvas
      camera={{ ...sceneConfig.camera }}
      dpr={[1, 2]}
      shadows
      onCreated={({ gl }) => {
        // Nothing in the room moves yet, so shadows are only drawn once.
        gl.shadowMap.autoUpdate = false
        gl.shadowMap.needsUpdate = true
      }}
      fallback={webglFallback}
    >
      <color attach="background" args={[sceneConfig.background]} />
      <Theatre />
      <PlayerController
        ref={playerRef}
        spawnPosition={spawnPosition}
        spawnLookAt={spawnLookAt}
        bounds={movementBounds}
        getFloorHeight={getFloorHeight}
        onLockChange={onLockChange}
        onLockError={onLockError}
      />
    </Canvas>
  )
}
