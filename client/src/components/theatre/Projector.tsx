import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  MathUtils,
  MeshBasicMaterial,
  MeshStandardMaterial,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three'
import { theatreConfig } from '../../config/theatreConfig'
import { ambience } from '../../systems/ambience/ambienceState'
import { createBoxBatch, type Box } from '../../utils/boxBatch'
import { backZ, frontZ, projectionPort } from './theatreLayout'

// A projection booth behind the back wall, like a real cinema. The projector
// shines through a small window. While the host is live, the lens glows and a
// soft beam reaches the screen. Each client decides this from the room's
// streaming state, so there's nothing extra to sync.

const { projector, screen, room } = theatreConfig
const WALL_BACK = backZ + room.wallThickness
const LENS_Z = WALL_BACK + projector.lensDepth
const LENS_Y = projector.height
// Higher values switch on and off sooner. About one second.
const RESPONSE = 3
const SHIMMER_SPEED = 13
// The model is built at real size, then enlarged a little so it reads from the seats.
const MODEL_SCALE = 1.3
const BOOTH_FLOOR = LENS_Y - 1.3
const FRAME = 0.08

const metal = new MeshStandardMaterial({ color: '#2b2c31', roughness: 0.45, metalness: 0.6 })
const trim = new MeshStandardMaterial({ color: '#7a7c82', roughness: 0.35, metalness: 0.8 })
const reelMaterial = new MeshStandardMaterial({ color: '#45474d', roughness: 0.5, metalness: 0.7 })
const boothMaterial = new MeshStandardMaterial({ color: '#16171a', roughness: 0.95 })
const frameMaterial = new MeshStandardMaterial({ color: '#2a2a2e', roughness: 0.4, metalness: 0.6 })
// The window glass catches a little of the projector's light while it runs.
const glassOff = new Color('#a9bccf')
const glassOn = new Color(projector.beamColor)
const GLASS_OPACITY_OFF = 0.07
const GLASS_OPACITY_ON = 0.22
const glassMaterial = new MeshBasicMaterial({
  color: glassOff.clone(),
  transparent: true,
  opacity: GLASS_OPACITY_OFF,
  depthWrite: false,
  toneMapped: false,
})
const lensOff = new Color('#121212')
const lensOn = new Color(projector.lensColor)
const lensMaterial = new MeshBasicMaterial({ color: lensOff.clone(), toneMapped: false })

const bodyGeometry = new BoxGeometry(0.6, 0.5, 0.9)
const lensBarrelGeometry = new CylinderGeometry(0.1, 0.12, 0.28, 16).rotateX(Math.PI / 2)
const lensGeometry = new CylinderGeometry(0.085, 0.085, 0.01, 16).rotateX(Math.PI / 2)
const reelGeometry = new CylinderGeometry(0.28, 0.28, 0.05, 20).rotateZ(Math.PI / 2)
const reelArmGeometry = new BoxGeometry(0.04, 0.3, 0.04)
// From the booth floor up to the bottom of the projector's body.
const PEDESTAL_HEIGHT = (LENS_Y - 0.25 * MODEL_SCALE - BOOTH_FLOOR) / MODEL_SCALE
const pedestalGeometry = new BoxGeometry(0.4, PEDESTAL_HEIGHT, 0.5)

// The booth's floor, ceiling and walls, seen from inside through the window.
const { boothWidth, boothDepth, boothHeight } = projector
const boothCenterZ = WALL_BACK + boothDepth / 2
const PANEL = 0.1
const booth = createBoxBatch([
  { center: [0, BOOTH_FLOOR - PANEL / 2, boothCenterZ], size: [boothWidth, PANEL, boothDepth] },
  {
    center: [0, BOOTH_FLOOR + boothHeight + PANEL / 2, boothCenterZ],
    size: [boothWidth, PANEL, boothDepth],
  },
  {
    center: [0, BOOTH_FLOOR + boothHeight / 2, WALL_BACK + boothDepth + PANEL / 2],
    size: [boothWidth, boothHeight, PANEL],
  },
  ...[-1, 1].map((side): Box => ({
    center: [side * (boothWidth / 2 + PANEL / 2), BOOTH_FLOOR + boothHeight / 2, boothCenterZ],
    size: [PANEL, boothHeight, boothDepth],
  })),
])

// A metal frame lining the window, through the depth of the wall.
const { left, right, bottom, top } = projectionPort
const frameDepth = room.wallThickness + 0.1
const frameZ = backZ + room.wallThickness / 2 - 0.05
const portFrame = createBoxBatch([
  { center: [left - FRAME / 2, projector.height, frameZ], size: [FRAME, top - bottom + 2 * FRAME, frameDepth] },
  { center: [right + FRAME / 2, projector.height, frameZ], size: [FRAME, top - bottom + 2 * FRAME, frameDepth] },
  { center: [0, bottom - FRAME / 2, frameZ], size: [right - left, FRAME, frameDepth] },
  { center: [0, top + FRAME / 2, frameZ], size: [right - left, FRAME, frameDepth] },
])

// The beam is a pyramid from the lens to the screen. Its back faces are drawn,
// and for each pixel the shader steps along the line of sight from the camera,
// adding up how much beam it passes through. The light is soft at the edges,
// strongest near the lens, and gone by the time it reaches the screen, so the
// picture stays clean.
const SCREEN_Z = frontZ + screen.wallOffset
const SCREEN_CENTER_Y = screen.bottomY + screen.height / 2
// A little larger than the screen, so the soft edges fit inside the shape.
const HULL_SCALE = 1.08

function createBeamGeometry() {
  const halfWidth = (screen.width / 2) * HULL_SCALE
  const halfHeight = (screen.height / 2) * HULL_SCALE
  const z = SCREEN_Z + 0.05
  // Apex, then the four corners at the screen.
  const points = [
    [0, LENS_Y, LENS_Z],
    [-halfWidth, SCREEN_CENTER_Y - halfHeight, z],
    [halfWidth, SCREEN_CENTER_Y - halfHeight, z],
    [halfWidth, SCREEN_CENTER_Y + halfHeight, z],
    [-halfWidth, SCREEN_CENTER_Y + halfHeight, z],
  ]
  const faces = [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1, 1, 3, 2, 1, 4, 3]
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(points.flat()), 3))
  geometry.setIndex(faces)
  return geometry
}

const beamGeometry = createBeamGeometry()
const beamMaterial = new ShaderMaterial({
  uniforms: {
    uLens: { value: new Vector3(0, LENS_Y, LENS_Z) },
    uScreen: { value: new Vector3(0, SCREEN_CENTER_Y, SCREEN_Z) },
    uHalfSize: { value: new Vector2(screen.width / 2, screen.height / 2) },
    uColor: { value: new Color(projector.beamColor) },
    uStrength: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec3 vWorld;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorld = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uLens;
    uniform vec3 uScreen;
    uniform vec2 uHalfSize;
    uniform vec3 uColor;
    uniform float uStrength;
    varying vec3 vWorld;
    const int STEPS = 32;

    float density(vec3 p) {
      // How far from the lens towards the screen, from 0 to 1.
      float along = (uLens.z - p.z) / (uLens.z - uScreen.z);
      if (along <= 0.0 || along >= 1.0) return 0.0;
      vec2 center = mix(uLens.xy, uScreen.xy, along);
      vec2 offset = abs(p.xy - center) / (uHalfSize * along);
      float edge = smoothstep(1.0, 0.45, offset.x) * smoothstep(1.0, 0.45, offset.y);
      // Brightest at the lens, fading out before the screen.
      float fade = pow(1.0 - along, 1.1) * smoothstep(1.0, 0.85, along);
      return edge * fade;
    }

    void main() {
      vec3 start = cameraPosition;
      vec3 ray = vWorld - start;
      float rayLength = length(ray);
      float stepLength = rayLength / float(STEPS);
      // A small random offset per pixel hides the steps as fine grain.
      float jitter = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      float light = 0.0;
      for (int i = 0; i < STEPS; i++) {
        light += density(start + ray * ((float(i) + jitter) / float(STEPS)));
      }
      gl_FragColor = vec4(uColor * light * stepLength * uStrength, 1.0);
    }
  `,
  transparent: true,
  blending: AdditiveBlending,
  depthWrite: false,
  side: BackSide,
  toneMapped: false,
})

export function Projector() {
  const power = useRef(0)

  useFrame(({ clock }, delta) => {
    const on = ambience.targetMode === 'dimmed' ? 1 : 0
    power.current = MathUtils.damp(power.current, on, RESPONSE, Math.min(delta, 0.1))
    const shimmer = 1 + 0.06 * Math.sin(clock.elapsedTime * SHIMMER_SPEED) * Math.sin(clock.elapsedTime * 3.1)
    beamMaterial.uniforms.uStrength.value = projector.beamStrength * power.current * shimmer
    beamMaterial.visible = power.current > 0.005
    lensMaterial.color.lerpColors(lensOff, lensOn, power.current)
    glassMaterial.color.lerpColors(glassOff, glassOn, power.current)
    glassMaterial.opacity = MathUtils.lerp(GLASS_OPACITY_OFF, GLASS_OPACITY_ON, power.current)
  })

  return (
    <>
      <mesh geometry={booth} material={boothMaterial} />
      <mesh geometry={portFrame} material={frameMaterial} />
      <mesh position={[0, projector.height, backZ + room.wallThickness / 2]} material={glassMaterial}>
        <planeGeometry args={[right - left, top - bottom]} />
      </mesh>
      <group position={[0, LENS_Y, LENS_Z]} scale={MODEL_SCALE}>
        {/* The body sits behind the lens, further into the booth. */}
        <mesh geometry={bodyGeometry} material={metal} position={[0, 0, 0.55]} />
        <mesh geometry={lensBarrelGeometry} material={trim} />
        <mesh geometry={lensGeometry} material={lensMaterial} position={[0, 0, -0.145]} />
        {/* Two reels on top, like a classic film projector. */}
        {[0.25, 0.85].map((z) => (
          <group key={z} position={[0, 0.25, z]}>
            <mesh geometry={reelArmGeometry} material={trim} position={[0, 0.15, 0]} />
            <mesh geometry={reelGeometry} material={reelMaterial} position={[0, 0.32, 0]} />
          </group>
        ))}
        <mesh
          geometry={pedestalGeometry}
          material={metal}
          position={[0, -0.25 - PEDESTAL_HEIGHT / 2, 0.55]}
        />
      </group>
      <mesh geometry={beamGeometry} material={beamMaterial} frustumCulled={false} renderOrder={2} />
    </>
  )
}
