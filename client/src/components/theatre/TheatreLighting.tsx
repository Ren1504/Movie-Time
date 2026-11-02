import { sceneConfig } from '../../config/sceneConfig'

const { ambient, directional } = sceneConfig.lighting

export function TheatreLighting() {
  return (
    <>
      <ambientLight color={ambient.color} intensity={ambient.intensity} />
      <directionalLight
        color={directional.color}
        intensity={directional.intensity}
        position={directional.position}
      />
    </>
  )
}
