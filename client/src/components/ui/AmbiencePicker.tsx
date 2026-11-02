import { AMBIENCE_IDS, type AmbienceId } from '@movie/shared'
import { ambiencePresets } from '../../config/ambienceConfig'
import { setRoomAmbience } from '../../network/useRoom'

export function AmbiencePicker({ current }: { current: AmbienceId }) {
  return (
    <div className="ambience-picker">
      <div className="ambience-picker-title">Ambience</div>
      <div className="ambience-picker-options">
        {AMBIENCE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={id === current ? 'selected' : undefined}
            aria-pressed={id === current}
            onClick={() => setRoomAmbience(id)}
          >
            {ambiencePresets[id].label}
          </button>
        ))}
      </div>
    </div>
  )
}
