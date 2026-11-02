// World convention: 1 unit = 1 metre, +Y is up, the floor sits at Y = 0.
// The cinema screen is at the -Z end of the world, facing +Z.

export const sceneConfig = {
  camera: {
    fov: 60,
    near: 0.1,
    far: 200,
  },
  background: '#050404',
  // Sharp on high-resolution screens, without drawing four times the pixels.
  maxPixelRatio: 1.5,
  frameLimits: {
    streamingFps: 60,
    // Someone watching from another window isn't moving around in the theatre.
    unfocusedFps: 30,
  },
} as const
