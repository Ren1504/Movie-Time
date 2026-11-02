import { theatreConfig } from '../../config/theatreConfig'
import { createFabricTexture } from '../../utils/proceduralTextures'
import { frameGeometry, velvetGeometry } from './seatModel'
import { StaticInstances } from './StaticInstances'
import { seatPositions } from './theatreLayout'

const { colors } = theatreConfig

const velvetTexture = createFabricTexture(0.3, 4, 128)

export function TheatreSeats() {
  return (
    <group>
      <StaticInstances
        geometry={velvetGeometry}
        positions={seatPositions}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={colors.velvet}
          map={velvetTexture}
          bumpMap={velvetTexture}
          bumpScale={0.5}
          roughness={0.85}
        />
      </StaticInstances>
      <StaticInstances
        geometry={frameGeometry}
        positions={seatPositions}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={colors.seatFrame} roughness={0.6} />
      </StaticInstances>
    </group>
  )
}
