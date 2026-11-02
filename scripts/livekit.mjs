// Runs the LiveKit media server for development.
import { spawn } from 'node:child_process'
import { ensureLiveKit } from './livekitBinary.mjs'

// Development mode: fixed test keys, which must never be exposed to the internet.
const server = spawn(await ensureLiveKit(), ['--dev'], { stdio: 'inherit' })
server.on('exit', (code) => process.exit(code ?? 0))
process.on('SIGINT', () => server.kill())
process.on('SIGTERM', () => server.kill())
