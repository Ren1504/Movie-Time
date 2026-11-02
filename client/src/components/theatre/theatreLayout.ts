import { MathUtils } from 'three'
import { theatreConfig } from '../../config/theatreConfig'
import type { Box, Vec3 } from '../../utils/boxBatch'

// Pure layout data derived from the config, with no rendering code.
// Keeping it here lets later phases (collision, seat interaction) reuse it.

const { room, seating, door, stage } = theatreConfig

export const halfWidth = room.width / 2
export const frontZ = room.screenWallZ
export const backZ = room.screenWallZ + room.length

const blockWidth = seating.seatsPerBlock * seating.seatPitch
const sideAisleWidth = (room.width - seating.centerAisleWidth - 2 * blockWidth) / 2
const blockCenterX = seating.centerAisleWidth / 2 + blockWidth / 2
const sideAisleCenterX = halfWidth - sideAisleWidth / 2

export const blockCenters = [-blockCenterX, blockCenterX] as const

export const aisles = [
  { centerX: -sideAisleCenterX, width: sideAisleWidth },
  { centerX: 0, width: seating.centerAisleWidth },
  { centerX: sideAisleCenterX, width: sideAisleWidth },
] as const

export const lastRow = seating.rows - 1
export const rowZ = (row: number) => seating.firstRowZ + row * seating.rowDepth
export const rowFloorY = (row: number) => row * seating.rowRise
export const rowFrontZ = (row: number) => rowZ(row) - seating.rowDepth / 2
// The last tier runs on to the back wall, forming a walkway behind the seats.
const rowBackZ = (row: number) =>
  row === lastRow ? backZ : rowZ(row) + seating.rowDepth / 2

export const rearFloorY = rowFloorY(lastRow)

function tierBox(row: number, centerX: number, width: number): Box {
  const height = rowFloorY(row)
  const depth = rowBackZ(row) - rowFrontZ(row)
  return {
    center: [centerX, height / 2, rowFrontZ(row) + depth / 2],
    size: [width, height, depth],
  }
}

const raisedRows = Array.from({ length: lastRow }, (_, i) => i + 1)

const FLOOR_THICKNESS = 0.2
export const seatingCarpetBoxes: Box[] = [
  {
    center: [0, -FLOOR_THICKNESS / 2, frontZ + room.length / 2],
    size: [room.width, FLOOR_THICKNESS, room.length],
  },
  ...raisedRows.flatMap((row) =>
    blockCenters.map((centerX) => tierBox(row, centerX, blockWidth)),
  ),
]

const AISLE_RUNNER_HEIGHT = 0.01
export const aisleCarpetBoxes: Box[] = aisles.flatMap(({ centerX, width }) => [
  // The first row is at floor level, so its aisle is only a thin runner.
  {
    center: [centerX, AISLE_RUNNER_HEIGHT / 2, rowZ(0)],
    size: [width, AISLE_RUNNER_HEIGHT, seating.rowDepth],
  },
  ...raisedRows.map((row) => tierBox(row, centerX, width)),
])

// Small lights set into each aisle step, one near each edge of the aisle.
export const stepLightPositions: Vec3[] = raisedRows.flatMap((row) =>
  aisles.flatMap(({ centerX, width }) =>
    [-1, 1].map((side): Vec3 => [
      centerX + side * (width / 2 - 0.15),
      rowFloorY(row) - seating.rowRise / 2,
      rowFrontZ(row) - 0.005,
    ]),
  ),
)

// Doors sit in the back wall at the top of each side aisle.
export const doorCenters: Vec3[] = [-sideAisleCenterX, sideAisleCenterX].map(
  (x): Vec3 => [x, rearFloorY + door.height / 2, backZ],
)

// Extent of one seat model around its origin, from TheatreSeats.
const SEAT_FRONT_Z = -0.28
const SEAT_BACK_Z = 0.42
const SEAT_HEIGHT = 1.27
const WALL_COLLIDER_THICKNESS = 1

// Each row block is one solid box, which is far cheaper than one box per seat.
const seatColliderBoxes: Box[] = Array.from({ length: seating.rows }, (_, row) =>
  blockCenters.map((centerX): Box => ({
    center: [
      centerX,
      rowFloorY(row) + SEAT_HEIGHT / 2,
      rowZ(row) + seating.seatOffsetZ + (SEAT_FRONT_Z + SEAT_BACK_Z) / 2,
    ],
    size: [blockWidth, SEAT_HEIGHT, SEAT_BACK_Z - SEAT_FRONT_Z],
  })),
).flat()

const wallOffset = WALL_COLLIDER_THICKNESS / 2
const wallColliderBoxes: Box[] = [
  ...[-1, 1].map((side): Box => ({
    center: [side * (halfWidth + wallOffset), room.height / 2, frontZ + room.length / 2],
    size: [WALL_COLLIDER_THICKNESS, room.height, room.length],
  })),
  ...[frontZ - wallOffset, backZ + wallOffset].map((z): Box => ({
    center: [0, room.height / 2, z],
    size: [room.width, room.height, WALL_COLLIDER_THICKNESS],
  })),
]

const stageColliderBox: Box = {
  center: [0, stage.height / 2, frontZ + stage.depth / 2],
  size: [room.width, stage.height, stage.depth],
}

const FLOOR_COLLIDER_THICKNESS = 0.5
const floorColliderBox: Box = {
  center: [0, -FLOOR_COLLIDER_THICKNESS / 2, frontZ + room.length / 2],
  size: [room.width, FLOOR_COLLIDER_THICKNESS, room.length],
}

// The player walks on one smooth slope instead of the visible stepped tiers.
// It meets the front edge of each tier, so feet stay close to the drawn floor.
const slopeStartZ = rowFrontZ(0)
const slopeEndZ = rowFrontZ(lastRow)
const slopeRun = slopeEndZ - slopeStartZ
const slopeAngle = Math.atan2(rearFloorY, slopeRun)
const seatingSlopeBox: Box = {
  center: [
    0,
    rearFloorY / 2 - (FLOOR_COLLIDER_THICKNESS / 2) * Math.cos(slopeAngle),
    (slopeStartZ + slopeEndZ) / 2 + (FLOOR_COLLIDER_THICKNESS / 2) * Math.sin(slopeAngle),
  ],
  size: [room.width, FLOOR_COLLIDER_THICKNESS, Math.hypot(slopeRun, rearFloorY)],
  rotationX: -slopeAngle,
}

const rearWalkwayBox: Box = {
  center: [0, rearFloorY / 2, (slopeEndZ + backZ) / 2],
  size: [room.width, rearFloorY, backZ - slopeEndZ],
}

const walkableFloorY = (z: number) =>
  (MathUtils.clamp(z, slopeStartZ, slopeEndZ) - slopeStartZ) * Math.tan(slopeAngle)

export interface Seat {
  /** Stable name such as "R3-L07": row 3, left block, seat 7. */
  id: string
  position: Vec3
  /** Where the player's feet go when standing up, in the legroom in front. */
  standPosition: Vec3
}

// Middle of the gap between this seat's front and the back of the row ahead.
const LEGROOM_CENTER_OFFSET = (SEAT_FRONT_Z + SEAT_BACK_Z - seating.rowDepth) / 2

export const seats: Seat[] = Array.from({ length: seating.rows }, (_, row) =>
  blockCenters.flatMap((blockX, block) =>
    Array.from({ length: seating.seatsPerBlock }, (_, seat): Seat => {
      const x = blockX + (seat - (seating.seatsPerBlock - 1) / 2) * seating.seatPitch
      const z = rowZ(row) + seating.seatOffsetZ
      const standZ = z + LEGROOM_CENTER_OFFSET
      const blockName = block === 0 ? 'L' : 'R'
      const seatNumber = String(seat + 1).padStart(2, '0')
      return {
        id: `R${row + 1}-${blockName}${seatNumber}`,
        position: [x, rowFloorY(row), z],
        standPosition: [x, walkableFloorY(standZ), standZ],
      }
    }),
  ),
).flat()

export const seatPositions: Vec3[] = seats.map((seat) => seat.position)
export const seatsById = new Map(seats.map((seat) => [seat.id, seat]))

/** Height of the drawn stepped floor, unlike the smooth slope players walk on. */
export function drawnFloorY(z: number): number {
  const row = Math.floor((z - rowFrontZ(0)) / seating.rowDepth)
  return rowFloorY(MathUtils.clamp(row, 0, lastRow))
}

export const collisionBoxes: Box[] = [
  floorColliderBox,
  seatingSlopeBox,
  rearWalkwayBox,
  ...seatColliderBoxes,
  ...wallColliderBoxes,
  stageColliderBox,
]

const SPAWN_SPACING = 1

/** Spreads players along the rear walkway, as 0, +1, -1, +2, -2 metres and so on. */
export function spawnPositionFor(slot: number): Vec3 {
  const offset = Math.ceil(slot / 2) * (slot % 2 === 1 ? 1 : -1)
  return [offset * SPAWN_SPACING, rearFloorY, backZ - 1.5]
}

export const spawnLookAt: Vec3 = [
  0,
  theatreConfig.screen.bottomY + theatreConfig.screen.height / 2,
  frontZ,
]
