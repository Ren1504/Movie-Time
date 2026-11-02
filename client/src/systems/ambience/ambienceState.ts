import { Color, type Light, type Material } from 'three'
import type { AmbienceId } from '@movie/shared'
import {
  ambiencePresets,
  type AmbienceColorKey,
  type AmbienceLightKey,
} from '../../config/ambienceConfig'

// Materials and lights share these Color objects, so blending one value changes
// everything using it. Nothing has to re-render or rebuild during a transition.

const start = ambiencePresets.classic

function createColors<K extends string>(source: Record<K, string>) {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, new Color(value as string)]),
  ) as Record<K, Color>
}

const lightColorSource = Object.fromEntries(
  Object.entries(start.lights).map(([key, light]) => [key, light.color]),
) as Record<AmbienceLightKey, string>

export const ambience = {
  targetId: 'classic' as AmbienceId,
  /** Set when the look should change at once, such as on arrival in a room. */
  snap: false,
  colors: createColors(start.colors),
  lightColors: createColors(lightColorSource),
  lightGroups: {
    ambient: new Set<Light>(),
    ceilingSpot: new Set<Light>(),
    screenWash: new Set<Light>(),
    sconce: new Set<Light>(),
    doorWash: new Set<Light>(),
  } as Record<AmbienceLightKey, Set<Light>>,
}

export function setAmbienceTarget(id: AmbienceId, snap = false) {
  ambience.targetId = id
  if (snap) ambience.snap = true
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
