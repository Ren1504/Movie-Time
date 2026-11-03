import type { SoundReaction } from '@movie/shared'
import { surroundConfig } from '../../config/surroundConfig'
import { getSurroundGraph } from '../stream/surroundSound'

const VOLUME = 0.5
const REVERB_SEND = 0.35
// Filtering removes most of the noise, so claps need this to match the whistle.
const CLAP_BOOST = 2.5
// Beyond this, new sounds are skipped so a crowd can't drown out the film.
const MAX_PLAYING = 6

let playing = 0
let noise: AudioBuffer | null = null

function getNoise(context: AudioContext) {
  if (!noise) {
    noise = context.createBuffer(1, Math.floor(context.sampleRate * 0.2), context.sampleRate)
    const samples = noise.getChannelData(0)
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
  }
  return noise
}

/** A wolf whistle: a quick rise, then a longer rise and fall. */
function whistle(context: AudioContext, output: AudioNode, start: number) {
  const glides = [
    { at: 0, length: 0.3, from: 950, peak: 2500, to: 2400 },
    { at: 0.42, length: 0.7, from: 950, peak: 2300, to: 750 },
  ]
  for (const glide of glides) {
    const begin = start + glide.at
    const end = begin + glide.length
    const tone = context.createOscillator()
    tone.frequency.setValueAtTime(glide.from, begin)
    tone.frequency.exponentialRampToValueAtTime(glide.peak, begin + glide.length * 0.45)
    tone.frequency.exponentialRampToValueAtTime(glide.to, end)

    // A slight wobble, as a real whistle is never perfectly steady.
    const wobble = context.createOscillator()
    wobble.frequency.value = 6
    const wobbleDepth = context.createGain()
    wobbleDepth.gain.value = 18
    wobble.connect(wobbleDepth).connect(tone.frequency)

    const envelope = context.createGain()
    envelope.gain.setValueAtTime(0, begin)
    envelope.gain.linearRampToValueAtTime(0.35, begin + 0.04)
    envelope.gain.setValueAtTime(0.35, end - 0.08)
    envelope.gain.linearRampToValueAtTime(0, end)
    tone.connect(envelope).connect(output)

    tone.start(begin)
    wobble.start(begin)
    tone.stop(end)
    wobble.stop(end)
  }
  return start + 1.2
}

/** A few claps from one person, each made of short bursts of filtered noise. */
function clap(context: AudioContext, output: AudioNode, start: number) {
  const buffer = getNoise(context)
  const boost = context.createGain()
  boost.gain.value = CLAP_BOOST
  boost.connect(output)
  let time = start
  for (let i = 0; i < 5; i++) {
    const filter = context.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1100 + Math.random() * 500
    filter.Q.value = 0.9
    filter.connect(boost)

    // Hands meet unevenly, so each clap is a quick cluster of bursts.
    for (const offset of [0, 0.008, 0.017]) {
      const burst = context.createBufferSource()
      burst.buffer = buffer
      const envelope = context.createGain()
      const at = time + offset
      envelope.gain.setValueAtTime(0, at)
      envelope.gain.linearRampToValueAtTime(offset === 0.017 ? 1 : 0.6, at + 0.001)
      envelope.gain.exponentialRampToValueAtTime(0.001, at + (offset === 0.017 ? 0.09 : 0.012))
      burst.connect(envelope).connect(filter)
      burst.start(at, Math.random() * 0.1)
      burst.stop(at + 0.1)
    }
    time += 0.16 + Math.random() * 0.04
  }
  return time + 0.1
}

const sounds = { whistle, clap }

/** Plays the sound where the person is, so it's heard from their direction. */
export function playEmoteSound(reaction: SoundReaction, x: number, y: number, z: number) {
  if (playing >= MAX_PLAYING) return
  const { context, output, reverbInput } = getSurroundGraph()
  void context.resume().catch(() => {})

  const panner = context.createPanner()
  panner.panningModel = 'HRTF'
  panner.distanceModel = 'inverse'
  panner.refDistance = surroundConfig.panner.refDistance
  panner.rolloffFactor = surroundConfig.panner.rolloffFactor
  panner.positionX.value = x
  panner.positionY.value = y
  panner.positionZ.value = z

  const volume = context.createGain()
  volume.gain.value = VOLUME
  const echo = context.createGain()
  echo.gain.value = REVERB_SEND
  volume.connect(panner).connect(output)
  volume.connect(echo).connect(reverbInput)

  const end = sounds[reaction](context, volume, context.currentTime + 0.02)
  playing++
  setTimeout(
    () => {
      playing--
      volume.disconnect()
      echo.disconnect()
      panner.disconnect()
    },
    (end - context.currentTime) * 1000 + 100,
  )
}
