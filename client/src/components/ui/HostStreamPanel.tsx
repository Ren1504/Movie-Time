import { startSharing, stopSharing } from '../../systems/stream/streamConnection'
import { useStreamState, type StreamConnection } from '../../systems/stream/streamStore'

const CONNECTION_TEXT: Record<StreamConnection, string> = {
  connecting: 'Connecting...',
  connected: 'Connected',
  reconnecting: 'Reconnecting...',
  failed: "Can't reach the server. Retrying...",
}

const SURFACE_TEXT: Record<string, string> = {
  monitor: 'Entire screen',
  window: 'Application window',
  browser: 'Browser tab',
}

interface HostStreamPanelProps {
  /** The mouse is captured during play, so buttons only appear when paused. */
  interactive: boolean
}

export function HostStreamPanel({ interactive }: HostStreamPanelProps) {
  const { connection, sharing, audioShared, info, error } = useStreamState()

  return (
    <aside className="stream-panel">
      <div className="stream-panel-title">
        Go Live
        {sharing && <span className="live-pill">LIVE</span>}
      </div>
      <dl>
        <div>
          <dt>Status</dt>
          <dd>{sharing ? 'Sharing' : 'Not sharing'}</dd>
        </div>
        <div>
          <dt>Connection</dt>
          <dd>{CONNECTION_TEXT[connection]}</dd>
        </div>
        {info && (
          <>
            <div>
              <dt>Sharing</dt>
              <dd>{(info.surface && SURFACE_TEXT[info.surface]) ?? 'Screen'}</dd>
            </div>
            <div>
              <dt>Quality</dt>
              <dd>
                {info.width}×{info.height}, {info.frameRate} fps
              </dd>
            </div>
          </>
        )}
        <div>
          <dt>Sound</dt>
          <dd>{sharing ? (audioShared ? 'Shared' : 'Not shared') : '-'}</dd>
        </div>
      </dl>
      {error && <p role="alert">{error}</p>}
      {interactive ? (
        sharing ? (
          <button type="button" onClick={() => void stopSharing()}>
            Stop Sharing
          </button>
        ) : (
          <button
            type="button"
            className="primary"
            disabled={connection !== 'connected'}
            onClick={() => void startSharing()}
          >
            Share Screen
          </button>
        )
      ) : (
        <p className="stream-panel-hint">Press Esc for host controls</p>
      )}
    </aside>
  )
}
