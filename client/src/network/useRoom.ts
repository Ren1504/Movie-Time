import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  MemberDeparture,
  RoomEndReason,
  RoomErrorCode,
  RoomResult,
  RoomSession,
  RoomSnapshot,
} from '@movie/shared'
import { syncRemotePoses } from '../systems/multiplayer/remotePoses'
import { localSeat, syncOccupiedSeats } from '../systems/seats/seatOccupancy'
import { getStreamState, updateStreamState } from '../systems/stream/streamStore'
import { REQUEST_TIMEOUT_MS, socket } from './socket'

// Kept per tab, so a refresh returns to the room and two tabs are two people.
const TOKEN_KEY = 'roomToken'
const ANNOUNCEMENT_MS = 6000

const NO_RESPONSE_MESSAGE = "The server didn't respond. Check your connection and try again."

const ERROR_MESSAGES: Record<RoomErrorCode, string> = {
  INVALID_NAME: 'Enter a name of up to 20 characters.',
  INVALID_CODE: 'Room codes are 6 letters and numbers.',
  ROOM_NOT_FOUND: "That room doesn't exist. Check the code and try again.",
  ROOM_FULL: 'That room is full.',
  ALREADY_IN_ROOM: "You're already in a room.",
  NOT_IN_ROOM: "You're no longer in that room.",
  NOT_OWNER: 'Only the room owner can do that.',
  SESSION_EXPIRED: 'Your room is no longer available.',
  INVALID_SEAT: "That seat doesn't exist.",
  SEAT_TAKEN: 'That seat is taken.',
  STREAM_UNAVAILABLE: 'Streaming is unavailable right now.',
}

function syncGameState(room: RoomSnapshot) {
  syncOccupiedSeats(room)
  syncRemotePoses(room)
  updateStreamState({ roomStreaming: room.streaming })
}

const END_MESSAGES: Record<RoomEndReason, string> = {
  closed: 'The host closed the room.',
  replaced: 'You opened this room in another tab.',
}

interface CurrentRoom {
  memberId: string
  room: RoomSnapshot
}

export function useRoom() {
  const [current, setCurrent] = useState<CurrentRoom | null>(null)
  const [connected, setConnected] = useState(false)
  const [restoring, setRestoring] = useState(() => sessionStorage.getItem(TOKEN_KEY) !== null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState<string | null>(null)
  const memberIdRef = useRef<string | null>(null)

  const enter = useCallback((session: RoomSession) => {
    sessionStorage.setItem(TOKEN_KEY, session.token)
    memberIdRef.current = session.memberId
    syncGameState(session.room)
    setCurrent({ memberId: session.memberId, room: session.room })
  }, [])

  const exit = useCallback((message: string | null) => {
    sessionStorage.removeItem(TOKEN_KEY)
    setCurrent(null)
    setAnnouncement(null)
    setNotice(message)
  }, [])

  useEffect(() => {
    const handleConnect = () => {
      setConnected(true)
      const token = sessionStorage.getItem(TOKEN_KEY)
      if (!token) return
      const keepSeat = localSeat.id !== null
      const keepStream = getStreamState().sharing
      socket.emit('room:rejoin', { token, keepSeat, keepStream }, (result) => {
        setRestoring(false)
        if (result.ok) enter(result.value)
        else exit(ERROR_MESSAGES[result.error])
      })
    }
    const handleDisconnect = () => setConnected(false)
    const handleConnectError = () => {
      setConnected(false)
      setRestoring(false)
    }
    const handleUpdated = (room: RoomSnapshot) => {
      syncGameState(room)
      setCurrent((previous) => previous && { ...previous, room })
    }
    const handleEnded = (reason: RoomEndReason) => exit(END_MESSAGES[reason])
    const handleMemberLeft = ({ name, newOwner }: MemberDeparture) => {
      let message = `${name} left the room.`
      if (newOwner) {
        message +=
          newOwner.id === memberIdRef.current
            ? ' You are now the host.'
            : ` ${newOwner.name} is now the host.`
      }
      setAnnouncement(message)
    }
    const handleMemberJoined = (name: string) => setAnnouncement(`${name} joined the room.`)
    const handlePageHide = () => socket.emit('room:page-closing')

    window.addEventListener('pagehide', handlePageHide)
    socket.on('room:member-left', handleMemberLeft)
    socket.on('room:member-joined', handleMemberJoined)
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    socket.on('room:updated', handleUpdated)
    socket.on('room:ended', handleEnded)
    socket.connect()

    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      socket.off('room:member-left', handleMemberLeft)
      socket.off('room:member-joined', handleMemberJoined)
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
      socket.off('room:updated', handleUpdated)
      socket.off('room:ended', handleEnded)
      socket.disconnect()
    }
  }, [enter, exit])

  useEffect(() => {
    if (!announcement) return
    const timer = setTimeout(() => setAnnouncement(null), ANNOUNCEMENT_MS)
    return () => clearTimeout(timer)
  }, [announcement])

  /** Shared handling for requests that open a room. */
  const handleEntryResult = (error: Error | null, result?: RoomResult<RoomSession>) => {
    setBusy(false)
    if (error || !result) setNotice(NO_RESPONSE_MESSAGE)
    else if (result.ok) enter(result.value)
    else setNotice(ERROR_MESSAGES[result.error])
  }

  const createRoom = (name: string) => {
    setBusy(true)
    setNotice(null)
    socket.timeout(REQUEST_TIMEOUT_MS).emit('room:create', { name }, handleEntryResult)
  }

  const joinRoom = (code: string, name: string) => {
    setBusy(true)
    setNotice(null)
    socket.timeout(REQUEST_TIMEOUT_MS).emit('room:join', { code, name }, handleEntryResult)
  }

  const exitWithRequest = (event: 'room:leave' | 'room:close') => {
    socket.timeout(REQUEST_TIMEOUT_MS).emit(event, (error: Error | null) => {
      // Without a reply the server may still count us as present. Reconnecting
      // starts its removal timer, as the token needed to return is now gone.
      if (error) socket.disconnect().connect()
      exit(null)
    })
  }

  return {
    current,
    connected,
    restoring,
    busy,
    notice,
    announcement,
    announce: setAnnouncement,
    createRoom,
    joinRoom,
    leaveRoom: () => exitWithRequest('room:leave'),
    closeRoom: () => exitWithRequest('room:close'),
  }
}
