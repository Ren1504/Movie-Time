/** Shows what pressing E will do, such as "Sit" or "get Caramel popcorn". */
export function SeatPromptLabel({ action }: { action: string }) {
  return (
    <div className="seat-prompt" role="status">
      Press <kbd>E</kbd> to {action}
    </div>
  )
}
