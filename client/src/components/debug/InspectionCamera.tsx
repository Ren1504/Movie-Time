import { useEffect, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Viewpoint } from './viewpoints'

export function InspectionCamera({ viewpoint }: { viewpoint: Viewpoint }) {
  const camera = useThree((state) => state.camera)
  const controlsRef = useRef<OrbitControlsImpl>(null)

  useEffect(() => {
    const controls = controlsRef.current!
    camera.position.set(...viewpoint.position)
    controls.target.set(...viewpoint.target)
    controls.update()
  }, [camera, viewpoint])

  return <OrbitControls ref={controlsRef} />
}
