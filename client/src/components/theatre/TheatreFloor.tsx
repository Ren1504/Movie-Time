import { sceneConfig } from '../../config/sceneConfig'

const { size, color, gridColor, gridSubColor } = sceneConfig.floor

export function TheatreFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* One grid cell = 1 metre. Raised slightly to avoid z-fighting with the floor. */}
      <gridHelper
        args={[size, size, gridColor, gridSubColor]}
        position={[0, 0.002, 0]}
      />
    </group>
  )
}
