import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  MathUtils,
  type FogExp2,
  type PointsMaterial,
} from 'three'
import {
  ambiencePresets,
  ambienceTransition,
  type AmbienceColorKey,
  type AmbienceLightKey,
} from '../../config/ambienceConfig'
import { theatreConfig } from '../../config/theatreConfig'
import { backZ, frontZ, halfWidth } from '../../components/theatre/theatreLayout'
import { ambience } from './ambienceState'

const { room } = theatreConfig
const { response, particleCount } = ambienceTransition
const FLICKER_SPEED = 9

const target = new Color()

function createDotTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 32
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16)
  gradient.addColorStop(0, '#ffffff')
  gradient.addColorStop(1, '#ffffff00')
  context.fillStyle = gradient
  context.fillRect(0, 0, 32, 32)
  return new CanvasTexture(canvas)
}

const dotTexture = createDotTexture()

const particlePhases = new Float32Array(particleCount)
const particlePositions = new Float32Array(particleCount * 3)
for (let i = 0; i < particleCount; i++) {
  particlePositions[i * 3] = MathUtils.randFloatSpread(halfWidth * 2)
  particlePositions[i * 3 + 1] = Math.random() * room.height
  particlePositions[i * 3 + 2] = MathUtils.randFloat(frontZ, backZ)
  particlePhases[i] = Math.random() * Math.PI * 2
}
const geometry = new BufferGeometry()
geometry.setAttribute('position', new BufferAttribute(particlePositions, 3))

/** Blends the room towards the chosen preset, and owns the fog and particles. */
export function AmbienceController() {
  const particleMaterialRef = useRef<PointsMaterial>(null)
  const particleRiseRef = useRef(ambiencePresets.classic.particles.riseSpeed)
  const particleDriftRef = useRef(ambiencePresets.classic.particles.drift)

  useFrame((state, frameDelta) => {
    const preset = ambiencePresets[ambience.targetId]
    const snap = ambience.snap
    ambience.snap = false
    const blend = snap ? 1 : 1 - Math.exp(-response * Math.min(frameDelta, 0.1))
    const towards = (current: number, goal: number) => current + (goal - current) * blend

    for (const key of Object.keys(preset.colors) as AmbienceColorKey[]) {
      ambience.colors[key].lerp(target.set(preset.colors[key]), blend)
    }

    const time = state.clock.elapsedTime
    for (const key of Object.keys(preset.lights) as AmbienceLightKey[]) {
      const goal = preset.lights[key]
      ambience.lightColors[key].lerp(target.set(goal.color), blend)
      let index = 0
      for (const light of ambience.lightGroups[key]) {
        let intensity = goal.intensity
        if (key === 'sconce' && preset.sconceFlicker > 0) {
          // Layered waves, offset per light, so each one flickers on its own.
          const wave = Math.sin(time * FLICKER_SPEED + index * 2.4) * Math.sin(time * 2.3 + index)
          intensity *= 1 - preset.sconceFlicker * Math.max(0, wave)
        }
        light.intensity = towards(light.intensity, intensity)
        index++
      }
    }

    state.gl.toneMappingExposure = towards(state.gl.toneMappingExposure, preset.exposure)

    const fog = state.scene.fog as FogExp2 | null
    if (fog) {
      fog.color.lerp(target.set(preset.fog.color), blend)
      fog.density = towards(fog.density, preset.fog.density)
    }

    const material = particleMaterialRef.current
    if (material) {
      const { particles } = preset
      material.color.lerp(target.set(particles.color), blend)
      material.opacity = towards(material.opacity, particles.opacity)
      material.size = towards(material.size, particles.size)
      particleRiseRef.current = towards(particleRiseRef.current, particles.riseSpeed)
      particleDriftRef.current = towards(particleDriftRef.current, particles.drift)

      const delta = Math.min(frameDelta, 0.1)
      const attribute = geometry.getAttribute('position') as BufferAttribute
      for (let i = 0; i < particleCount; i++) {
        const y = particlePositions[i * 3 + 1] + particleRiseRef.current * delta
        particlePositions[i * 3 + 1] = y > room.height ? 0 : y < 0 ? room.height : y
        particlePositions[i * 3] +=
          Math.sin(time * 0.3 + particlePhases[i]) * particleDriftRef.current * delta
      }
      attribute.needsUpdate = true
    }
  })

  return (
    <>
      {/* Always present, as adding fog later would rebuild every material. */}
      <fogExp2 attach="fog" args={[ambiencePresets.classic.fog.color, 0]} />
      <points geometry={geometry} frustumCulled={false}>
        <pointsMaterial
          ref={particleMaterialRef}
          map={dotTexture}
          transparent
          opacity={ambiencePresets.classic.particles.opacity}
          size={ambiencePresets.classic.particles.size}
          color={ambiencePresets.classic.particles.color}
          blending={AdditiveBlending}
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </points>
    </>
  )
}
