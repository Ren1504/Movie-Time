import { theatreConfig } from '../../config/theatreConfig'
import { ambienceMaterial } from '../../systems/ambience/ambienceState'
import { createBoxBatch, type Box } from '../../utils/boxBatch'
import { createFabricTexture, createSignTexture } from '../../utils/proceduralTextures'
import {
  backZ,
  doorCenters,
  frontZ,
  halfWidth,
  rearFloorY,
  rightWallAroundDoorway,
} from './theatreLayout'

const { room, door, colors, lighting, lobby } = theatreConfig

const WALL_PANEL_DEPTH = 0.08
const WAINSCOT_DEPTH = 0.06
// The wood lower wall clears the doors and the top of the seating.
const WAINSCOT_TOP = rearFloorY + door.height + 0.6
const PANEL_BOTTOM = WAINSCOT_TOP + 0.3
const PANEL_TOP = room.height - 0.6
const PANEL_SPACING = 4
const PANEL_WIDTH = 3.7

const shell = room.wallThickness
const midZ = frontZ + room.length / 2

const wallBoxes: Box[] = [
  {
    center: [-(halfWidth + shell / 2), room.height / 2, midZ],
    size: [shell, room.height, room.length + 2 * shell],
  },
  ...rightWallAroundDoorway(
    halfWidth + shell / 2,
    shell,
    frontZ - shell,
    backZ + shell,
    room.height,
  ),
  {
    center: [0, room.height / 2, backZ + shell / 2],
    size: [room.width, room.height, shell],
  },
]

const screenWallBox: Box = {
  center: [0, room.height / 2, frontZ - shell / 2],
  size: [room.width, room.height, shell],
}

const panelCount = Math.floor(room.length / PANEL_SPACING)
const panelHeight = PANEL_TOP - PANEL_BOTTOM
const panelCenterY = PANEL_BOTTOM + panelHeight / 2
const sidePanelBoxes: Box[] = [-1, 1].flatMap((side) =>
  Array.from({ length: panelCount }, (_, i): Box => ({
    center: [
      side * (halfWidth - WALL_PANEL_DEPTH / 2),
      panelCenterY,
      frontZ + PANEL_SPACING * (i + 0.5),
    ],
    size: [WALL_PANEL_DEPTH, panelHeight, PANEL_WIDTH],
  })),
)
const backPanelBoxes: Box[] = Array.from(
  { length: Math.floor(room.width / PANEL_SPACING) },
  (_, i): Box => ({
    center: [
      -room.width / 2 + PANEL_SPACING * (i + 0.5) + (room.width % PANEL_SPACING) / 2,
      panelCenterY,
      backZ - WALL_PANEL_DEPTH / 2,
    ],
    size: [PANEL_WIDTH, panelHeight, WALL_PANEL_DEPTH],
  }),
)

const woodBoxes: Box[] = [
  {
    center: [-(halfWidth - WAINSCOT_DEPTH / 2), WAINSCOT_TOP / 2, midZ],
    size: [WAINSCOT_DEPTH, WAINSCOT_TOP, room.length],
  },
  ...rightWallAroundDoorway(
    halfWidth - WAINSCOT_DEPTH / 2,
    WAINSCOT_DEPTH,
    frontZ,
    backZ,
    WAINSCOT_TOP,
  ),
]

const walls = createBoxBatch(wallBoxes)
const screenWall = createBoxBatch([screenWallBox])
const panels = createBoxBatch([...sidePanelBoxes, ...backPanelBoxes])
const wood = createBoxBatch(woodBoxes)

const leafWidth = door.width / 2 - 0.01
const doorDepth = 0.06
const frameBoxes: Box[] = doorCenters.flatMap(([x, y, z]): Box[] => {
  const frameZ = z - doorDepth / 2
  const f = door.frameWidth
  return [
    { center: [x - door.width / 2 - f / 2, y, frameZ], size: [f, door.height + f, doorDepth] },
    { center: [x + door.width / 2 + f / 2, y, frameZ], size: [f, door.height + f, doorDepth] },
    { center: [x, y + door.height / 2 + f / 2, frameZ], size: [door.width + 2 * f, f, doorDepth] },
  ]
})
const leafBoxes: Box[] = doorCenters.flatMap(([x, y, z]) =>
  [-1, 1].map((side): Box => ({
    center: [x + side * (door.width / 4), y, z - doorDepth / 2],
    size: [leafWidth, door.height, doorDepth],
  })),
)
const handleBoxes: Box[] = doorCenters.flatMap(([x, y, z]) =>
  [-1, 1].map((side): Box => ({
    center: [x + side * 0.1, y, z - doorDepth - 0.03],
    size: [0.03, 0.5, 0.03],
  })),
)
// Lines the lobby doorway, through the full depth of the wall and its wood.
const LINING_DEPTH = shell + WAINSCOT_DEPTH + 0.06
const liningX = halfWidth + (shell - WAINSCOT_DEPTH) / 2
const liningBoxes: Box[] = [
  ...[-1, 1].map((side): Box => ({
    center: [liningX, door.height / 2, lobby.doorZ + side * (door.width / 2 - door.frameWidth / 2)],
    size: [LINING_DEPTH, door.height, door.frameWidth],
  })),
  {
    center: [liningX, door.height - door.frameWidth / 2, lobby.doorZ],
    size: [LINING_DEPTH, door.frameWidth, door.width],
  },
]
const doorFrames = createBoxBatch([...frameBoxes, ...liningBoxes])
const doorLeaves = createBoxBatch(leafBoxes)
const doorHandles = createBoxBatch(handleBoxes)

const SIGN_WIDTH = 0.6
const SIGN_HEIGHT = 0.22
const exitTexture = createSignTexture('EXIT', colors.exitSign)
const popcornSignTexture = createSignTexture('POPCORN', colors.brass)
const POPCORN_SIGN_WIDTH = 1

const sconceBoxes: Box[] = [-1, 1].flatMap((side) =>
  lighting.sconces.zPositions.map((z): Box => ({
    center: [side * (halfWidth - 0.12), lighting.sconces.y, z],
    size: [0.08, 1.4, 0.2],
  })),
)
const sconces = createBoxBatch(sconceBoxes)
const wallTexture = createFabricTexture(0.25, 3)

export function TheatreWalls() {
  return (
    <group>
      <mesh geometry={walls} receiveShadow>
        <meshStandardMaterial ref={ambienceMaterial('wall')} roughness={0.95} />
      </mesh>
      <mesh geometry={screenWall}>
        <meshStandardMaterial ref={ambienceMaterial('screenWall')} roughness={1} />
      </mesh>
      <mesh geometry={panels} receiveShadow>
        <meshStandardMaterial
          ref={ambienceMaterial('wallPanel')}
          map={wallTexture}
          bumpMap={wallTexture}
          bumpScale={0.4}
          roughness={1}
        />
      </mesh>
      <mesh geometry={wood} receiveShadow>
        <meshStandardMaterial ref={ambienceMaterial('wood')} roughness={0.55} />
      </mesh>
      <mesh geometry={doorFrames}>
        <meshStandardMaterial ref={ambienceMaterial('wood')} roughness={0.5} />
      </mesh>
      <mesh geometry={doorLeaves} receiveShadow>
        <meshStandardMaterial ref={ambienceMaterial('doorLeaf')} roughness={0.6} />
      </mesh>
      <mesh geometry={doorHandles}>
        <meshStandardMaterial color={colors.brass} metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh geometry={sconces}>
        <meshBasicMaterial ref={ambienceMaterial('fixture')} toneMapped={false} />
      </mesh>
      {doorCenters.map(([x, y, z]) => (
        <mesh
          key={x}
          position={[x, y + door.height / 2 + 0.35, z - 0.02]}
          rotation={[0, Math.PI, 0]}
        >
          <planeGeometry args={[SIGN_WIDTH, SIGN_HEIGHT]} />
          <meshBasicMaterial map={exitTexture} toneMapped={false} />
        </mesh>
      ))}
      <mesh
        position={[halfWidth - WAINSCOT_DEPTH - 0.02, door.height + 0.35, lobby.doorZ]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <planeGeometry args={[POPCORN_SIGN_WIDTH, SIGN_HEIGHT * (POPCORN_SIGN_WIDTH / SIGN_WIDTH)]} />
        <meshBasicMaterial map={popcornSignTexture} toneMapped={false} />
      </mesh>
    </group>
  )
}
