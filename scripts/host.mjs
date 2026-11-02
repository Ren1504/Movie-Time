// Hosts the cinema from this computer for friends on the internet: npm run host
// Uses private keys and the built app, unlike the development servers.
import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ensureLiveKit, projectRoot, toolsRoot } from './livekitBinary.mjs'

const APP_PORT = 3001
const SIGNAL_PORT = 7880
const MEDIA_TCP_PORT = 7881
const MEDIA_UDP_PORT = 7882

const keysPath = join(toolsRoot, 'host-keys.json')
const configPath = join(toolsRoot, 'livekit-host.yaml')

/** Created once and kept out of git, so the same keys survive restarts. */
function loadKeys() {
  if (existsSync(keysPath)) return JSON.parse(readFileSync(keysPath, 'utf8'))
  const keys = {
    apiKey: `key${randomBytes(8).toString('hex')}`,
    apiSecret: randomBytes(32).toString('hex'),
  }
  mkdirSync(toolsRoot, { recursive: true })
  writeFileSync(keysPath, JSON.stringify(keys))
  return keys
}

async function findPublicAddress() {
  if (process.env.PUBLIC_ADDRESS) return process.env.PUBLIC_ADDRESS
  const response = await fetch('https://api.ipify.org')
  if (!response.ok) throw new Error('Could not find your public address. Set PUBLIC_ADDRESS.')
  return (await response.text()).trim()
}

const { apiKey, apiSecret } = loadKeys()
const publicAddress = await findPublicAddress()
const liveKitBinary = await ensureLiveKit()

const build = spawnSync('npm run build --workspace client', {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
})
if (build.status !== 0) process.exit(build.status ?? 1)

writeFileSync(
  configPath,
  `port: ${SIGNAL_PORT}
rtc:
  tcp_port: ${MEDIA_TCP_PORT}
  udp_port: ${MEDIA_UDP_PORT}
  use_external_ip: false
  # Friends use the public address. The host's own computer can't always.
  advertise_internal_ip: true
  enable_loopback_candidate: true
keys:
  ${apiKey}: ${apiSecret}
`,
)

const children = [
  spawn(
    liveKitBinary,
    ['--config', configPath, '--bind', '0.0.0.0', '--node-ip', publicAddress],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  ),
  spawn('npx tsx server/src/index.ts', {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(APP_PORT),
      PUBLIC_ORIGIN: `http://${publicAddress}:${APP_PORT}`,
      LIVEKIT_API_KEY: apiKey,
      LIVEKIT_API_SECRET: apiSecret,
    },
  }),
]

const stop = () => children.forEach((child) => child.kill())
children.forEach((child) =>
  child.on('exit', () => {
    stop()
    process.exit(0)
  }),
)
process.on('SIGINT', stop)
process.on('SIGTERM', stop)

console.log(`
You:     http://localhost:${APP_PORT}   (sharing your screen only works from this address)
Friends: http://${publicAddress}:${APP_PORT}

Forward these from your router to this computer:
  TCP ${APP_PORT}, TCP ${SIGNAL_PORT}, TCP ${MEDIA_TCP_PORT}, UDP ${MEDIA_UDP_PORT}

Press Ctrl+C to stop hosting.
`)
