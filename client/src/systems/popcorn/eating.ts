import { MathUtils } from 'three'

// Timing for eating popcorn while seated. Each screen times its own bites, as
// nobody can tell whether someone else's are exactly in step.

const BITE_SECONDS = 2.4
const FIRST_GAP = [3, 8] as const
const GAP = [8, 20] as const

// Parts of one bite, as fractions of its length.
const REACH_END = 0.22
const LIFT_END = 0.5
const CHEW_END = 0.72

const between = ([low, high]: readonly [number, number]) => low + Math.random() * (high - low)
const ease = (value: number, from: number, to: number) =>
  MathUtils.smoothstep(value, from, to)

export interface BitePose {
  /** 0 at rest, 1 with the hand in the bucket. */
  reach: number
  /** 0 below, 1 with the hand at the mouth. */
  lift: number
}

const RESTING: BitePose = { reach: 0, lift: 0 }

export class EatingTimer {
  private wait = between(FIRST_GAP)
  private progress = -1

  /** Advances the timer. Returns true at the moment the popcorn reaches the mouth. */
  update(delta: number, eating: boolean): boolean {
    if (!eating) {
      // A bite in progress finishes, so the hand never snaps back.
      if (this.progress < 0) this.wait = between(FIRST_GAP)
    }
    if (this.progress >= 0) {
      const before = this.progress
      this.progress += delta / BITE_SECONDS
      const atMouth = before < LIFT_END && this.progress >= LIFT_END
      if (this.progress >= 1) {
        this.progress = -1
        this.wait = between(GAP)
      }
      return atMouth
    }
    if (!eating) return false
    this.wait -= delta
    if (this.wait <= 0) this.progress = 0
    return false
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
