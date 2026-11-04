import { getSurroundGraph } from '../stream/surroundSound'

// A few soft crunches, heard only by the person eating, so a full room doesn't
// add constant noise over the film.
const VOLUME = 0.12
const CRUNCHES = 4

let noise: AudioBuffer | null = null

function getNoise(context: AudioContext) {
  if (!noise) {
    noise = context.createBuffer(1, Math.floor(context.sampleRate * 0.1), context.sampleRate)
    const samples = noise.getChannelData(0)
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
  }
  return noise
}

export function playCrunch() {
  const { context, output } = getSurroundGraph()
  if (context.state !== 'running') return

  const volume = context.createGain()
  volume.gain.value = VOLUME
  const filter = context.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 2400
  filter.Q.value = 0.7
  filter.connect(volume).connect(output)

  let time = context.currentTime + 0.02
  for (let i = 0; i < CRUNCHES; i++) {
    const burst = context.createBufferSource()
    burst.buffer = getNoise(context)
    const envelope = context.createGain()
    envelope.gain.setValueAtTime(0, time)
    envelope.gain.linearRampToValueAtTime(1, time + 0.004)
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.06)
    burst.connect(envelope).connect(filter)
    burst.start(time, Math.random() * 0.03)
    burst.stop(time + 0.07)
    time += 0.14 + Math.random() * 0.08
  }
  setTimeout(() => volume.disconnect(), (time - context.currentTime) * 1000 + 100)
}
