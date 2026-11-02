import { useMemo } from 'react'
import { Object3D } from 'three'
import { theatreConfig } from '../../config/theatreConfig'
import type { Vec3 } from '../../utils/boxBatch'
import { doorCenters, halfWidth, rearFloorY } from './theatreLayout'

const { ambient, ceilingSpots, screenWash, sconces, doorWash } = theatreConfig.lighting

function CeilingSpot({ position }: { position: Vec3 }) {
  const target = useMemo(() => new Object3D(), [])
  return (
    <>
      <primitive object={target} position={[position[0], 0, position[2]]} />
      <spotLight
        color={ceilingSpots.color}
        intensity={ceilingSpots.intensity}
        angle={ceilingSpots.angle}
        penumbra={ceilingSpots.penumbra}
        position={position}
        target={target}
        castShadow
        shadow-mapSize={[ceilingSpots.shadowMapSize, ceilingSpots.shadowMapSize]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
    </>
  )
}

export function TheatreLighting() {
  return (
    <>
      <ambientLight color={ambient.color} intensity={ambient.intensity} />
      {ceilingSpots.positions.map((position) => (
        <CeilingSpot key={position[2]} position={position} />
      ))}
      <pointLight
        color={screenWash.color}
        intensity={screenWash.intensity}
        position={screenWash.position}
      />
      {[-1, 1].flatMap((side) =>
        sconces.zPositions.map((z) => (
          <pointLight
            key={`${side}:${z}`}
            color={sconces.color}
            intensity={sconces.intensity}
            position={[side * (halfWidth - sconces.wallOffset), sconces.y, z]}
          />
        )),
      )}
      {doorCenters.map(([x, , z]) => (
        <pointLight
          key={x}
          color={doorWash.color}
          intensity={doorWash.intensity}
          position={[
            x - Math.sign(x) * doorWash.inwardOffset,
            rearFloorY + doorWash.heightAboveFloor,
            z - doorWash.wallOffset,
          ]}
        />
      ))}
    </>
  )
}
