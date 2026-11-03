import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  CanvasTexture,
  SRGBColorSpace,
  Vector3,
  type Sprite,
  type SpriteMaterial,
} from 'three'
import {
  REACTIONS,
  isSoundReaction,
  type Reaction,
  type RoomMember,
  type SoundReaction,
} from '@movie/shared'
import { remotePoses } from '../../systems/multiplayer/remotePoses'
import { playEmoteSound } from '../../systems/social/emoteSounds'
import { reactionQueue } from '../../systems/social/reactionQueue'
import { drawnFloorY, seatsById } from '../theatre/theatreLayout'

const POOL_SIZE = 16
const LIFETIME_SECONDS = 1.8
const RISE_METRES = 1
const SPRITE_SIZE = 0.6
const ABOVE_STANDING = 2.5
const ABOVE_SEATED = 1.9
const OWN_DISTANCE = 2.5

// The sound reactions are names, so they are shown with these.
const SOUND_EMOJI: Record<SoundReaction, string> = { whistle: '😗', clap: '👏' }

function createEmojiTexture(reaction: Reaction) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const context = canvas.getContext('2d')!
  context.font = "96px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif"
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(isSoundReaction(reaction) ? SOUND_EMOJI[reaction] : reaction, 64, 72)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

const emojiTextures = new Map(REACTIONS.map((reaction) => [reaction, createEmojiTexture(reaction)]))
const forward = new Vector3()
const position = new Vector3()
const slots = Array.from({ length: POOL_SIZE }, () => ({ age: LIFETIME_SECONDS, startY: 0 }))

interface ReactionBurstsProps {
  members: RoomMember[]
  localMemberId: string
}

/** A small fixed set of sprites, reused so reactions never allocate during play. */
export function ReactionBursts({ members, localMemberId }: ReactionBurstsProps) {
  const spriteRefs = useRef<(Sprite | null)[]>([])

  useFrame(({ camera }, delta) => {
    while (reactionQueue.length > 0) {
      const { memberId, reaction } = reactionQueue.shift()!
      const member = members.find(({ id }) => id === memberId)
      const seat = member?.seatId ? seatsById.get(member.seatId) : undefined
      const pose = remotePoses.get(memberId)
      if (memberId === localMemberId) {
        camera.getWorldDirection(forward)
        position.copy(camera.position).addScaledVector(forward, OWN_DISTANCE)
      } else if (seat) {
        position.set(seat.position[0], seat.position[1] + ABOVE_SEATED, seat.position[2])
      } else if (pose) {
        position.set(pose.x, drawnFloorY(pose.z) + ABOVE_STANDING, pose.z)
      } else {
        continue
      }

      // Heard even when every bubble is in use.
      if (isSoundReaction(reaction)) playEmoteSound(reaction, position.x, position.y, position.z)

      const index = slots.findIndex((slot) => slot.age >= LIFETIME_SECONDS)
      const sprite = spriteRefs.current[index]
      if (!sprite) continue
      sprite.position.copy(position)

      const material = sprite.material as SpriteMaterial
      material.map = emojiTextures.get(reaction) ?? null
      material.needsUpdate = true
      slots[index].age = 0
      slots[index].startY = sprite.position.y
    }

    slots.forEach((slot, index) => {
      const sprite = spriteRefs.current[index]
      if (!sprite) return
      sprite.visible = slot.age < LIFETIME_SECONDS
      if (!sprite.visible) return
      slot.age += delta
      const progress = Math.min(slot.age / LIFETIME_SECONDS, 1)
      sprite.position.y = slot.startY + progress * RISE_METRES
      ;(sprite.material as SpriteMaterial).opacity = 1 - progress * progress
    })
  })

  return slots.map((_, index) => (
    <sprite
      key={index}
      ref={(sprite) => {
        spriteRefs.current[index] = sprite
      }}
      scale={[SPRITE_SIZE, SPRITE_SIZE, 1]}
      visible={false}
    >
      <spriteMaterial transparent depthWrite={false} fog={false} toneMapped={false} />
    </sprite>
  ))
}
