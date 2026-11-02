import type { PlayerPose, RoomSnapshot } from '@movie/shared'
import { socket } from '../../network/socket'

/** Latest pose of each player. Avatars read it every frame, so it isn't React state. */
export const remotePoses = new Map<string, PlayerPose>()

socket.on('players:poses', (poses) => {
  for (const { id, ...pose } of poses) remotePoses.set(id, pose)
})

/** Fills in players seen for the first time, and forgets those who left. */
export function syncRemotePoses(room: RoomSnapshot) {
  const memberIds = new Set(room.members.map((member) => member.id))
  for (const id of remotePoses.keys()) {
    if (!memberIds.has(id)) remotePoses.delete(id)
  }
  for (const { id, pose } of room.members) {
    if (pose && !remotePoses.has(id)) remotePoses.set(id, pose)
  }
}
