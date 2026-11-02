import { EYE_HEIGHT } from '../../config/sceneConfig'
import type { Vec3 } from '../../utils/boxBatch'
import { theatreConfig } from '../../config/theatreConfig'
import {
  backZ,
  doorCenters,
  frontZ,
  rearFloorY,
  rowFloorY,
  rowZ,
  seatPositions,
} from '../theatre/theatreLayout'

const SEATED_EYE_HEIGHT = 1.15

const { screen } = theatreConfig
const screenCenter: Vec3 = [0, screen.bottomY + screen.height / 2, frontZ]
const aisleSeatX = theatreConfig.seating.centerAisleWidth / 2 + theatreConfig.seating.seatPitch / 2
const [leftDoorX] = doorCenters[0]
const firstRowEndZ = seatPositions[0][2]

export interface Viewpoint {
  id: string
  label: string
  position: Vec3
  target: Vec3
}

// Temporary inspection cameras for Phase 2. Removed when Phase 3 adds walking.
export const viewpoints: Viewpoint[] = [
  {
    id: 'middle',
    label: 'Middle seat',
    position: [aisleSeatX, rowFloorY(2) + SEATED_EYE_HEIGHT, rowZ(2)],
    target: screenCenter,
  },
  {
    id: 'front',
    label: 'Front row',
    position: [aisleSeatX, SEATED_EYE_HEIGHT, rowZ(0)],
    target: screenCenter,
  },
  {
    id: 'rear',
    label: 'Rear walkway',
    position: [0, rearFloorY + EYE_HEIGHT, backZ - 1.5],
    target: screenCenter,
  },
  {
    id: 'stage',
    label: 'From the stage',
    position: [0, 3, frontZ + 4],
    target: [0, 4, backZ],
  },
  {
    id: 'aisle',
    label: 'Side aisle',
    position: [leftDoorX, rowFloorY(2) + EYE_HEIGHT, rowZ(2)],
    target: [6, 4, 2],
  },
  {
    id: 'doors',
    label: 'Doors',
    position: [leftDoorX + 6, rearFloorY + EYE_HEIGHT, backZ - 2],
    target: [leftDoorX, rearFloorY + 1.4, backZ],
  },
  {
    id: 'seats',
    label: 'Seat close-up',
    position: [0.1, 1.5, firstRowEndZ - 1.75],
    target: [1.2, 0.7, firstRowEndZ],
  },
]
