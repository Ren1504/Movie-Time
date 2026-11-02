import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk'
import { serverConfig } from '../config.ts'

const { url, apiKey, apiSecret, tokenLifetime } = serverConfig.liveKit

const roomService = new RoomServiceClient(url.replace(/^ws/, 'http'), apiKey, apiSecret)

/**
 * The media server enforces this token itself, so a viewer's modified client
 * still can't publish anything. Only screen capture is allowed, for the host.
 */
export function createStreamToken(
  roomCode: string,
  memberId: string,
  isHost: boolean,
): Promise<string> {
  const token = new AccessToken(apiKey, apiSecret, {
    identity: memberId,
    ttl: tokenLifetime,
  })
  token.addGrant({
    room: roomCode,
    roomJoin: true,
    canSubscribe: true,
    canPublish: isHost,
    canPublishData: false,
    canPublishSources: isHost ? [TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO] : [],
  })
  return token.toJwt()
}

// These two are best effort. They fail harmlessly if the person or room is
// already gone, and the room's own state doesn't depend on them.

export function removeFromStream(roomCode: string, memberId: string) {
  roomService.removeParticipant(roomCode, memberId).catch(() => {})
}

export function closeStream(roomCode: string) {
  roomService.deleteRoom(roomCode).catch(() => {})
}
