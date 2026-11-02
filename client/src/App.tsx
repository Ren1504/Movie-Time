import { useState } from 'react'
import { ViewpointPicker } from './components/debug/ViewpointPicker'
import { viewpoints } from './components/debug/viewpoints'
import { SceneCanvas } from './components/scene/SceneCanvas'

const requestedView = new URLSearchParams(window.location.search).get('view')
const initialViewpoint =
  viewpoints.find(({ id }) => id === requestedView) ?? viewpoints[0]

function App() {
  const [viewpoint, setViewpoint] = useState(initialViewpoint)

  return (
    <>
      <SceneCanvas viewpoint={viewpoint} />
      <ViewpointPicker active={viewpoint} onSelect={setViewpoint} />
    </>
  )
}

export default App
