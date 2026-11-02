import { backZ, frontZ, halfWidth } from '../../components/theatre/theatreLayout'
import { surroundConfig } from '../../config/surroundConfig'
import { theatreConfig } from '../../config/theatreConfig'

const { front, surrounds, sub, reverb, panner: pannerConfig } = surroundConfig

const LEFT = 0
const RIGHT = 1

const VOLUME_KEY = 'streamVolume'

/** Remembered per browser. Storage can be unavailable, which only loses the setting. */
export function getSavedVolume() {
  try {
    const saved = Number(localStorage.getItem(VOLUME_KEY) ?? 1)
    return Number.isFinite(saved) ? Math.min(Math.max(saved, 0), 1) : 1
  } catch {
    return 1
  }
}

interface SurroundGraph {
  context: AudioContext
  input: GainNode
  master: GainNode
  source: MediaStreamAudioSourceNode | null
}

let graph: SurroundGraph | null = null

function createSpeaker(context: AudioContext, x: number, y: number, z: number) {
  const speaker = context.createPanner()
  speaker.panningModel = 'HRTF'
  speaker.distanceModel = 'inverse'
  speaker.refDistance = pannerConfig.refDistance
  speaker.rolloffFactor = pannerConfig.rolloffFactor
  speaker.positionX.value = x
  speaker.positionY.value = y
  speaker.positionZ.value = z
  return speaker
}

/** Fading noise, which sounds like the reflections of a large room. */
function createRoomImpulse(context: AudioContext) {
  const length = Math.floor(context.sampleRate * reverb.seconds)
  const impulse = context.createBuffer(2, length, context.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const samples = impulse.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      samples[i] = (Math.random() * 2 - 1) * (1 - i / length) ** reverb.decay
    }
  }
  return impulse
}

function createGraph(): SurroundGraph {
  const context = new AudioContext()

  // Stops several speakers adding up to distortion on loud scenes.
  const limiter = context.createDynamicsCompressor()
  const master = context.createGain()
  master.gain.value = getSavedVolume()
  limiter.connect(master).connect(context.destination)

  // Mono sources are copied to both sides, so they still use every speaker.
  const input = context.createGain()
  input.channelCount = 2
  input.channelCountMode = 'explicit'
  input.channelInterpretation = 'speakers'
  const splitter = context.createChannelSplitter(2)
  input.connect(splitter)

  const connectSpeaker = (
    channels: readonly number[],
    gainValue: number,
    x: number,
    y: number,
    z: number,
    delaySeconds = 0,
  ) => {
    const gain = context.createGain()
    gain.gain.value = gainValue
    channels.forEach((channel) => splitter.connect(gain, channel))
    const speaker = createSpeaker(context, x, y, z)
    if (delaySeconds > 0) {
      const delay = context.createDelay()
      delay.delayTime.value = delaySeconds
      gain.connect(delay).connect(speaker)
    } else {
      gain.connect(speaker)
    }
    speaker.connect(limiter)
  }

  const frontX = (theatreConfig.screen.width / 2) * front.spread
  connectSpeaker([LEFT], front.gain, -frontX, front.height, frontZ)
  connectSpeaker([RIGHT], front.gain, frontX, front.height, frontZ)
  connectSpeaker([LEFT, RIGHT], front.centerGain / 2, 0, front.height, frontZ)

  const wallX = halfWidth - surrounds.wallOffset
  const sideZ = frontZ + (backZ - frontZ) * surrounds.sideDepth
  const rearZ = backZ - surrounds.wallOffset
  for (const [channel, side] of [[LEFT, -1], [RIGHT, 1]] as const) {
    connectSpeaker(
      [channel],
      surrounds.gain,
      side * wallX,
      surrounds.height,
      sideZ,
      surrounds.delaySeconds,
    )
    connectSpeaker(
      [channel],
      surrounds.gain,
      side * wallX,
      surrounds.height,
      rearZ,
      surrounds.delaySeconds,
    )
  }

  // Bass can't be located by ear, so it goes straight out, the same everywhere.
  const subFilter = context.createBiquadFilter()
  subFilter.type = 'lowpass'
  subFilter.frequency.value = sub.cutoffHz
  const subGain = context.createGain()
  subGain.gain.value = sub.gain
  input.connect(subFilter).connect(subGain).connect(limiter)

  const reverbFilter = context.createBiquadFilter()
  reverbFilter.type = 'lowpass'
  reverbFilter.frequency.value = reverb.cutoffHz
  const convolver = context.createConvolver()
  convolver.buffer = createRoomImpulse(context)
  const reverbGain = context.createGain()
  reverbGain.gain.value = reverb.gain
  input.connect(reverbFilter).connect(convolver).connect(reverbGain).connect(limiter)

  return { context, input, master, source: null }
}

export function playThroughSurround(stream: MediaStream) {
  graph ??= createGraph()
  graph.source?.disconnect()
  graph.source = graph.context.createMediaStreamSource(stream)
  graph.source.connect(graph.input)
  void graph.context.resume().catch(() => {})
}

export function setSurroundVolume(volume: number) {
  if (graph) graph.master.gain.value = volume
  try {
    localStorage.setItem(VOLUME_KEY, String(volume))
  } catch {
    // The volume still applies until the page closes.
  }
}

export function stopSurround() {
  graph?.source?.disconnect()
  if (graph) graph.source = null
}

/** Call from a click, as browsers only allow sound after one. */
export function resumeSurround() {
  void graph?.context.resume().catch(() => {})
}

interface ListenerPose {
  x: number
  y: number
  z: number
  forwardX: number
  forwardY: number
  forwardZ: number
  upX: number
  upY: number
  upZ: number
}

export function updateSurroundListener(pose: ListenerPose) {
  if (!graph) return
  const { listener } = graph.context
  listener.positionX.value = pose.x
  listener.positionY.value = pose.y
  listener.positionZ.value = pose.z
  listener.forwardX.value = pose.forwardX
  listener.forwardY.value = pose.forwardY
  listener.forwardZ.value = pose.forwardZ
  listener.upX.value = pose.upX
  listener.upY.value = pose.upY
  listener.upZ.value = pose.upZ
}
