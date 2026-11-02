// A virtual speaker layout for the shared stereo sound. Levels are linear gains.

export const surroundConfig = {
  front: {
    gain: 1,
    centerGain: 0.6,
    // Fraction of the screen's half-width where the left and right speakers sit.
    spread: 0.8,
    height: 6,
  },
  surrounds: {
    gain: 0.3,
    // A short delay keeps voices anchored to the screen, as real cinemas do.
    delaySeconds: 0.02,
    height: 7,
    // Distance from the walls.
    wallOffset: 1,
    // Side speakers along the room, from the screen (0) to the back wall (1).
    sideDepth: 0.55,
  },
  sub: { gain: 0.5, cutoffHz: 120 },
  reverb: { gain: 0.12, seconds: 1.4, decay: 3, cutoffHz: 4000 },
  panner: {
    // How far away a speaker sounds at full level, and how quickly it fades.
    refDistance: 8,
    rolloffFactor: 0.7,
  },
} as const
