import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { NAMEPLATE_HEIGHT } from './avatarModel'

const CANVAS_WIDTH = 512
const CANVAS_HEIGHT = 96
const MAX_FONT_SIZE = 56
const WORLD_WIDTH = 1.6
const WORLD_HEIGHT = (WORLD_WIDTH * CANVAS_HEIGHT) / CANVAS_WIDTH

function createNameTexture(name: string) {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const context = canvas.getContext('2d')!

  // Shrinks long names so they still fit.
  let fontSize = MAX_FONT_SIZE
  context.font = `600 ${fontSize}px system-ui, sans-serif`
  const available = CANVAS_WIDTH - 48
  const measured = context.measureText(name).width
  if (measured > available) {
    fontSize = Math.floor((fontSize * available) / measured)
    context.font = `600 ${fontSize}px system-ui, sans-serif`
  }

  const width = context.measureText(name).width + 40
  context.fillStyle = '#120d0ccc'
  context.beginPath()
  context.roundRect((CANVAS_WIDTH - width) / 2, 8, width, CANVAS_HEIGHT - 16, 16)
  context.fill()

  context.fillStyle = '#f2e6d8'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(name, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

export function Nameplate({ name }: { name: string }) {
  const texture = useMemo(() => createNameTexture(name), [name])
  useEffect(() => () => texture.dispose(), [texture])

  return (
    <sprite position={[0, NAMEPLATE_HEIGHT, 0]} scale={[WORLD_WIDTH, WORLD_HEIGHT, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  )
}
