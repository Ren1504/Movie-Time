import { theatreConfig } from '../../config/theatreConfig'
import type { Box, Vec3 } from '../../utils/boxBatch'

// Pure layout data derived from the config, with no rendering code.
// Keeping it here lets later phases (collision, seat interaction) reuse it.

const { room, seating, door } = theatreConfig

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

export const seatPositions: Vec3[] = Array.from(
  { length: seating.rows },
  (_, row) =>
    blockCenters.flatMap((blockX) =>
      Array.from({ length: seating.seatsPerBlock }, (_, seat): Vec3 => [
        blockX + (seat - (seating.seatsPerBlock - 1) / 2) * seating.seatPitch,
        rowFloorY(row),
        rowZ(row) + seating.seatOffsetZ,
      ]),
    ),
).flat()

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
