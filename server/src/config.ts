export const serverConfig = {
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
} as const
