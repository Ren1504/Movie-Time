import type { ThreeElements } from '@react-three/fiber'
import type { PopcornFlavor } from '@movie/shared'
import { bucketGeometry, bucketMaterial, popcornGeometry, popcornMaterials } from './popcornModel'

type PopcornBucketProps = ThreeElements['group'] & { flavor: PopcornFlavor }

export function PopcornBucket({ flavor, ...props }: PopcornBucketProps) {
  return (
    <group {...props}>
      <mesh geometry={bucketGeometry} material={bucketMaterial} />
      <mesh geometry={popcornGeometry} material={popcornMaterials[flavor]} />
    </group>
  )
}
