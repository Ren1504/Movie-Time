import type { Reaction } from '@movie/shared'
import { socket } from '../../network/socket'

/** Reactions waiting to be shown. The 3D scene empties this each frame. */
export const reactionQueue: { memberId: string; reaction: Reaction }[] = []

const MAX_WAITING = 20

socket.on('reaction:shown', (shown) => {
  if (reactionQueue.length < MAX_WAITING) reactionQueue.push(shown)
})
