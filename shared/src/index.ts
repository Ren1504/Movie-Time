// The contract between the client and server. Rules that both sides need live
// here, but the server always checks them itself.

export const MAX_NAME_LENGTH = 20
export const ROOM_CODE_LENGTH = 6
// Letters and digits that are easy to tell apart when read out loud.
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// Seats are named like "R3-L07": row 3, left block, seat 7.
export const SEAT_ROWS = 5
export const SEATS_PER_BLOCK = 16

export function isValidSeatId(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = /^R(\d)-[LR](\d\d)$/.exec(value)
  if (!match) return false
  const row = Number(match[1])
  const seat = Number(match[2])
  return row >= 1 && row <= SEAT_ROWS && seat >= 1 && seat <= SEATS_PER_BLOCK
}

/** Where a player is and which way they're looking. Height comes from the floor. */
export interface PlayerPose {
  x: number
  z: number
  yaw: number
  pitch: number
}

export interface RoomMember {
  id: string
  name: string
  /** False during the short wait for a dropped member to come back. */
  connected: boolean
  seatId: string | null
  /** Null until the member has first moved. */
  pose: PlayerPose | null
}

export const AMBIENCE_IDS = ['classic', 'horror', 'scifi', 'futuristic', 'cozy'] as const
export type AmbienceId = (typeof AMBIENCE_IDS)[number]

export interface RoomSnapshot {
  code: string
  ownerId: string
  members: RoomMember[]
  /** True while the host is sharing their screen. */
  streaming: boolean
  ambience: AmbienceId
}

/** What a client needs to connect to the media server. */
export interface StreamAccess {
  url: string
  token: string
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
  | 'INVALID_SEAT'
  | 'SEAT_TAKEN'
  | 'STREAM_UNAVAILABLE'
  | 'INVALID_AMBIENCE'

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
    /**
     * Both are false after a refresh, as the player restarts on their feet and
     * the browser has ended any screen capture.
     */
    payload: { token: string; keepSeat: boolean; keepStream: boolean },
    ack: (result: RoomResult<RoomSession>) => void,
  ) => void
  'room:leave': (ack: (result: RoomResult<null>) => void) => void
  /** Owner only. */
  'room:close': (ack: (result: RoomResult<null>) => void) => void
  /** The page is closing or reloading, so this disconnect isn't a network drop. */
  'room:page-closing': () => void
  'player:pose': (pose: PlayerPose) => void
  'seat:claim': (
    payload: { seatId: string },
    ack: (result: RoomResult<null>) => void,
  ) => void
  'seat:release': () => void
  /** Host only. */
  'room:set-ambience': (
    payload: { ambience: AmbienceId },
    ack: (result: RoomResult<null>) => void,
  ) => void
  /** Only the host's token allows publishing to the media server. */
  'stream:access': (ack: (result: RoomResult<StreamAccess>) => void) => void
  /** Host only. */
  'stream:start': (ack: (result: RoomResult<null>) => void) => void
  /** Host only. */
  'stream:stop': (ack: (result: RoomResult<null>) => void) => void
}

export interface ServerToClientEvents {
  'room:updated': (room: RoomSnapshot) => void
  'room:ended': (reason: RoomEndReason) => void
  'room:member-left': (departure: MemberDeparture) => void
  'room:member-joined': (name: string) => void
  /** Only the members who moved since the last update. */
  'players:poses': (poses: (PlayerPose & { id: string })[]) => void
}
