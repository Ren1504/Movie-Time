import type { RoomMember } from '@movie/shared'
import { Avatar } from './Avatar'

interface RemoteAvatarsProps {
  members: RoomMember[]
  localMemberId: string
}

export function RemoteAvatars({ members, localMemberId }: RemoteAvatarsProps) {
  return members.map(
    (member, index) =>
      member.id !== localMemberId && (
        <Avatar key={member.id} member={member} spawnSlot={index} />
      ),
  )
}
