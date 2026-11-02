import {
  AudioPresets,
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type LocalTrackPublication,
  type RemoteTrack,
  type RemoteTrackPublication,
} from 'livekit-client'
import { REQUEST_TIMEOUT_MS, socket } from '../../network/socket'
import { getStreamState, streamVideo, updateStreamState } from './streamStore'
import { playThroughSurround, resumeSurround, stopSurround } from './surroundSound'

const RETRY_DELAY_MS = 3000
const MAX_BITRATE = 6_000_000
const MAX_FRAME_RATE = 30

const AUDIO_UNAVAILABLE =
  'No sound is being shared. Browsers only capture sound from a tab, or from the whole screen on Windows.'

const CONNECTION_LOST = 'The connection dropped, so sharing stopped. Share your screen again.'

const DROP_WINDOW_MS = 1000

let lastUnpublishedAt = -Infinity
let room: Room | null = null
let retryTimer: ReturnType<typeof setTimeout> | undefined
const audioElements = new Set<HTMLMediaElement>()

function clearMedia() {
  streamVideo.srcObject = null
  audioElements.forEach((element) => element.remove())
  audioElements.clear()
  stopSurround()
  updateStreamState({ hasVideo: false })
}

function endLocalSharing(error: string | null = null) {
  if (!getStreamState().sharing) return
  updateStreamState({ sharing: false, audioShared: false, info: null, error })
  // The server may already know, such as when ownership has just changed.
  socket.timeout(REQUEST_TIMEOUT_MS).emit('stream:stop', () => {})
}

function handleTrackSubscribed(track: RemoteTrack, publication: RemoteTrackPublication) {
  if (publication.source === Track.Source.ScreenShare) {
    track.attach(streamVideo)
    updateStreamState({ hasVideo: true })
  } else if (publication.source === Track.Source.ScreenShareAudio) {
    // Chromium only delivers remote audio to Web Audio while an element plays it.
    // It's muted, as the sound comes out through the surround speakers instead.
    const element = track.attach()
    element.muted = true
    audioElements.add(element)
    if (track.mediaStream) playThroughSurround(track.mediaStream)
  }
}

function handleTrackUnsubscribed(track: RemoteTrack, publication: RemoteTrackPublication) {
  if (publication.source === Track.Source.ScreenShare) {
    track.detach(streamVideo)
    updateStreamState({ hasVideo: false })
  } else if (publication.source === Track.Source.ScreenShareAudio) {
    track.detach().forEach((element) => audioElements.delete(element))
    stopSurround()
  }
}

function handleLocalPublished(publication: LocalTrackPublication) {
  if (publication.source !== Track.Source.ScreenShare || !publication.track) return
  publication.track.attach(streamVideo)
  const settings = publication.track.mediaStreamTrack.getSettings()
  updateStreamState({
    hasVideo: true,
    sharing: true,
    error: null,
    info: {
      width: settings.width ?? 0,
      height: settings.height ?? 0,
      frameRate: Math.round(settings.frameRate ?? 0),
      surface: settings.displaySurface ?? null,
    },
  })

  // This also runs when a reconnect publishes again. The server has the final
  // say, so if it refuses, nothing should stay published.
  socket
    .timeout(REQUEST_TIMEOUT_MS)
    .emitWithAck('stream:start')
    .catch(() => null)
    .then(async (result) => {
      if (result?.ok) return
      await stopSharing()
      updateStreamState({ error: "The server didn't allow sharing. Try again." })
    })
}

/** Also fires when the browser's own "Stop sharing" button is used. */
function handleLocalUnpublished(publication: LocalTrackPublication) {
  if (publication.source !== Track.Source.ScreenShare) return
  // A reconnect publishes the same capture again, so viewers just keep waiting.
  if (room?.state === ConnectionState.Reconnecting) return
  lastUnpublishedAt = performance.now()
  clearMedia()
  endLocalSharing()
}

function scheduleRetry() {
  clearTimeout(retryTimer)
  retryTimer = setTimeout(() => void connectStream(), RETRY_DELAY_MS)
}

export async function connectStream() {
  disconnectStream()
  const current = new Room({ adaptiveStream: false, dynacast: false })
  room = current
  updateStreamState({ connection: 'connecting' })

  current
    .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
    .on(RoomEvent.LocalTrackPublished, handleLocalPublished)
    .on(RoomEvent.LocalTrackUnpublished, handleLocalUnpublished)
    .on(RoomEvent.Reconnecting, () => updateStreamState({ connection: 'reconnecting' }))
    .on(RoomEvent.Reconnected, () => updateStreamState({ connection: 'connected' }))
    .on(RoomEvent.Disconnected, () => {
      if (room !== current) return
      clearMedia()
      endLocalSharing(CONNECTION_LOST)
      // When dropped, the library withdraws the capture just before reporting it.
      if (performance.now() - lastUnpublishedAt < DROP_WINDOW_MS) {
        updateStreamState({ error: CONNECTION_LOST })
      }
      updateStreamState({ connection: 'failed' })
      scheduleRetry()
    })

  try {
    const result = await socket.timeout(REQUEST_TIMEOUT_MS).emitWithAck('stream:access')
    if (!result.ok) throw new Error(result.error)
    if (room !== current) return
    await current.connect(result.value.url, result.value.token)
    if (room !== current) {
      void current.disconnect()
      return
    }
    updateStreamState({ connection: 'connected' })
    // Someone may have clicked already, which is what browsers require for sound.
    void current.startAudio().catch(() => {})
  } catch {
    if (room !== current) return
    updateStreamState({ connection: 'failed' })
    scheduleRetry()
  }
}

export function disconnectStream() {
  clearTimeout(retryTimer)
  const previous = room
  room = null
  clearMedia()
  updateStreamState({ sharing: false, audioShared: false, info: null })
  void previous?.disconnect()
}

/** Call from a click, as browsers only allow sound after one. */
export function allowStreamAudio() {
  void room?.startAudio().catch(() => {})
  resumeSurround()
}

function captureErrorMessage(error: unknown) {
  const name = error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError') {
    return 'Screen sharing was cancelled or blocked. Allow it in your browser and try again.'
  }
  if (name === 'NotReadableError') {
    return 'Your system blocked screen capture. Check its privacy settings and try again.'
  }
  if (name === 'NotFoundError') return 'There was nothing available to share.'
  return "Screen sharing couldn't start. Try again."
}

/** Must be called from a click, or the browser refuses to show its picker. */
export async function startSharing() {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    updateStreamState({
      error: window.isSecureContext
        ? "This browser can't share its screen."
        : 'Browsers only allow screen sharing over a secure connection, which this address lacks.',
    })
    return
  }
  if (!room || room.state !== ConnectionState.Connected) {
    updateStreamState({ error: 'Still connecting to the streaming server. Try again shortly.' })
    return
  }

  updateStreamState({ error: null })
  const participant = room.localParticipant
  try {
    await participant.setScreenShareEnabled(
      true,
      {
        // Voice-call processing would damage music and film sound.
        audio: {
          channelCount: 2,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        contentHint: 'motion',
        selfBrowserSurface: 'include',
      },
      {
        simulcast: false,
        // When a busy scene exceeds the bitrate, lose detail rather than smoothness.
        // Measured on a busy picture: 28 fps at 540p, against 12 fps at 1080p without.
        degradationPreference: 'maintain-framerate',
        screenShareEncoding: { maxBitrate: MAX_BITRATE, maxFramerate: MAX_FRAME_RATE },
        audioPreset: AudioPresets.musicHighQualityStereo,
        forceStereo: true,
        dtx: false,
        red: false,
      },
    )
  } catch (error) {
    updateStreamState({ error: captureErrorMessage(error) })
    return
  }

  const audioShared = Boolean(
    participant.getTrackPublication(Track.Source.ScreenShareAudio)?.track,
  )
  updateStreamState({
    audioShared,
    error: audioShared ? null : AUDIO_UNAVAILABLE,
  })
}

export async function stopSharing() {
  await room?.localParticipant.setScreenShareEnabled(false)
}

if (new URLSearchParams(window.location.search).get('debug') === 'physics') {
  Object.assign(window, { debugStream: { getRoom: () => room, video: streamVideo, getStreamState } })
}
