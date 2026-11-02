import { useState } from 'react'
import { getSavedVolume, setSurroundVolume } from '../../systems/stream/surroundSound'

export function VolumeControl() {
  const [volume, setVolume] = useState(getSavedVolume)

  return (
    <label className="volume-control">
      Stream volume
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={(event) => {
          const next = Number(event.target.value)
          setVolume(next)
          setSurroundVolume(next)
        }}
      />
    </label>
  )
}
