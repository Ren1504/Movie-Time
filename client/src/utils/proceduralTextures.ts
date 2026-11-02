import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

/**
 * Creates a tiling greyscale speckle, used to tint a material's colour and as
 * its bump map. `contrast` is the brightness range below white, from 0 to 1.
 */
export function createFabricTexture(
  contrast: number,
  repeatsPerMetre: number,
  size = 256,
): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')!
  const image = context.createImageData(size, size)

  for (let i = 0; i < image.data.length; i += 4) {
    const value = 255 * (1 - Math.random() * contrast)
    image.data[i] = value
    image.data[i + 1] = value
    image.data[i + 2] = value
    image.data[i + 3] = 255
  }
  context.putImageData(image, 0, 0)

  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(repeatsPerMetre, repeatsPerMetre)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

/** Creates a lit sign with white text on a coloured background. */
export function createSignTexture(text: string, background: string): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 96
  const context = canvas.getContext('2d')!
  context.fillStyle = background
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#ffffff'
  context.font = 'bold 64px system-ui, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, canvas.width / 2, canvas.height / 2)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}
