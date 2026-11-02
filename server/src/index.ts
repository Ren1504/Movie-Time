import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'
import express from 'express'
import { Server } from 'socket.io'
import { serverConfig } from './config.ts'
import { RoomManager } from './rooms/RoomManager.ts'
import { registerRoomHandlers } from './sockets/registerRoomHandlers.ts'

const app = express()
app.get('/health', (_request, response) => {
  response.json({ status: 'ok' })
})

// In development Vite serves the app instead.
const clientBuild = join(import.meta.dirname, '..', '..', 'client', 'dist')
if (serverConfig.isProduction && existsSync(clientBuild)) {
  app.use(express.static(clientBuild))
}

const httpServer = createServer(app)
const io = new Server(httpServer, {
  maxHttpBufferSize: serverConfig.maxMessageBytes,
})

registerRoomHandlers(io, new RoomManager(serverConfig.maxMembersPerRoom))

httpServer.listen(serverConfig.port, () => {
  console.log(`Server listening on http://localhost:${serverConfig.port}`)
})
