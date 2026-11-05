import { useEffect, useState } from 'react'

const isMac = /Mac/.test(navigator.userAgent)

// F11 full screen doesn't use the Fullscreen API, so it's spotted by the window
// filling the whole display instead.
function isFullscreen() {
  return (
    document.fullscreenElement !== null ||
    (window.innerWidth >= screen.width - 1 && window.innerHeight >= screen.height - 1)
  )
}

/** Suggests going full screen. Hidden once the browser already is. */
export function FullscreenTip() {
  const [fullscreen, setFullscreen] = useState(isFullscreen)

  useEffect(() => {
    const update = () => setFullscreen(isFullscreen())
    window.addEventListener('resize', update)
    document.addEventListener('fullscreenchange', update)
    return () => {
      window.removeEventListener('resize', update)
      document.removeEventListener('fullscreenchange', update)
    }
  }, [])

  if (fullscreen) return null
  return (
    <p className="fullscreen-tip">
      Press{' '}
      {isMac ? (
        <>
          <kbd>Ctrl</kbd> + <kbd>Cmd</kbd> + <kbd>F</kbd>
        </>
      ) : (
        <kbd>F11</kbd>
      )}{' '}
      to go full screen for a much better experience.
    </p>
  )
}
