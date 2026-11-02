import { ambienceMaterial } from '../../systems/ambience/ambienceState'
import { createBoxBatch } from '../../utils/boxBatch'
import { createFabricTexture } from '../../utils/proceduralTextures'
import { StaticInstances } from './StaticInstances'
import {
  aisleCarpetBoxes,
  seatingCarpetBoxes,
  stepLightPositions,
} from './theatreLayout'

const seatingCarpet = createBoxBatch(seatingCarpetBoxes)
const aisleCarpet = createBoxBatch(aisleCarpetBoxes)
const carpetTexture = createFabricTexture(0.45, 2)
const stepLight = createBoxBatch([{ center: [0, 0, 0], size: [0.22, 0.03, 0.01] }])

export function TheatreFloor() {
  return (
    <group>
      <mesh geometry={seatingCarpet} receiveShadow>
        <meshStandardMaterial
          ref={ambienceMaterial('carpet')}
          map={carpetTexture}
          bumpMap={carpetTexture}
          bumpScale={0.6}
          roughness={1}
        />
      </mesh>
      <mesh geometry={aisleCarpet} receiveShadow>
        <meshStandardMaterial
          ref={ambienceMaterial('aisleCarpet')}
          map={carpetTexture}
          bumpMap={carpetTexture}
          bumpScale={0.6}
          roughness={1}
        />
      </mesh>
      <StaticInstances geometry={stepLight} positions={stepLightPositions}>
        <meshBasicMaterial ref={ambienceMaterial('fixture')} toneMapped={false} />
      </StaticInstances>
    </group>
  )
}
