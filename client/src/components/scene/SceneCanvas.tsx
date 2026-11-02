import { Canvas } from '@react-three/fiber'
import { sceneConfig } from '../../config/sceneConfig'
import { Theatre } from '../theatre/Theatre'

const webglFallback = (
  <p className="webgl-fallback">
    This cinema needs WebGL. Please enable hardware acceleration or try another
    browser.
  </p>
)

export function SceneCanvas() {
  return (
    <Canvas
      camera={{ ...sceneConfig.camera }}
      dpr={[1, 2]}
      fallback={webglFallback}
    >
      <color attach="background" args={[sceneConfig.background]} />
      <Theatre />
    </Canvas>
  )
}
