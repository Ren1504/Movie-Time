import { useState } from 'react'

// Shown instead of the app on phones and tablets.
export function MobileNotice() {
  const [copied, setCopied] = useState(false)
  const link = window.location.href

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      // Clipboard access can be refused; the link is on screen to copy by hand.
    }
  }

  return (
    <div className="theatre-overlay">
      <div className="theatre-overlay-panel">
        <h1>Movie With Friends</h1>
        <p className="mobile-notice-text">
          This theatre doesn't work on phones or tablets. Please open this link in a browser on a
          computer or laptop, like Chrome, Edge or Firefox.
        </p>
        <code className="mobile-notice-link">{link}</code>
        <button type="button" onClick={copyLink}>
          {copied ? 'Link copied' : 'Copy link'}
        </button>
      </div>
    </div>
  )
}
