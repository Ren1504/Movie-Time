import { CylinderGeometry } from 'three'
import { theatreConfig } from '../../config/theatreConfig'
import { ambienceMaterial } from '../../systems/ambience/ambienceState'
import { createBoxBatch, type Box, type Vec3 } from '../../utils/boxBatch'
import { StaticInstances } from './StaticInstances'
import { frontZ, halfWidth } from './theatreLayout'

const { room } = theatreConfig

const BEAM_DROP = 0.5
const BEAM_WIDTH = 0.7
const BEAM_SPACING = 6
const DOWNLIGHT_SPACING = 6

const midZ = frontZ + room.length / 2

const ceilingBoxes: Box[] = [
  {
    center: [0, room.height + 0.15, midZ],
    size: [room.width, 0.3, room.length],
  },
  ...Array.from({ length: Math.floor(room.length / BEAM_SPACING) - 1 }, (_, i): Box => ({
    center: [0, room.height - BEAM_DROP / 2, frontZ + BEAM_SPACING * (i + 1)],
    size: [room.width, BEAM_DROP, BEAM_WIDTH],
  })),
]

const DOWNLIGHT_RADIUS = 0.22
const downlightPositions: Vec3[] = [-halfWidth + 6, 0, halfWidth - 6].flatMap((x) =>
  Array.from({ length: Math.floor(room.length / DOWNLIGHT_SPACING) }, (_, i): Vec3 => [
    x,
    room.height - 0.01,
    frontZ + DOWNLIGHT_SPACING * (i + 0.5),
  ]),
)

const ceiling = createBoxBatch(ceilingBoxes)
const downlight = new CylinderGeometry(DOWNLIGHT_RADIUS, DOWNLIGHT_RADIUS, 0.02, 16)

export function TheatreCeiling() {
  return (
    <group>
      <mesh geometry={ceiling}>
        <meshStandardMaterial ref={ambienceMaterial('ceiling')} roughness={1} />
      </mesh>
      <StaticInstances geometry={downlight} positions={downlightPositions}>
        <meshBasicMaterial ref={ambienceMaterial('fixture')} toneMapped={false} />
      </StaticInstances>
    </group>
  )
}
