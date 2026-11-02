import { useEffect, useMemo, useRef } from 'react'
import { CanvasTexture, SRGBColorSpace, VideoTexture, type Mesh } from 'three'
import { theatreConfig } from '../../config/theatreConfig'
import { streamVideo, useStreamState } from '../../systems/stream/streamStore'

const { screen, colors } = theatreConfig

const VIDEO_OFFSET = 0.02
const BADGE_OFFSET = 0.04
const BADGE_WIDTH = 1.5
const BADGE_HEIGHT = 0.6
const BADGE_MARGIN = 0.4
const MESSAGE_CANVAS_WIDTH = 1024
const LIVE_RED = '#d8222f'

const WAITING_MESSAGE = "The host isn't sharing their screen yet"
const LOADING_MESSAGE = 'Connecting to the live stream...'
const FAILED_MESSAGE = "Can't reach the streaming server. Retrying..."

const videoTexture = new VideoTexture(streamVideo)
videoTexture.colorSpace = SRGBColorSpace

function createMessageTexture(message: string) {
  const canvas = document.createElement('canvas')
  canvas.width = MESSAGE_CANVAS_WIDTH
  canvas.height = Math.round((MESSAGE_CANVAS_WIDTH * screen.height) / screen.width)
  const context = canvas.getContext('2d')!
  context.fillStyle = colors.idleScreen
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#26211f'
  context.font = '500 38px system-ui, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(message, canvas.width / 2, canvas.height / 2)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function createLiveBadgeTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 250
  canvas.height = 100
  const context = canvas.getContext('2d')!
  context.fillStyle = LIVE_RED
  context.beginPath()
  context.roundRect(0, 0, canvas.width, canvas.height, 16)
  context.fill()
  context.fillStyle = '#fff'
  context.beginPath()
  context.arc(46, 50, 16, 0, Math.PI * 2)
  context.fill()
  context.font = '700 60px system-ui, sans-serif'
  context.textBaseline = 'middle'
  context.fillText('LIVE', 76, 54)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

const liveBadgeTexture = createLiveBadgeTexture()

/** The largest size that fits the screen without changing the video's shape. */
function fitToScreen(videoWidth: number, videoHeight: number) {
  const videoAspect = videoWidth / videoHeight
  return videoAspect > screen.width / screen.height
    ? [screen.width, screen.width / videoAspect]
    : [screen.height * videoAspect, screen.height]
}

/** The cinema screen, centred on the given position. */
export function CinemaDisplay({ position }: { position: [number, number, number] }) {
  const { connection, roomStreaming, hasVideo } = useStreamState()
  const videoMeshRef = useRef<Mesh>(null)

  const showVideo = roomStreaming && hasVideo

  let message = WAITING_MESSAGE
  if (connection === 'failed') message = FAILED_MESSAGE
  else if (roomStreaming) message = LOADING_MESSAGE
  const messageTexture = useMemo(() => createMessageTexture(message), [message])
  useEffect(() => () => messageTexture.dispose(), [messageTexture])

  // The shared content can change size at any time, such as a resized window.
  useEffect(() => {
    const applySize = () => {
      const mesh = videoMeshRef.current
      if (!mesh || !streamVideo.videoWidth || !streamVideo.videoHeight) return
      const [width, height] = fitToScreen(streamVideo.videoWidth, streamVideo.videoHeight)
      mesh.scale.set(width, height, 1)
    }
    applySize()
    streamVideo.addEventListener('resize', applySize)
    streamVideo.addEventListener('loadedmetadata', applySize)
    return () => {
      streamVideo.removeEventListener('resize', applySize)
      streamVideo.removeEventListener('loadedmetadata', applySize)
    }
  }, [])

  const [x, y, z] = position

  return (
    <group position={[x, y, z]}>
      <mesh>
        <planeGeometry args={[screen.width, screen.height]} />
        {showVideo ? (
          // Black bars around video that doesn't match the screen's shape.
          <meshBasicMaterial color="#000000" fog={false} toneMapped={false} />
        ) : (
          <meshBasicMaterial key={message} map={messageTexture} fog={false} toneMapped={false} />
        )}
      </mesh>
      <mesh ref={videoMeshRef} position={[0, 0, VIDEO_OFFSET]} visible={showVideo}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={videoTexture} fog={false} toneMapped={false} />
      </mesh>
      {showVideo && (
        <mesh
          position={[
            screen.width / 2 - BADGE_WIDTH / 2 - BADGE_MARGIN,
            screen.height / 2 - BADGE_HEIGHT / 2 - BADGE_MARGIN,
            BADGE_OFFSET,
          ]}
        >
          <planeGeometry args={[BADGE_WIDTH, BADGE_HEIGHT]} />
          <meshBasicMaterial map={liveBadgeTexture} transparent fog={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}
