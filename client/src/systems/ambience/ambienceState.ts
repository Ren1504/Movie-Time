import { Color, type Light, type Material } from 'three'
import {
  lightingPresets,
  type AmbienceLightKey,
  type LightingMode,
} from '../../config/ambienceConfig'
import { theatreConfig } from '../../config/theatreConfig'

// Materials and lights share these Color objects, so blending one value changes
// everything using it. Nothing has to re-render or rebuild during a transition.

const { colors } = theatreConfig
const start = lightingPresets.lit

const materialColors = {
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
  // The only one that changes: fixtures glow less when the lights are down.
  fixture: start.fixture,
}

export type AmbienceColorKey = keyof typeof materialColors

function createColors<K extends string>(source: Record<K, string>) {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, new Color(value as string)]),
  ) as Record<K, Color>
}

const lightColorSource = Object.fromEntries(
  Object.entries(start.lights).map(([key, light]) => [key, light.color]),
) as Record<AmbienceLightKey, string>

export const ambience = {
  targetMode: 'lit' as LightingMode,
  /** Set when the lights should change at once, such as on arrival in a room. */
  snap: false,
  colors: createColors(materialColors),
  lightColors: createColors(lightColorSource),
  lightGroups: Object.fromEntries(
    Object.keys(start.lights).map((key) => [key, new Set<Light>()]),
  ) as Record<AmbienceLightKey, Set<Light>>,
}

/** Fades the house lights towards a mode over a few seconds. */
export function setLightingTarget(mode: LightingMode) {
  ambience.targetMode = mode
}

/** Jumps straight to the current mode, without fading. */
export function snapLighting() {
  ambience.snap = true
}

const materialRefs = new Map<AmbienceColorKey, (material: Material | null) => void>()

/** A ref for a material. The same function is returned each time, so it's stable. */
export function ambienceMaterial(key: AmbienceColorKey) {
  let ref = materialRefs.get(key)
  if (!ref) {
    ref = (material) => {
      if (material) (material as Material & { color: Color }).color = ambience.colors[key]
    }
    materialRefs.set(key, ref)
  }
  return ref
}

const lightRefs = new Map<AmbienceLightKey, (light: Light) => () => void>()

/** A ref for a light. It blends with all other lights in the same group. */
export function ambienceLight(key: AmbienceLightKey) {
  let ref = lightRefs.get(key)
  if (!ref) {
    ref = (light) => {
      light.color = ambience.lightColors[key]
      ambience.lightGroups[key].add(light)
      return () => ambience.lightGroups[key].delete(light)
    }
    lightRefs.set(key, ref)
  }
  return ref
}
