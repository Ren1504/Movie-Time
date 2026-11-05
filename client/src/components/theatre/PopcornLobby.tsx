import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils, type Group } from 'three'
import { POPCORN_BOOTH } from '@movie/shared'
import { theatreConfig } from '../../config/theatreConfig'
import { ambienceLight, ambienceMaterial } from '../../systems/ambience/ambienceState'
import { boothFocus } from '../../systems/popcorn/boothFocus'
import { createBoxBatch, type Box } from '../../utils/boxBatch'
import { createSignTexture } from '../../utils/proceduralTextures'
import { FLAVOR_NAMES } from '../popcorn/popcornModel'
import { PopcornBucket } from '../popcorn/PopcornBucket'
import { PopcornVendor } from './PopcornVendor'
import {
  boothDisplay,
  counterBox,
  lobbyCenterX,
  lobbyCenterZ,
  lobbyLength,
  lobbyMaxX,
  lobbyMinX,
} from './theatreLayout'

const { room, lobby, booth } = theatreConfig
const shell = room.wallThickness
const FLOOR_THICKNESS = 0.2
const LIGHT_PANEL_SIZE = 0.8
const LIGHT_INTENSITY = 14
const DISPLAY_SCALE = 1.4
// The bucket being looked at grows a little, to show which one E will take.
const FOCUSED_SCALE = 1.6
const FOCUS_RESPONSE = 12

const floor = createBoxBatch([
  {
    // Reaches under the doorway, so there's no gap at the threshold.
    center: [(lobbyMinX - shell + lobbyMaxX) / 2, -FLOOR_THICKNESS / 2, lobbyCenterZ],
    size: [lobbyMaxX - lobbyMinX + shell, FLOOR_THICKNESS, lobbyLength],
  },
])

const walls = createBoxBatch([
  {
    center: [lobbyMaxX + shell / 2, lobby.height / 2, lobbyCenterZ],
    size: [shell, lobby.height, lobbyLength + 2 * shell],
  },
  ...[lobby.frontZ - shell / 2, lobby.backZ + shell / 2].map((z): Box => ({
    center: [lobbyCenterX, lobby.height / 2, z],
    size: [lobby.width, lobby.height, shell],
  })),
])

const ceiling = createBoxBatch([
  {
    center: [lobbyCenterX, lobby.height + shell / 2, lobbyCenterZ],
    size: [lobby.width, shell, lobbyLength],
  },
])

const lightPanels = createBoxBatch(
  [-1, 1].map((side): Box => ({
    center: [lobbyCenterX, lobby.height - 0.01, lobbyCenterZ + side * 1.6],
    size: [LIGHT_PANEL_SIZE, 0.02, LIGHT_PANEL_SIZE],
  })),
)

// The counter's top overhangs its body a little, on the customer's side.
const TOP_THICKNESS = 0.05
const counterBody = createBoxBatch([counterBox])
const counterTop = createBoxBatch([
  {
    center: [counterBox.center[0] - 0.04, booth.counterHeight + TOP_THICKNESS / 2, POPCORN_BOOTH.z],
    size: [booth.counterDepth + 0.08, TOP_THICKNESS, booth.counterLength + 0.08],
  },
])

const shelfX = lobbyMaxX - booth.shelfDepth / 2
const shelf = createBoxBatch([
  {
    center: [shelfX, booth.shelfHeight / 2, POPCORN_BOOTH.z],
    size: [booth.shelfDepth, booth.shelfHeight, booth.shelfLength],
  },
])

// A glass cabinet with a red frame, like the machines in real cinemas.
const [machineDepth, machineHeight, machineWidth] = booth.machineSize
const machineBottom = booth.shelfHeight
const FRAME = 0.04
const machineFrame = createBoxBatch([
  {
    center: [shelfX, machineBottom + FRAME / 2, POPCORN_BOOTH.z],
    size: [machineDepth, FRAME, machineWidth],
  },
  {
    center: [shelfX, machineBottom + machineHeight + 0.06, POPCORN_BOOTH.z],
    size: [machineDepth + 0.04, 0.12, machineWidth + 0.04],
  },
  ...[-1, 1].flatMap((side) =>
    [-1, 1].map((end): Box => ({
      center: [
        shelfX + side * (machineDepth / 2 - FRAME / 2),
        machineBottom + machineHeight / 2,
        POPCORN_BOOTH.z + end * (machineWidth / 2 - FRAME / 2),
      ],
      size: [FRAME, machineHeight, FRAME],
    })),
  ),
])
const machineGlass = createBoxBatch([
  {
    center: [shelfX, machineBottom + machineHeight / 2, POPCORN_BOOTH.z],
    size: [machineDepth - 0.02, machineHeight, machineWidth - 0.02],
  },
])
const machinePopcorn = createBoxBatch([
  {
    center: [shelfX, machineBottom + 0.15, POPCORN_BOOTH.z],
    size: [machineDepth - 0.06, 0.22, machineWidth - 0.06],
  },
])

const flavorSigns = boothDisplay.map(({ flavor }) =>
  createSignTexture(FLAVOR_NAMES[flavor].toUpperCase(), '#2b1518'),
)
const LABEL_WIDTH = 0.42

export function PopcornLobby() {
  const displayRefs = useRef<(Group | null)[]>([])

  useFrame((_, delta) => {
    boothDisplay.forEach(({ flavor }, index) => {
      const display = displayRefs.current[index]
      if (!display) return
      const target = boothFocus.flavor === flavor ? FOCUSED_SCALE : DISPLAY_SCALE
      display.scale.setScalar(MathUtils.damp(display.scale.x, target, FOCUS_RESPONSE, delta))
    })
  })

  return (
    <group>
      <mesh geometry={floor} receiveShadow>
        <meshStandardMaterial ref={ambienceMaterial('aisleCarpet')} roughness={1} />
      </mesh>
      <mesh geometry={walls}>
        <meshStandardMaterial ref={ambienceMaterial('wall')} roughness={0.95} />
      </mesh>
      <mesh geometry={ceiling}>
        <meshStandardMaterial ref={ambienceMaterial('ceiling')} roughness={1} />
      </mesh>
      <mesh geometry={lightPanels}>
        <meshBasicMaterial ref={ambienceMaterial('fixture')} toneMapped={false} />
      </mesh>
      <pointLight
        ref={ambienceLight('lobby')}
        intensity={LIGHT_INTENSITY}
        position={[lobbyCenterX, lobby.height - 0.5, lobbyCenterZ]}
      />

      <mesh geometry={counterBody}>
        <meshStandardMaterial color={booth.stripeColors[0]} roughness={0.6} />
      </mesh>
      <mesh geometry={counterTop}>
        <meshStandardMaterial ref={ambienceMaterial('wood')} roughness={0.4} />
      </mesh>
      <mesh geometry={shelf}>
        <meshStandardMaterial ref={ambienceMaterial('wood')} roughness={0.6} />
      </mesh>
      <PopcornVendor
        position={[
          (counterBox.center[0] + booth.counterDepth / 2 + lobbyMaxX) / 2,
          0,
          POPCORN_BOOTH.z + booth.vendorOffsetZ,
        ]}
      />
      <mesh geometry={machineFrame}>
        <meshStandardMaterial color={booth.stripeColors[0]} roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh geometry={machinePopcorn}>
        <meshStandardMaterial
          color={booth.flavorColors.salted}
          emissive={booth.flavorColors.caramel}
          emissiveIntensity={0.25}
          roughness={0.9}
        />
      </mesh>
      <mesh geometry={machineGlass} renderOrder={1}>
        <meshStandardMaterial
          color="#fff3d6"
          transparent
          opacity={0.18}
          roughness={0.1}
          depthWrite={false}
        />
      </mesh>

      {boothDisplay.map(({ flavor, position }, index) => (
        <group key={flavor}>
          <PopcornBucket
            ref={(display) => {
              displayRefs.current[index] = display
            }}
            flavor={flavor}
            position={position}
            scale={DISPLAY_SCALE}
          />
          <mesh
            position={[
              counterBox.center[0] - booth.counterDepth / 2 - 0.005,
              booth.counterHeight - 0.15,
              position[2],
            ]}
            rotation={[0, -Math.PI / 2, 0]}
          >
            <planeGeometry args={[LABEL_WIDTH, LABEL_WIDTH * (96 / 256)]} />
            <meshBasicMaterial map={flavorSigns[index]} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
