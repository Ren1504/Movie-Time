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
  /** Height above where a jump started. Left out, or 0, on the ground. */
  lift?: number
}

/** The highest lift a pose may carry, a little above a real jump. */
export const MAX_POSE_LIFT = 3

export interface RoomMember {
  id: string
  name: string
  /** False during the short wait for a dropped member to come back. */
  connected: boolean
  seatId: string | null
  /** Null until the member has first moved. */
  pose: PlayerPose | null
  /** The bucket they're holding, if any. */
  popcorn: PopcornFlavor | null
}

export const POPCORN_FLAVORS = ['caramel', 'salted', 'cheese'] as const
export type PopcornFlavor = (typeof POPCORN_FLAVORS)[number]

// The booth stands in the lobby through the right wall, near the screen.
// Players must be within reach of its centre to take a bucket.
export const POPCORN_BOOTH = { x: 18.3, z: -6.2, reach: 3 } as const

export const MAX_CHAT_LENGTH = 300
// These also play a sound for everyone, so they are limited more tightly.
export const SOUND_REACTIONS = ['whistle', 'clap'] as const
export type SoundReaction = (typeof SOUND_REACTIONS)[number]
// Number keys 1 to 8 send these, in this order.
export const REACTIONS = ['👍', '😂', '😮', '😢', '❤️', '👏', ...SOUND_REACTIONS] as const
export type Reaction = (typeof REACTIONS)[number]

export function isSoundReaction(reaction: Reaction): reaction is SoundReaction {
  return (SOUND_REACTIONS as readonly string[]).includes(reaction)
}

export interface ChatMessage {
  id: string
  memberId: string
  /** Set by the server, so nobody can write as someone else. */
  name: string
  text: string
}

export interface RoomSnapshot {
  code: string
  ownerId: string
  members: RoomMember[]
  /** True while the host is sharing their screen. Everyone's lights dim while it is. */
  streaming: boolean
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
  /** The public address for invite links, when the server knows it. */
  inviteOrigin: string | null
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
  | 'INVALID_MESSAGE'
  | 'RATE_LIMITED'
  | 'INVALID_FLAVOR'
  | 'TOO_FAR'

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
  /** Only at the booth. Taking a flavor replaces any bucket already held. */
  'popcorn:take': (
    payload: { flavor: PopcornFlavor },
    ack: (result: RoomResult<null>) => void,
  ) => void
  'popcorn:drop': () => void
  /** One bite, started by the player's click. Only while holding a bucket. */
  'popcorn:eat': () => void
  'chat:send': (
    payload: { text: string },
    ack: (result: RoomResult<null>) => void,
  ) => void
  'reaction:send': (payload: { reaction: Reaction }) => void
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
  'chat:message': (message: ChatMessage) => void
  'reaction:shown': (payload: { memberId: string; reaction: Reaction }) => void
  /** Someone else took a bite, so their avatar should play one. */
  'popcorn:eaten': (payload: { memberId: string }) => void
  /** Only the members who moved since the last update. */
  'players:poses': (poses: (PlayerPose & { id: string })[]) => void
}
