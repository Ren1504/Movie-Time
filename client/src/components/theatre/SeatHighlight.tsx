import type { Ref } from 'react'
import type { Mesh } from 'three'
import { seatConfig } from '../../config/seatConfig'
import { theatreConfig } from '../../config/theatreConfig'
import { velvetGeometry } from './seatModel'

/** A glow placed over the focused seat. The owner moves and shows it directly. */
export function SeatHighlight({ ref }: { ref: Ref<Mesh> }) {
  return (
    <mesh ref={ref} geometry={velvetGeometry} visible={false}>
      {/* The polygon offset draws it on top of the identical seat underneath. */}
      <meshBasicMaterial
        color={theatreConfig.colors.warmEmissive}
        transparent
        opacity={seatConfig.highlightOpacity}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  )
}
