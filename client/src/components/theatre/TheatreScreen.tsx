import { PlaneGeometry } from 'three'
import { theatreConfig } from '../../config/theatreConfig'
import { ambienceMaterial } from '../../systems/ambience/ambienceState'
import { createBoxBatch } from '../../utils/boxBatch'
import { createFabricTexture } from '../../utils/proceduralTextures'
import { CinemaDisplay } from './CinemaDisplay'
import { frontZ, halfWidth } from './theatreLayout'

const { screen, stage, room } = theatreConfig

const screenZ = frontZ + screen.wallOffset
const screenCenterY = screen.bottomY + screen.height / 2
const screenTopY = screen.bottomY + screen.height

const FOLD_DEPTH = 0.12
const FOLDS_PER_METRE = 1.6

/** A flat sheet with sine-wave folds, facing +Z. */
function createCurtain(width: number, height: number) {
  const geometry = new PlaneGeometry(width, height, Math.ceil(width * 16), 1)
  const position = geometry.getAttribute('position')
  for (let i = 0; i < position.count; i++) {
    const fold = Math.sin(position.getX(i) * FOLDS_PER_METRE * Math.PI * 2)
    position.setZ(i, fold * FOLD_DEPTH)
  }
  geometry.computeVertexNormals()
  return geometry
}

const curtainInnerX = screen.width / 2 + screen.borderWidth
const sideCurtainWidth = halfWidth - curtainInnerX
const sideCurtain = createCurtain(sideCurtainWidth, room.height)
const valanceHeight = room.height - screenTopY - screen.borderWidth
const valance = createCurtain(curtainInnerX * 2, valanceHeight)
const curtainTexture = createFabricTexture(0.3, 2)

const stageBox = createBoxBatch([
  {
    center: [0, stage.height / 2, frontZ + stage.depth / 2],
    size: [room.width, stage.height, stage.depth],
  },
])

export function TheatreScreen() {
  return (
    <group>
      <mesh geometry={stageBox} receiveShadow>
        <meshStandardMaterial ref={ambienceMaterial('stage')} roughness={0.5} />
      </mesh>

      <mesh position={[0, screenCenterY, screenZ - 0.02]}>
        <planeGeometry
          args={[
            screen.width + 2 * screen.borderWidth,
            screen.height + 2 * screen.borderWidth,
          ]}
        />
        <meshStandardMaterial ref={ambienceMaterial('screenBorder')} roughness={1} />
      </mesh>

      <CinemaDisplay position={[0, screenCenterY, screenZ]} />

      {[-1, 1].map((side) => (
        <mesh
          key={side}
          geometry={sideCurtain}
          position={[
            side * (curtainInnerX + sideCurtainWidth / 2),
            room.height / 2,
            screenZ,
          ]}
        >
          <meshStandardMaterial ref={ambienceMaterial('curtain')} map={curtainTexture} roughness={0.9} />
        </mesh>
      ))}
      <mesh
        geometry={valance}
        position={[0, room.height - valanceHeight / 2, screenZ]}
      >
        <meshStandardMaterial ref={ambienceMaterial('curtain')} map={curtainTexture} roughness={0.9} />
      </mesh>
    </group>
  )
}
