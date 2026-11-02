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
  liveKit: {
    // How this server reaches LiveKit, which runs beside it.
    url: process.env.LIVEKIT_URL ?? 'ws://localhost:7880',
    // Browsers use the address they opened the app on, with this port.
    clientPort: 7880,
    apiKey: liveKitApiKey,
    apiSecret: liveKitApiSecret,
    // Short, so a removed member's access soon runs out. Clients ask for a new one.
    tokenLifetime: '10m',
  },
} as const
