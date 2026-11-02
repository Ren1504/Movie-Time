import { useSyncExternalStore } from 'react'

export type StreamConnection = 'connecting' | 'connected' | 'reconnecting' | 'failed'

export interface SharingInfo {
  width: number
  height: number
  frameRate: number
  /** What the browser says was picked: monitor, window or browser (a tab). */
  surface: string | null
}

export interface StreamState {
  connection: StreamConnection
  /** The server says the host is sharing. */
  roomStreaming: boolean
  /** Video is arriving and playing on this client. */
  hasVideo: boolean
  /** This client is the one sharing its screen. */
  sharing: boolean
  audioShared: boolean
  info: SharingInfo | null
  error: string | null
}

let state: StreamState = {
  connection: 'connecting',
  roomStreaming: false,
  hasVideo: false,
  sharing: false,
  audioShared: false,
  info: null,
  error: null,
}

const listeners = new Set<() => void>()

export function getStreamState() {
  return state
}

export function updateStreamState(patch: Partial<StreamState>) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Only re-renders when the stream changes, never per frame. */
export function useStreamState() {
  return useSyncExternalStore(subscribe, getStreamState)
}

/** Always muted: sound comes through a separate element, and never for the host. */
export const streamVideo = document.createElement('video')
streamVideo.muted = true
streamVideo.playsInline = true
streamVideo.autoplay = true
