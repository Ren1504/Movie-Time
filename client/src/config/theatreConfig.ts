import { SEATS_PER_BLOCK, SEAT_ROWS } from '@movie/shared'

// Dimensions are in metres. Derived positions live in theatre/theatreLayout.ts.

export const theatreConfig = {
  room: {
    width: 26,
    length: 22,
    height: 14,
    screenWallZ: -11,
    wallThickness: 0.3,
  },
  seating: {
    rows: SEAT_ROWS,
    seatsPerBlock: SEATS_PER_BLOCK,
    seatPitch: 0.6,
    rowDepth: 1.6,
    rowRise: 0.35,
    firstRowZ: -2,
    centerAisleWidth: 2,
    // Offset from the tier centre, so the legroom ends up in front of the seat.
    seatOffsetZ: 0.15,
  },
  screen: {
    width: 20,
    height: 11.25,
    bottomY: 1.6,
    wallOffset: 0.4,
    borderWidth: 0.35,
  },
  stage: {
    depth: 2,
    height: 0.8,
  },
  door: {
    width: 2,
    height: 2.6,
    frameWidth: 0.1,
  },
  // A small room through the right wall, between the stage and the first row.
  // The popcorn booth's position comes from POPCORN_BOOTH in the shared package.
  lobby: {
    doorZ: -6.2,
    // Along X, out from the theatre wall.
    width: 6,
    frontZ: -9.5,
    backZ: -2.9,
    height: 3.4,
  },
  booth: {
    counterLength: 3,
    counterDepth: 0.6,
    counterHeight: 1.05,
    // The shelf behind the counter, which holds the popcorn machine. It's only
    // as long as the machine, leaving room for the vendor beside it.
    shelfDepth: 0.45,
    shelfHeight: 1,
    shelfLength: 1.1,
    // How far along the counter the vendor stands from its middle.
    vendorOffsetZ: 1.05,
    vendorShirt: '#c8102e',
    vendorHat: '#f5efe6',
    machineSize: [0.5, 0.8, 0.8],
    // The three buckets to pick from, spread along the counter.
    displaySpacing: 0.7,
    stripeColors: ['#c8102e', '#f5efe6'],
    flavorColors: { caramel: '#b8741f', salted: '#f4ecd6', cheese: '#ffc21a' },
  },
  colors: {
    carpet: '#4a1820',
    aisleCarpet: '#26151a',
    velvet: '#8e1420',
    seatFrame: '#33231d',
    wall: '#2b1518',
    wallPanel: '#4a1f24',
    wood: '#4a2c1a',
    ceiling: '#120d0c',
    screenWall: '#070606',
    screenBorder: '#020202',
    idleScreen: '#a8a59d',
    curtain: '#6d0f18',
    stage: '#1c120c',
    doorLeaf: '#5e1a20',
    brass: '#b08a4a',
    warmEmissive: '#ffb56b',
    exitSign: '#2fe07a',
  },
  lighting: {
    ambient: { color: '#ffe2c4', intensity: 0.45 },
    ceilingSpots: {
      color: '#ffd9ae',
      intensity: 540,
      angle: 1.0,
      penumbra: 0.7,
      shadowMapSize: 4096,
      positions: [
        [0, 13.6, -5],
        [0, 13.6, 6],
      ],
    },
    screenWash: {
      color: '#e8e6ff',
      intensity: 150,
      position: [0, 7, -8],
    },
    sconces: {
      color: '#ffb56b',
      intensity: 34,
      y: 9,
      wallOffset: 1.6,
      zPositions: [-7, 1, 9],
    },
    doorWash: {
      color: '#ffcf9a',
      intensity: 34,
      heightAboveFloor: 4,
      wallOffset: 3,
      // Moved towards the room centre to avoid a hot spot on the side wall.
      inwardOffset: 4,
    },
  },
} as const
