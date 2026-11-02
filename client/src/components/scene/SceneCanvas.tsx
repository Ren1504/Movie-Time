import { Canvas } from '@react-three/fiber'
import { sceneConfig } from '../../config/sceneConfig'
import { InspectionCamera } from '../debug/InspectionCamera'
import type { Viewpoint } from '../debug/viewpoints'
import { Theatre } from '../theatre/Theatre'

const webglFallback = (
  <p className="webgl-fallback">
    This cinema needs WebGL. Please enable hardware acceleration or try another
    browser.
  </p>
)

export function SceneCanvas({ viewpoint }: { viewpoint: Viewpoint }) {
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
      <InspectionCamera viewpoint={viewpoint} />
    </Canvas>
  )
}
