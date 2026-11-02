interface TheatreOverlayProps {
  title: string
  actionLabel: string
  notice: string | null
  onAction: () => void
}

const CONTROLS = [
  ['W A S D', 'Walk'],
  ['Mouse', 'Look around'],
  ['Esc', 'Pause'],
]

export function TheatreOverlay({
  title,
  actionLabel,
  notice,
  onAction,
}: TheatreOverlayProps) {
  return (
    <div className="theatre-overlay">
      <div className="theatre-overlay-panel">
        <h1>{title}</h1>
        <dl>
          {CONTROLS.map(([key, action]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
        {notice && <p role="alert">{notice}</p>}
      </div>
    </div>
  )
}
