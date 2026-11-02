interface TheatreOverlayProps {
  title: string
  actionLabel: string
  actionDisabled: boolean
  notice: string | null
  onAction: () => void
}

const CONTROLS = [
  ['W A S D', 'Walk'],
  ['Mouse', 'Look around'],
  ['E', 'Sit or stand'],
  ['T', 'Chat'],
  ['1 to 6', 'React'],
  ['Esc', 'Pause'],
]

export function TheatreOverlay({
  title,
  actionLabel,
  actionDisabled,
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
        <button type="button" disabled={actionDisabled} onClick={onAction}>
          {actionLabel}
        </button>
        {notice && <p role="alert">{notice}</p>}
      </div>
    </div>
  )
}
