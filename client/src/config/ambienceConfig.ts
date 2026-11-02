import type { AmbienceId } from '@movie/shared'
import { theatreConfig } from './theatreConfig'

// Every preset is data only. To add one, add its id to the shared list and an
// entry here. The theatre's geometry never changes.

export type AmbienceColorKey =
  | 'wall'
  | 'wallPanel'
  | 'wood'
  | 'screenWall'
  | 'screenBorder'
  | 'ceiling'
  | 'carpet'
  | 'aisleCarpet'
  | 'velvet'
  | 'seatFrame'
  | 'stage'
  | 'curtain'
  | 'doorLeaf'
  | 'fixture'

export type AmbienceLightKey = 'ambient' | 'ceilingSpot' | 'screenWash' | 'sconce' | 'doorWash'

export interface AmbiencePreset {
  label: string
  exposure: number
  colors: Record<AmbienceColorKey, string>
  lights: Record<AmbienceLightKey, { color: string; intensity: number }>
  /** How much the wall lights randomly dip, from 0 (steady) to 1. */
  sconceFlicker: number
  fog: { color: string; density: number }
  particles: {
    color: string
    opacity: number
    /** Metres per second. Negative values fall. */
    riseSpeed: number
    drift: number
    size: number
  }
}

const { colors, lighting } = theatreConfig

export const ambiencePresets: Record<AmbienceId, AmbiencePreset> = {
  classic: {
    label: 'Classic',
    exposure: 1,
    colors: {
      wall: colors.wall,
      wallPanel: colors.wallPanel,
      wood: colors.wood,
      screenWall: colors.screenWall,
      screenBorder: colors.screenBorder,
      ceiling: colors.ceiling,
      carpet: colors.carpet,
      aisleCarpet: colors.aisleCarpet,
      velvet: colors.velvet,
      seatFrame: colors.seatFrame,
      stage: colors.stage,
      curtain: colors.curtain,
      doorLeaf: colors.doorLeaf,
      fixture: colors.warmEmissive,
    },
    lights: {
      ambient: lighting.ambient,
      ceilingSpot: lighting.ceilingSpots,
      screenWash: lighting.screenWash,
      sconce: lighting.sconces,
      doorWash: lighting.doorWash,
    },
    sconceFlicker: 0,
    fog: { color: '#1a1210', density: 0 },
    particles: { color: '#ffe2c4', opacity: 0.1, riseSpeed: 0.02, drift: 0.05, size: 0.04 },
  },
  horror: {
    label: 'Horror',
    exposure: 0.95,
    colors: {
      wall: '#2c2e33',
      wallPanel: '#3e3e42',
      wood: '#2a211b',
      screenWall: '#040404',
      screenBorder: '#020202',
      ceiling: '#101112',
      carpet: '#341c1a',
      aisleCarpet: '#1c1411',
      velvet: '#8e141a',
      seatFrame: '#2c2722',
      stage: '#161210',
      curtain: '#62090e',
      doorLeaf: '#3a1c20',
      fixture: '#ff2a18',
    },
    lights: {
      ambient: { color: '#6a7c98', intensity: 0.5 },
      ceilingSpot: { color: '#9ab0d0', intensity: 380 },
      screenWash: { color: '#a8c4ff', intensity: 70 },
      sconce: { color: '#ff2412', intensity: 40 },
      doorWash: { color: '#a02020', intensity: 24 },
    },
    sconceFlicker: 0.65,
    fog: { color: '#0a0d10', density: 0.022 },
    particles: { color: '#9a9a9a', opacity: 0.3, riseSpeed: -0.12, drift: 0.12, size: 0.045 },
  },
  scifi: {
    label: 'Sci-Fi',
    exposure: 1,
    colors: {
      wall: '#0f1a2a',
      wallPanel: '#1c3048',
      wood: '#151e2b',
      screenWall: '#03060a',
      screenBorder: '#04101c',
      ceiling: '#070b12',
      carpet: '#10202f',
      aisleCarpet: '#070e18',
      velvet: '#154278',
      seatFrame: '#3c4856',
      stage: '#0a1119',
      curtain: '#0e2640',
      doorLeaf: '#1c3048',
      fixture: '#40e0ff',
    },
    lights: {
      ambient: { color: '#6a8cd0', intensity: 0.4 },
      ceilingSpot: { color: '#8cc8ff', intensity: 400 },
      screenWash: { color: '#60d0ff', intensity: 200 },
      sconce: { color: '#10e0ff', intensity: 42 },
      doorWash: { color: '#2a6cff', intensity: 34 },
    },
    sconceFlicker: 0,
    fog: { color: '#0a1a2c', density: 0.012 },
    particles: { color: '#70e8ff', opacity: 0.35, riseSpeed: 0.1, drift: 0.04, size: 0.03 },
  },
  futuristic: {
    label: 'Futuristic',
    exposure: 1,
    colors: {
      wall: '#180e26',
      wallPanel: '#2e1246',
      wood: '#1a0e24',
      screenWall: '#05030a',
      screenBorder: '#0a0414',
      ceiling: '#08040e',
      carpet: '#1a0c28',
      aisleCarpet: '#0c0516',
      velvet: '#541a8e',
      seatFrame: '#2e2e3c',
      stage: '#0c0614',
      curtain: '#361254',
      doorLeaf: '#2e1246',
      fixture: '#ff50d0',
    },
    lights: {
      ambient: { color: '#8a68cc', intensity: 0.36 },
      ceilingSpot: { color: '#c888ff', intensity: 340 },
      screenWash: { color: '#ff68d4', intensity: 180 },
      sconce: { color: '#ff28a8', intensity: 48 },
      doorWash: { color: '#8a28ff', intensity: 38 },
    },
    sconceFlicker: 0,
    fog: { color: '#1a0c2c', density: 0.01 },
    particles: { color: '#ff88e0', opacity: 0.3, riseSpeed: 0.05, drift: 0.08, size: 0.03 },
  },
  cozy: {
    label: 'Cozy',
    exposure: 1.05,
    colors: {
      wall: '#3e2719',
      wallPanel: '#604025',
      wood: '#633e22',
      screenWall: '#0c0805',
      screenBorder: '#1c120a',
      ceiling: '#1c130c',
      carpet: '#5e3d22',
      aisleCarpet: '#301d11',
      velvet: '#8e4e22',
      seatFrame: '#40291a',
      stage: '#22160d',
      curtain: '#7c3c16',
      doorLeaf: '#5a3620',
      fixture: '#ffb060',
    },
    lights: {
      ambient: { color: '#ffd2a4', intensity: 0.62 },
      ceilingSpot: { color: '#ffbc78', intensity: 440 },
      screenWash: { color: '#ffcc98', intensity: 90 },
      sconce: { color: '#ffa444', intensity: 58 },
      doorWash: { color: '#ffb468', intensity: 42 },
    },
    sconceFlicker: 0.08,
    fog: { color: '#2a1a0e', density: 0.005 },
    particles: { color: '#ffb468', opacity: 0.22, riseSpeed: 0.04, drift: 0.07, size: 0.035 },
  },
}

export const ambienceTransition = {
  // Higher values finish sooner. This takes about three seconds.
  response: 1.5,
  particleCount: 400,
}
