import { randomInt, randomUUID } from 'node:crypto'
import {
  MAX_NAME_LENGTH,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type MemberDeparture,
  type RoomResult,
  type RoomSnapshot,
} from '@movie/shared'

interface Member {
  id: string
  token: string
  name: string
  /** Null while the member is disconnected. */
  socketId: string | null
}

interface Room {
  code: string
  ownerId: string
  members: Map<string, Member>
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
      // Built field by field, so tokens can never reach other members.
      members: [...room.members.values()].map(({ id, name, socketId }) => ({
        id,
        name,
        connected: socketId !== null,
      })),
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
  return { id: randomUUID(), token: randomUUID(), name, socketId }
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
