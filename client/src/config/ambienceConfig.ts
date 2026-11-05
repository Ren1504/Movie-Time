import { theatreConfig } from './theatreConfig'

// The house lights: normal while nothing is playing, dimmed while the host is
// live. Both use the same theatre colours; only the light levels change.

export type LightingMode = 'lit' | 'dimmed'

export type AmbienceLightKey = 'ambient' | 'ceilingSpot' | 'screenWash' | 'sconce' | 'doorWash' | 'lobby'

export interface LightingPreset {
  exposure: number
  /** The glowing strips and ceiling fixtures. */
  fixture: string
  lights: Record<AmbienceLightKey, { color: string; intensity: number }>
  particles: { color: string; opacity: number }
}

const { colors, lighting } = theatreConfig

export const lightingPresets: Record<LightingMode, LightingPreset> = {
  lit: {
    exposure: 1,
    fixture: colors.warmEmissive,
    lights: {
      ambient: lighting.ambient,
      ceilingSpot: lighting.ceilingSpots,
      screenWash: lighting.screenWash,
      sconce: lighting.sconces,
      doorWash: lighting.doorWash,
      lobby: lighting.doorWash,
    },
    particles: { color: '#ffe2c4', opacity: 0.1 },
  },
  // Darker than the old Horror preset: mostly the screen's own glow.
  dimmed: {
    exposure: 0.9,
    fixture: '#4a3220',
    lights: {
      ambient: { color: lighting.ambient.color, intensity: 0.09 },
      ceilingSpot: { color: lighting.ceilingSpots.color, intensity: 70 },
      screenWash: { color: lighting.screenWash.color, intensity: 90 },
      sconce: { color: lighting.sconces.color, intensity: 5 },
      doorWash: { color: lighting.doorWash.color, intensity: 5 },
      // The lobby is outside the auditorium, so it stays lit.
      lobby: lighting.doorWash,
    },
    particles: { color: '#ffe2c4', opacity: 0.16 },
  },
}

export const lightingTransition = {
  // Higher values finish sooner. This takes about three seconds.
  response: 1.5,
  particleCount: 400,
  particleRiseSpeed: 0.02,
  particleDrift: 0.05,
  particleSize: 0.04,
}
