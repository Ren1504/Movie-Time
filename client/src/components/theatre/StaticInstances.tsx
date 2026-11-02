import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { Matrix4, type BufferGeometry, type InstancedMesh } from 'three'
import type { Vec3 } from '../../utils/boxBatch'

interface StaticInstancesProps {
  geometry: BufferGeometry
  positions: readonly Vec3[]
  castShadow?: boolean
  receiveShadow?: boolean
  children: ReactNode
}

/** Draws one geometry at many fixed positions in a single draw call. */
export function StaticInstances({
  geometry,
  positions,
  castShadow = false,
  receiveShadow = false,
  children,
}: StaticInstancesProps) {
  const meshRef = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = meshRef.current!
    const matrix = new Matrix4()
    positions.forEach(([x, y, z], index) => {
      mesh.setMatrixAt(index, matrix.makeTranslation(x, y, z))
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [positions])

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, positions.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      {children}
    </instancedMesh>
  )
}
