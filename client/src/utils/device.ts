// The theatre needs a keyboard and mouse, so phones and tablets are turned away.

const MOBILE_USER_AGENT = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini|Silk/i

export function isMobileDevice(): boolean {
  const agentData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } })
    .userAgentData
  if (agentData?.mobile) return true
  if (MOBILE_USER_AGENT.test(navigator.userAgent)) return true
  // iPads report themselves as a Mac, but Macs have no touch screen.
  if (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1) return true
  // Catches phones in "desktop site" mode: only a touch screen, no mouse.
  return window.matchMedia('(pointer: coarse) and (hover: none)').matches
}
