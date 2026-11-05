import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  MathUtils,
  type PointsMaterial,
} from 'three'
import {
  lightingPresets,
  lightingTransition,
  type AmbienceLightKey,
} from '../../config/ambienceConfig'
import { theatreConfig } from '../../config/theatreConfig'
import { backZ, frontZ, halfWidth } from '../../components/theatre/theatreLayout'
import { ambience } from './ambienceState'

const { room } = theatreConfig
const { response, particleCount, particleRiseSpeed, particleDrift, particleSize } =
  lightingTransition

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

/** Fades the house lights between lit and dimmed, and drifts the dust in the air. */
export function AmbienceController() {
  const particleMaterialRef = useRef<PointsMaterial>(null)

  useFrame((state, frameDelta) => {
    const preset = lightingPresets[ambience.targetMode]
    const snap = ambience.snap
    ambience.snap = false
    const delta = Math.min(frameDelta, 0.1)
    const blend = snap ? 1 : 1 - Math.exp(-response * delta)
    const towards = (current: number, goal: number) => current + (goal - current) * blend

    ambience.colors.fixture.lerp(target.set(preset.fixture), blend)

    for (const key of Object.keys(preset.lights) as AmbienceLightKey[]) {
      const goal = preset.lights[key]
      ambience.lightColors[key].lerp(target.set(goal.color), blend)
      for (const light of ambience.lightGroups[key]) {
        light.intensity = towards(light.intensity, goal.intensity)
      }
    }

    state.gl.toneMappingExposure = towards(state.gl.toneMappingExposure, preset.exposure)

    const material = particleMaterialRef.current
    if (material) {
      material.color.lerp(target.set(preset.particles.color), blend)
      material.opacity = towards(material.opacity, preset.particles.opacity)

      const time = state.clock.elapsedTime
      const attribute = geometry.getAttribute('position') as BufferAttribute
      for (let i = 0; i < particleCount; i++) {
        const y = particlePositions[i * 3 + 1] + particleRiseSpeed * delta
        particlePositions[i * 3 + 1] = y > room.height ? 0 : y
        particlePositions[i * 3] += Math.sin(time * 0.3 + particlePhases[i]) * particleDrift * delta
      }
      attribute.needsUpdate = true
    }
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        ref={particleMaterialRef}
        map={dotTexture}
        transparent
        opacity={lightingPresets.lit.particles.opacity}
        size={particleSize}
        color={lightingPresets.lit.particles.color}
        blending={AdditiveBlending}
        depthWrite={false}
        fog={false}
        toneMapped={false}
      />
    </points>
  )
}
