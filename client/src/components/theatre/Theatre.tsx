import { TheatreFloor } from './TheatreFloor'
import { TheatreLighting } from './TheatreLighting'

export function Theatre() {
  return (
    <>
      <TheatreLighting />
      <TheatreFloor />

      {/* Temporary 1m reference cube for checking scale and lighting. Removed in Phase 2. */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#b3202a" />
      </mesh>
    </>
  )
}
