import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleGeometry, IcosahedronGeometry, MathUtils, MeshStandardMaterial, Vector3, type Group } from 'three'
import type { PopcornFlavor } from '@movie/shared'
import { socket } from '../../network/socket'
import { Bite } from '../../systems/popcorn/eating'
import { localSeat } from '../../systems/seats/seatOccupancy'
import { SKIN_COLOR } from '../avatars/avatarModel'
import { PopcornBucket } from './PopcornBucket'
import { BUCKET_HEIGHT, popcornMaterials } from './popcornModel'

// Positions are relative to the camera: +X right, +Y up, -Z ahead.
// The bucket is in the left hand, as others see it on the avatar.
const CARRIED = new Vector3(-0.3, -0.36, -0.66)
const ON_LAP = new Vector3(-0.24, -0.46, -0.64)
const SCALE = 1
const SIT_RESPONSE = 6
// The right hand comes in from the lower right, reaches across into the
// bucket, then rises to the bottom of the view, where the mouth would be.
const HAND_AWAY = new Vector3(0.45, -0.55, -0.45)
const HAND_MOUTH = new Vector3(0.04, -0.13, -0.3)
const IN_BUCKET_DEPTH = 0.03

const handGeometry = new CapsuleGeometry(0.03, 0.05, 4, 8)
const forearmGeometry = new CapsuleGeometry(0.035, 0.22, 4, 8).translate(0, -0.14, 0)
const puffGeometry = new IcosahedronGeometry(0.022, 0)
const skinMaterial = new MeshStandardMaterial({ color: SKIN_COLOR, roughness: 0.8 })

const handTarget = new Vector3()
const bucketTop = new Vector3()

interface PopcornViewModelProps {
  flavor: PopcornFlavor
}

/** The local player's own bucket and hand, which follow the camera. */
export function PopcornViewModel({ flavor }: PopcornViewModelProps) {
  const rootRef = useRef<Group>(null)
  const bucketRef = useRef<Group>(null)
  const handRef = useRef<Group>(null)
  const motionRef = useRef({ seated: 0 })
  const biteRef = useRef<Bite>(null)
  biteRef.current ??= new Bite()

  // A left click while playing takes a bite. Clicks with the mouse free are
  // for the menus, so they're ignored.
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0 || !document.pointerLockElement) return
      if (biteRef.current!.start()) socket.emit('popcorn:eat')
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  useFrame(({ camera }, delta) => {
    const root = rootRef.current
    const bucket = bucketRef.current
    const hand = handRef.current
    if (!root || !bucket || !hand) return
    root.position.copy(camera.position)
    root.quaternion.copy(camera.quaternion)

    const seated = localSeat.id !== null
    const motion = motionRef.current
    motion.seated = MathUtils.damp(motion.seated, Number(seated), SIT_RESPONSE, delta)
    bucket.position.lerpVectors(CARRIED, ON_LAP, motion.seated)

    const bite = biteRef.current!
    bite.update(delta)
    const { reach, lift } = bite.pose()
    hand.visible = reach > 0 || lift > 0
    if (!hand.visible) return

    bucketTop.copy(bucket.position)
    bucketTop.y += (BUCKET_HEIGHT - IN_BUCKET_DEPTH) * SCALE
    handTarget.lerpVectors(HAND_AWAY, bucketTop, reach).lerp(HAND_MOUTH, lift)
    hand.position.copy(handTarget)
  })

  return (
    <group ref={rootRef}>
      <group ref={bucketRef} rotation={[0.35, 0.3, 0]} scale={SCALE}>
        <PopcornBucket flavor={flavor} />
      </group>
      <group ref={handRef} name="popcorn-hand" visible={false} rotation={[0.9, 0, 0.7]}>
        <mesh geometry={handGeometry} material={skinMaterial} />
        <mesh geometry={forearmGeometry} material={skinMaterial} />
        <mesh geometry={puffGeometry} material={popcornMaterials[flavor]} position={[0, 0.045, 0]} />
      </group>
    </group>
  )
}
