import { CuboidCollider, RigidBody } from '@react-three/rapier'
import type { Box } from '../../utils/boxBatch'

/** Invisible solid boxes. They are independent of what the scene draws. */
export function StaticColliders({ boxes }: { boxes: readonly Box[] }) {
  return (
    <RigidBody type="fixed" colliders={false}>
      {boxes.map(({ center, size, rotationX = 0 }) => (
        <CuboidCollider
          key={center.join(',')}
          position={center}
          rotation={[rotationX, 0, 0]}
          args={[size[0] / 2, size[1] / 2, size[2] / 2]}
        />
      ))}
    </RigidBody>
  )
}
