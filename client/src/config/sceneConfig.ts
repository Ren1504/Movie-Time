// World convention: 1 unit = 1 metre, +Y is up, the floor sits at Y = 0.
// The cinema screen will be placed at the -Z end of the world, facing +Z.

export const EYE_HEIGHT = 1.7

export const sceneConfig = {
  camera: {
    fov: 60,
    near: 0.1,
    far: 200,
    position: [0, EYE_HEIGHT, 8],
  },
  background: '#14100f',
  floor: {
    size: 30,
    color: '#3a2a2a',
    gridColor: '#8a6f5a',
    gridSubColor: '#55433a',
  },
  lighting: {
    ambient: { color: '#fff1e0', intensity: 0.5 },
    directional: { color: '#ffffff', intensity: 1.5, position: [5, 10, 6] },
  },
} as const
