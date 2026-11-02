import type { Server, Socket } from 'socket.io'
import type {
  ClientToServerEvents,
  RoomEndReason,
  RoomResult,
  RoomSession,
  ServerToClientEvents,
} from '@movie/shared'
import { serverConfig } from '../config.ts'
import type { MemberEntry, RoomManager } from '../rooms/RoomManager.ts'
import { closeStream, createStreamToken, removeFromStream } from '../streaming/liveKit.ts'

interface SocketData {
  /** Who this connection is. Set only here, and never taken from a message. */
  session: { code: string; memberId: string } | null
  pageClosing: boolean
}

type RoomServer = Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>
type RoomSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>

export function registerRoomHandlers(io: RoomServer, rooms: RoomManager) {
  const removalTimers = new Map<string, NodeJS.Timeout>()

  const cancelRemoval = (memberId: string) => {
    clearTimeout(removalTimers.get(memberId))
    removalTimers.delete(memberId)
  }

  const broadcastRoom = (code: string) => {
    const snapshot = rooms.getSnapshot(code)
    if (snapshot) io.to(code).emit('room:updated', snapshot)
  }

  const detachSocket = (socketId: string | null, code: string) => {
    const socket = socketId ? io.sockets.sockets.get(socketId) : undefined
    if (!socket) return
    socket.leave(code)
    socket.data.session = null
  }

  const endRoom = (code: string, reason: RoomEndReason) => {
    io.to(code).emit('room:ended', reason)
    for (const member of rooms.destroyRoom(code)) {
      cancelRemoval(member.id)
      detachSocket(member.socketId, code)
    }
    closeStream(code)
  }

  const removeMember = (code: string, memberId: string) => {
    cancelRemoval(memberId)
    removeFromStream(code, memberId)
    const departure = rooms.removeMember(code, memberId)
    if (!departure) {
      closeStream(code)
      return
    }
    broadcastRoom(code)
    io.to(code).emit('room:member-left', departure)
  }

  const enterRoom = (socket: RoomSocket, { code, member }: MemberEntry): RoomSession => {
    socket.data.session = { code, memberId: member.id }
    socket.join(code)
    broadcastRoom(code)
    return {
      token: member.token,
      memberId: member.id,
      room: rooms.getSnapshot(code)!,
    }
  }

  setInterval(() => {
    for (const { code, poses } of rooms.takeChangedPoses()) {
      io.to(code).volatile.emit('players:poses', poses)
    }
  }, 1000 / serverConfig.poseBroadcastHz)

  io.on('connection', (socket) => {
    socket.data.session = null
    socket.data.pageClosing = false

    socket.on('room:page-closing', () => {
      socket.data.pageClosing = true
    })

    socket.on('player:pose', (pose) => {
      const session = socket.data.session
      if (session) rooms.updatePose(session.code, session.memberId, pose)
    })

    socket.on('seat:claim', (payload, ack) => {
      if (typeof ack !== 'function') return
      const session = socket.data.session
      if (!session) return ack({ ok: false, error: 'NOT_IN_ROOM' })
      const result = rooms.claimSeat(session.code, session.memberId, payload?.seatId)
      ack(result)
      if (result.ok) broadcastRoom(session.code)
    })

    socket.on('stream:access', async (ack) => {
      if (typeof ack !== 'function') return
      const session = socket.data.session
      if (!session) return ack({ ok: false, error: 'NOT_IN_ROOM' })
      try {
        const token = await createStreamToken(
          session.code,
          session.memberId,
          rooms.isOwner(session.code, session.memberId),
        )
        // Friends need this computer's public address, and the host needs localhost.
        const { hostname } = new URL(`http://${socket.handshake.headers.host}`)
        const url = `ws://${hostname}:${serverConfig.liveKit.clientPort}`
        ack({ ok: true, value: { url, token } })
      } catch {
        ack({ ok: false, error: 'STREAM_UNAVAILABLE' })
      }
    })

    const handleSetStreaming = (
      streaming: boolean,
      ack: (result: RoomResult<null>) => void,
    ) => {
      if (typeof ack !== 'function') return
      const session = socket.data.session
      if (!session) return ack({ ok: false, error: 'NOT_IN_ROOM' })
      const result = rooms.setStreaming(session.code, session.memberId, streaming)
      ack(result)
      if (result.ok) broadcastRoom(session.code)
    }
    socket.on('stream:start', (ack) => handleSetStreaming(true, ack))
    socket.on('stream:stop', (ack) => handleSetStreaming(false, ack))

    socket.on('seat:release', () => {
      const session = socket.data.session
      if (!session) return
      rooms.releaseSeat(session.code, session.memberId)
      broadcastRoom(session.code)
    })

    socket.on('room:create', (payload, ack) => {
      if (typeof ack !== 'function') return
      if (socket.data.session) return ack({ ok: false, error: 'ALREADY_IN_ROOM' })
      const result = rooms.createRoom(payload?.name, socket.id)
      ack(result.ok ? { ok: true, value: enterRoom(socket, result.value) } : result)
    })

    socket.on('room:join', (payload, ack) => {
      if (typeof ack !== 'function') return
      if (socket.data.session) return ack({ ok: false, error: 'ALREADY_IN_ROOM' })
      const result = rooms.joinRoom(payload?.code, payload?.name, socket.id)
      ack(result.ok ? { ok: true, value: enterRoom(socket, result.value) } : result)
      if (result.ok) {
        socket.to(result.value.code).emit('room:member-joined', result.value.member.name)
      }
    })

    socket.on('room:rejoin', (payload, ack) => {
      if (typeof ack !== 'function') return
      if (socket.data.session) return ack({ ok: false, error: 'ALREADY_IN_ROOM' })
      const entry = rooms.findByToken(payload?.token)
      if (!entry) return ack({ ok: false, error: 'SESSION_EXPIRED' })

      const { member, code } = entry
      cancelRemoval(member.id)
      // The same member opened elsewhere, so the newest connection wins.
      const previous = member.socketId ? io.sockets.sockets.get(member.socketId) : undefined
      if (previous) {
        previous.emit('room:ended', 'replaced')
        detachSocket(previous.id, code)
      }
      member.socketId = socket.id
      if (payload.keepSeat !== true) member.seatId = null
      if (payload.keepStream !== true) rooms.setStreaming(code, member.id, false)
      ack({ ok: true, value: enterRoom(socket, entry) })
    })

    socket.on('room:leave', (ack) => {
      if (typeof ack !== 'function') return
      const session = socket.data.session
      if (!session) return ack({ ok: false, error: 'NOT_IN_ROOM' })
      detachSocket(socket.id, session.code)
      ack({ ok: true, value: null } satisfies RoomResult<null>)
      removeMember(session.code, session.memberId)
    })

    socket.on('room:close', (ack) => {
      if (typeof ack !== 'function') return
      const session = socket.data.session
      if (!session) return ack({ ok: false, error: 'NOT_IN_ROOM' })
      if (!rooms.isOwner(session.code, session.memberId)) {
        return ack({ ok: false, error: 'NOT_OWNER' })
      }
      ack({ ok: true, value: null })
      endRoom(session.code, 'closed')
    })

    socket.on('disconnect', () => {
      const session = socket.data.session
      if (!session) return
      const member = rooms.getMember(session.code, session.memberId)
      if (!member) return

      member.socketId = null
      // "Reconnecting" is only shown for real drops. A closed page simply leaves,
      // and its screen capture has ended, so viewers shouldn't keep waiting for it.
      if (socket.data.pageClosing) {
        const stopped = rooms.setStreaming(session.code, member.id, false)
        if (stopped.ok) broadcastRoom(session.code)
      } else {
        broadcastRoom(session.code)
      }
      removalTimers.set(
        member.id,
        setTimeout(
          () => removeMember(session.code, member.id),
          socket.data.pageClosing
            ? serverConfig.pageCloseGraceMs
            : serverConfig.reconnectGraceMs,
        ),
      )
    })
  })
}
