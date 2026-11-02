import { viewpoints, type Viewpoint } from './viewpoints'

interface ViewpointPickerProps {
  active: Viewpoint
  onSelect: (viewpoint: Viewpoint) => void
}

export function ViewpointPicker({ active, onSelect }: ViewpointPickerProps) {
  return (
    <nav className="viewpoint-picker" aria-label="Camera viewpoints">
      {viewpoints.map((viewpoint) => (
        <button
          key={viewpoint.id}
          type="button"
          aria-pressed={viewpoint.id === active.id}
          onClick={() => onSelect(viewpoint)}
        >
          {viewpoint.label}
        </button>
      ))}
    </nav>
  )
}
