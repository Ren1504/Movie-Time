import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { sceneConfig } from '../../config/sceneConfig'
import { getStreamState } from '../../systems/stream/streamStore'

/**
 * Drives rendering, as the canvas doesn't draw by itself. Capture and encoding
 * share the computer with the theatre, so it leaves them room during a stream.
 */
export function FrameLimiter() {
  const advance = useThree((state) => state.advance)

  useEffect(() => {
    let frameId = 0
    let last = 0

    const currentLimit = () => {
      const { streamingFps, unfocusedFps } = sceneConfig.frameLimits
      if (!document.hasFocus()) return unfocusedFps
      return getStreamState().roomStreaming ? streamingFps : Infinity
    }

    const tick = (now: number) => {
      frameId = requestAnimationFrame(tick)
      const interval = 1000 / currentLimit()
      const elapsed = now - last
      if (elapsed < interval) return
      // Keeps the average on target when the screen's refresh rate doesn't divide evenly.
      last = interval === 0 ? now : now - (elapsed % interval)
      advance(now / 1000)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [advance])

  return null
}
