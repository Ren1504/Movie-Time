import type { RoomSnapshot } from '@movie/shared'

/** Seats taken by anyone in the room, as last reported by the server. */
export const occupiedSeatIds = new Set<string>()

/** The seat this player is in, which decides if it's kept after a reconnect. */
export const localSeat = { id: null as string | null }

export function syncOccupiedSeats(room: RoomSnapshot) {
  occupiedSeatIds.clear()
  for (const { seatId } of room.members) {
    if (seatId) occupiedSeatIds.add(seatId)
  }
}
