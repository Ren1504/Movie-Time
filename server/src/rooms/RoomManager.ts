import { randomInt, randomUUID } from 'node:crypto'
import {
  MAX_NAME_LENGTH,
  POPCORN_BOOTH,
  POPCORN_FLAVORS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  isValidSeatId,
  type MemberDeparture,
  type PlayerPose,
  type PopcornFlavor,
  type RoomResult,
  type RoomSnapshot,
} from '@movie/shared'

// Well beyond the theatre, and only there to reject nonsense values.
const MAX_POSE_COORDINATE = 100
const MAX_POSE_ANGLE = 7

interface Member {
  id: string
  token: string
  name: string
  /** Null while the member is disconnected. */
  socketId: string | null
  seatId: string | null
  pose: PlayerPose | null
  poseChanged: boolean
  popcorn: PopcornFlavor | null
}

interface Room {
  code: string
  ownerId: string
  members: Map<string, Member>
  streaming: boolean
}

export interface MemberEntry {
  code: string
  member: Member
}

/** Holds all room state and rules. It knows nothing about sockets or timers. */
export class RoomManager {
  private readonly rooms = new Map<string, Room>()
  private readonly maxMembers: number

  constructor(maxMembers: number) {
    this.maxMembers = maxMembers
  }

  createRoom(rawName: unknown, socketId: string): RoomResult<MemberEntry> {
    const name = parseName(rawName)
    if (!name) return { ok: false, error: 'INVALID_NAME' }

    const code = this.generateCode()
    const member = createMember(name, socketId)
    this.rooms.set(code, {
      code,
      ownerId: member.id,
      members: new Map([[member.id, member]]),
      streaming: false,
    })
    return { ok: true, value: { code, member } }
  }

  joinRoom(
    rawCode: unknown,
    rawName: unknown,
    socketId: string,
  ): RoomResult<MemberEntry> {
    const name = parseName(rawName)
    if (!name) return { ok: false, error: 'INVALID_NAME' }
    const code = parseCode(rawCode)
    if (!code) return { ok: false, error: 'INVALID_CODE' }

    const room = this.rooms.get(code)
    if (!room) return { ok: false, error: 'ROOM_NOT_FOUND' }
    if (room.members.size >= this.maxMembers) return { ok: false, error: 'ROOM_FULL' }

    const member = createMember(name, socketId)
    room.members.set(member.id, member)
    return { ok: true, value: { code, member } }
  }

  findByToken(rawToken: unknown): MemberEntry | null {
    if (typeof rawToken !== 'string') return null
    for (const room of this.rooms.values()) {
      for (const member of room.members.values()) {
        if (member.token === rawToken) return { code: room.code, member }
      }
    }
    return null
  }

  getMember(code: string, memberId: string): Member | null {
    return this.rooms.get(code)?.members.get(memberId) ?? null
  }

  isOwner(code: string, memberId: string): boolean {
    return this.rooms.get(code)?.ownerId === memberId
  }

  /** Only the current owner can change whether the room is streaming. */
  setStreaming(code: string, memberId: string, streaming: boolean): RoomResult<null> {
    const room = this.rooms.get(code)
    if (!room?.members.has(memberId)) return { ok: false, error: 'NOT_IN_ROOM' }
    if (room.ownerId !== memberId) return { ok: false, error: 'NOT_OWNER' }
    room.streaming = streaming
    return { ok: true, value: null }
  }

  /** A seat holds one person, and a person holds one seat. */
  claimSeat(code: string, memberId: string, rawSeatId: unknown): RoomResult<null> {
    const room = this.rooms.get(code)
    const member = room?.members.get(memberId)
    if (!room || !member) return { ok: false, error: 'NOT_IN_ROOM' }
    if (!isValidSeatId(rawSeatId)) return { ok: false, error: 'INVALID_SEAT' }
    for (const other of room.members.values()) {
      if (other !== member && other.seatId === rawSeatId) {
        return { ok: false, error: 'SEAT_TAKEN' }
      }
    }
    member.seatId = rawSeatId
    return { ok: true, value: null }
  }

  releaseSeat(code: string, memberId: string): void {
    const member = this.getMember(code, memberId)
    if (member) member.seatId = null
  }

  /** Uses the last position the member reported, so they must be at the booth. */
  takePopcorn(code: string, memberId: string, rawFlavor: unknown): RoomResult<null> {
    const member = this.getMember(code, memberId)
    if (!member) return { ok: false, error: 'NOT_IN_ROOM' }
    const flavor = POPCORN_FLAVORS.find((item) => item === rawFlavor)
    if (!flavor) return { ok: false, error: 'INVALID_FLAVOR' }
    const { pose } = member
    const nearBooth =
      pose !== null &&
      member.seatId === null &&
      Math.hypot(pose.x - POPCORN_BOOTH.x, pose.z - POPCORN_BOOTH.z) <= POPCORN_BOOTH.reach
    if (!nearBooth) return { ok: false, error: 'TOO_FAR' }
    member.popcorn = flavor
    return { ok: true, value: null }
  }

  /** Returns false when there was nothing to drop, so nobody needs telling. */
  dropPopcorn(code: string, memberId: string): boolean {
    const member = this.getMember(code, memberId)
    if (!member?.popcorn) return false
    member.popcorn = null
    return true
  }

  updatePose(code: string, memberId: string, rawPose: unknown): void {
    const member = this.getMember(code, memberId)
    if (!member || !isValidPose(rawPose)) return
    const { x, z, yaw, pitch } = rawPose
    member.pose = { x, z, yaw, pitch }
    member.poseChanged = true
  }

  /** Returns each room's moved members, and marks them as sent. */
  takeChangedPoses(): { code: string; poses: (PlayerPose & { id: string })[] }[] {
    const changes = []
    for (const room of this.rooms.values()) {
      const poses = []
      for (const member of room.members.values()) {
        if (!member.poseChanged || !member.pose) continue
        member.poseChanged = false
        poses.push({ id: member.id, ...member.pose })
      }
      if (poses.length > 0) changes.push({ code: room.code, poses })
    }
    return changes
  }

  /**
   * Removes a member. If it was the owner, ownership passes to whoever has been
   * in the room longest, preferring someone who is connected right now. A room
   * with nobody left is deleted, which returns null as there's no one to tell.
   */
  removeMember(code: string, memberId: string): MemberDeparture | null {
    const room = this.rooms.get(code)
    const member = room?.members.get(memberId)
    if (!room || !member) return null

    room.members.delete(memberId)
    const remaining = [...room.members.values()]
    if (remaining.length === 0) {
      this.rooms.delete(code)
      return null
    }
    if (room.ownerId !== memberId) return { name: member.name, newOwner: null }

    const next = remaining.find(({ socketId }) => socketId !== null) ?? remaining[0]
    room.ownerId = next.id
    // The stream was the old owner's screen, so it ends with them.
    room.streaming = false
    return { name: member.name, newOwner: { id: next.id, name: next.name } }
  }

  /** Deletes the room and returns its members, so the caller can notify them. */
  destroyRoom(code: string): Member[] {
    const members = [...(this.rooms.get(code)?.members.values() ?? [])]
    this.rooms.delete(code)
    return members
  }

  getSnapshot(code: string): RoomSnapshot | null {
    const room = this.rooms.get(code)
    if (!room) return null
    return {
      code,
      ownerId: room.ownerId,
      streaming: room.streaming,
      // Built field by field, so tokens can never reach other members.
      members: [...room.members.values()].map(
        ({ id, name, socketId, seatId, pose, popcorn }) => ({
          id,
          name,
          connected: socketId !== null,
          seatId,
          pose,
          popcorn,
        }),
      ),
    }
  }

  private generateCode(): string {
    let code: string
    do {
      code = Array.from(
        { length: ROOM_CODE_LENGTH },
        () => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)],
      ).join('')
    } while (this.rooms.has(code))
    return code
  }
}

function createMember(name: string, socketId: string): Member {
  return {
    id: randomUUID(),
    token: randomUUID(),
    name,
    socketId,
    seatId: null,
    pose: null,
    poseChanged: false,
    popcorn: null,
  }
}

function isInRange(value: unknown, limit: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit
}

function isValidPose(value: unknown): value is PlayerPose {
  if (typeof value !== 'object' || value === null) return false
  const { x, z, yaw, pitch } = value as Record<string, unknown>
  return (
    isInRange(x, MAX_POSE_COORDINATE) &&
    isInRange(z, MAX_POSE_COORDINATE) &&
    isInRange(yaw, MAX_POSE_ANGLE) &&
    isInRange(pitch, MAX_POSE_ANGLE)
  )
}

function parseName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = value.replace(/\p{C}/gu, '').trim()
  return name.length > 0 && name.length <= MAX_NAME_LENGTH ? name : null
}

function parseCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const code = value.trim().toUpperCase()
  const isValid =
    code.length === ROOM_CODE_LENGTH &&
    [...code].every((character) => ROOM_CODE_ALPHABET.includes(character))
  return isValid ? code : null
}
