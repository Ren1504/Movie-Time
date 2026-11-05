import { MathUtils } from 'three'
import { socket } from '../../network/socket'

// One bite of popcorn: the hand dips into the bucket, comes up to the mouth,
// then goes back down. A player starts one with a left click, and the others in
// the room are told, so their screens play it on that player's avatar.

const BITE_SECONDS = 1.6

// Parts of one bite, as fractions of its length.
const REACH_END = 0.22
const LIFT_END = 0.5
const CHEW_END = 0.72

const ease = (value: number, from: number, to: number) =>
  MathUtils.smoothstep(value, from, to)

export interface BitePose {
  /** 0 at rest, 1 with the hand in the bucket. */
  reach: number
  /** 0 below, 1 with the hand at the mouth. */
  lift: number
}

const RESTING: BitePose = { reach: 0, lift: 0 }

export class Bite {
  private progress = -1

  get active() {
    return this.progress >= 0
  }

  /** Starts a bite, unless one is already under way. Returns whether it started. */
  start(): boolean {
    if (this.active) return false
    this.progress = 0
    return true
  }

  update(delta: number) {
    if (!this.active) return
    this.progress += delta / BITE_SECONDS
    if (this.progress >= 1) this.progress = -1
  }

  pose(): BitePose {
    const t = this.progress
    if (t < 0) return RESTING
    if (t < REACH_END) return { reach: ease(t, 0, REACH_END), lift: 0 }
    if (t < LIFT_END) {
      const lift = ease(t, REACH_END, LIFT_END)
      return { reach: 1 - lift, lift }
    }
    if (t < CHEW_END) return { reach: 0, lift: 1 }
    return { reach: 0, lift: 1 - ease(t, CHEW_END, 1) }
  }
}

/** Other players who took a bite. Each avatar takes its own entry out. */
export const pendingBites = new Set<string>()

socket.on('popcorn:eaten', ({ memberId }) => {
  pendingBites.add(memberId)
})
