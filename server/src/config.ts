const isProduction = process.env.NODE_ENV === 'production'

// The defaults match LiveKit's development mode, and are public knowledge.
const liveKitApiKey = process.env.LIVEKIT_API_KEY ?? 'devkey'
const liveKitApiSecret = process.env.LIVEKIT_API_SECRET ?? 'secret'
if (isProduction && (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET)) {
  throw new Error('LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set in production.')
}

export const serverConfig = {
  isProduction,
  port: Number(process.env.PORT ?? 3001),
  maxMembersPerRoom: 16,
  // How long a dropped member keeps their place. Covers refreshes and network blips.
  reconnectGraceMs: Number(process.env.RECONNECT_GRACE_MS ?? 30_000),
  // A closing page gets far less, as only a refresh would bring it back.
  pageCloseGraceMs: 5_000,
  // Room messages are small, so anything larger is rejected.
  maxMessageBytes: 10_000,
  // How often the movement of each room's players is sent out.
  poseBroadcastHz: 15,
  // The address friends open, for invite links. Unknown in development.
  publicOrigin: process.env.PUBLIC_ORIGIN ?? null,
  // Only true behind a proxy that sets this header, or anyone could fake their address.
  trustProxy: process.env.TRUST_PROXY === 'true',
  rateLimits: {
    // Failed joins only, so this slows code guessing without affecting friends.
    failedJoinsPerMinute: 20,
    roomsCreatedPerMinute: 20,
    chatMessagesPer10Seconds: 8,
    reactionsPer5Seconds: 10,
    soundReactionsPer5Seconds: 3,
  },
  liveKit: {
    // How this server reaches LiveKit, which runs beside it.
    url: process.env.LIVEKIT_URL ?? 'ws://localhost:7880',
    // Set when browsers connect through a domain, such as wss://live.example.com.
    publicUrl: process.env.LIVEKIT_PUBLIC_URL ?? null,
    // Otherwise they use the address they opened the app on, with this port.
    clientPort: 7880,
    apiKey: liveKitApiKey,
    apiSecret: liveKitApiSecret,
    // Short, so a removed member's access soon runs out. Clients ask for a new one.
    tokenLifetime: '10m',
  },
} as const
