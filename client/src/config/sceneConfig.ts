// World convention: 1 unit = 1 metre, +Y is up, the floor sits at Y = 0.
// The cinema screen is at the -Z end of the world, facing +Z.

export const sceneConfig = {
  camera: {
    fov: 60,
    near: 0.1,
    far: 200,
  },
  background: '#050404',
} as const
