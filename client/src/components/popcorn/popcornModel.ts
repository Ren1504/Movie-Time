import {
  CanvasTexture,
  CylinderGeometry,
  IcosahedronGeometry,
  MeshStandardMaterial,
  SRGBColorSpace,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { POPCORN_FLAVORS, type PopcornFlavor } from '@movie/shared'
import { theatreConfig } from '../../config/theatreConfig'

// A striped bucket with a heap of popcorn on top. The origin is at the bottom
// centre, and sizes are for a bucket held in the hand.

export const BUCKET_HEIGHT = 0.17
const RIM_RADIUS = 0.09
const BASE_RADIUS = 0.065
const STRIPES = 8
const PUFF_COUNT = 22

const { stripeColors, flavorColors } = theatreConfig.booth

export const bucketGeometry = new CylinderGeometry(
  RIM_RADIUS,
  BASE_RADIUS,
  BUCKET_HEIGHT,
  16,
).translate(0, BUCKET_HEIGHT / 2, 0)

/** Small lumps heaped into a dome. A fixed pattern, so every bucket matches. */
export const popcornGeometry = mergeGeometries(
  Array.from({ length: PUFF_COUNT }, (_, i) => {
    const angle = i * 2.4
    const spread = Math.sqrt(i / PUFF_COUNT) * RIM_RADIUS * 0.85
    const lift = (1 - spread / RIM_RADIUS) * 0.05
    return new IcosahedronGeometry(0.022 + (i % 3) * 0.004, 0)
      .translate(Math.cos(angle) * spread, BUCKET_HEIGHT + lift, Math.sin(angle) * spread)
      .toNonIndexed()
  }),
)

function createStripeTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 8
  const context = canvas.getContext('2d')!
  const stripeWidth = canvas.width / STRIPES
  for (let i = 0; i < STRIPES; i++) {
    context.fillStyle = stripeColors[i % 2]
    context.fillRect(i * stripeWidth, 0, stripeWidth, canvas.height)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

export const bucketMaterial = new MeshStandardMaterial({
  map: createStripeTexture(),
  roughness: 0.7,
})

export const popcornMaterials = Object.fromEntries(
  POPCORN_FLAVORS.map((flavor) => [
    flavor,
    new MeshStandardMaterial({ color: flavorColors[flavor], roughness: 0.9 }),
  ]),
) as Record<PopcornFlavor, MeshStandardMaterial>

export const FLAVOR_NAMES: Record<PopcornFlavor, string> = {
  caramel: 'Caramel',
  salted: 'Salted',
  cheese: 'Cheese',
}
