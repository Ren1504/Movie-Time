// World convention: 1 unit = 1 metre, +Y is up, the floor sits at Y = 0.
// The cinema screen is at the -Z end of the world, facing +Z.

export const EYE_HEIGHT = 1.7

export const sceneConfig = {
  camera: {
    fov: 60,
    near: 0.1,
    far: 200,
    position: [0, EYE_HEIGHT, 8],
  },
  background: '#050404',
} as const
