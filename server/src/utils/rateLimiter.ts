/** Allows a set number of events per key within a sliding window of time. */
export class RateLimiter {
  private readonly events = new Map<string, number[]>()
  private readonly limit: number
  private readonly windowMs: number

  constructor(limit: number, windowMs: number) {
    this.limit = limit
    this.windowMs = windowMs
    // Without this, every address ever seen would stay in memory.
    setInterval(() => {
      for (const key of this.events.keys()) this.recent(key)
    }, windowMs).unref()
  }

  private recent(key: string) {
    const cutoff = Date.now() - this.windowMs
    const times = (this.events.get(key) ?? []).filter((time) => time > cutoff)
    if (times.length > 0) this.events.set(key, times)
    else this.events.delete(key)
    return times
  }

  isBlocked(key: string) {
    return this.recent(key).length >= this.limit
  }

  /** Counts the event if there's room for it, and says whether there was. */
  tryRecord(key: string) {
    const times = this.recent(key)
    if (times.length >= this.limit) return false
    this.events.set(key, [...times, Date.now()])
    return true
  }
}
