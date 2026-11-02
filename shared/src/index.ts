// The contract between the client and server. Rules that both sides need live
// here, but the server always checks them itself.

export const MAX_NAME_LENGTH = 20
export const ROOM_CODE_LENGTH = 6
// Letters and digits that are easy to tell apart when read out loud.
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export interface RoomMember {
  id: string
  name: string
  /** False during the short wait for a dropped member to come back. */
  connected: boolean
}

export interface RoomSnapshot {
  code: string
  ownerId: string
  members: RoomMember[]
}

export interface RoomSession {
  /** Private proof of membership, used to return after a dropped connection. */
  token: string
  memberId: string
  room: RoomSnapshot
}

export type RoomErrorCode =
  | 'INVALID_NAME'
  | 'INVALID_CODE'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ALREADY_IN_ROOM'
  | 'NOT_IN_ROOM'
  | 'NOT_OWNER'
  | 'SESSION_EXPIRED'

export type RoomResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: RoomErrorCode }

export type RoomEndReason = 'closed' | 'replaced'

export interface MemberDeparture {
  name: string
  /** Set when the person who left was the owner. */
  newOwner: { id: string; name: string } | null
}

export interface ClientToServerEvents {
  'room:create': (
    payload: { name: string },
    ack: (result: RoomResult<RoomSession>) => void,
  ) => void
  'room:join': (
    payload: { code: string; name: string },
    ack: (result: RoomResult<RoomSession>) => void,
  ) => void
  'room:rejoin': (
    payload: { token: string },
    ack: (result: RoomResult<RoomSession>) => void,
  ) => void
  'room:leave': (ack: (result: RoomResult<null>) => void) => void
  /** Owner only. */
  'room:close': (ack: (result: RoomResult<null>) => void) => void
  /** The page is closing or reloading, so this disconnect isn't a network drop. */
  'room:page-closing': () => void
}

export interface ServerToClientEvents {
  'room:updated': (room: RoomSnapshot) => void
  'room:ended': (reason: RoomEndReason) => void
  'room:member-left': (departure: MemberDeparture) => void
}
