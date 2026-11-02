// Finds the LiveKit media server, downloading it on first use.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { arch, platform } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const VERSION = '1.13.11'
const RELEASE_URL = `https://github.com/livekit/livekit/releases/download/v${VERSION}`

export const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
export const toolsRoot = join(projectRoot, 'tools')

const toolsDir = join(toolsRoot, 'livekit', VERSION)
const isWindows = platform() === 'win32'
const binary = join(toolsDir, isWindows ? 'livekit-server.exe' : 'livekit-server')

function assetName() {
  const cpu = arch() === 'x64' ? 'amd64' : arch()
  if (isWindows) return `livekit_${VERSION}_windows_${cpu}.zip`
  if (platform() === 'linux') return `livekit_${VERSION}_linux_${cpu}.tar.gz`
  throw new Error(`No LiveKit download for ${platform()}. Install livekit-server yourself.`)
}

async function download(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`)
  return Buffer.from(await response.arrayBuffer())
}

async function install() {
  const asset = assetName()
  console.log(`Downloading LiveKit ${VERSION} (about 20 MB)...`)
  const [archive, checksums] = await Promise.all([
    download(`${RELEASE_URL}/${asset}`),
    download(`${RELEASE_URL}/checksums.txt`),
  ])

  const expected = checksums
    .toString()
    .split('\n')
    .find((line) => line.trim().endsWith(asset))
    ?.split(/\s+/)[0]
  const actual = createHash('sha256').update(archive).digest('hex')
  if (expected !== actual) throw new Error(`Checksum mismatch for ${asset}`)

  mkdirSync(toolsDir, { recursive: true })
  const archivePath = join(toolsDir, asset)
  writeFileSync(archivePath, archive)
  const result = spawnSync('tar', ['-xf', asset], { cwd: toolsDir, stdio: 'inherit' })
  rmSync(archivePath)
  if (result.status !== 0 || !existsSync(binary)) {
    throw new Error('Could not unpack LiveKit.')
  }
  console.log('LiveKit is ready.')
}

export async function ensureLiveKit() {
  if (!existsSync(binary)) await install()
  return binary
}
