/** True when a key press belongs to a text box, not to the game. */
export function isTyping(event: KeyboardEvent) {
  return event.target instanceof HTMLInputElement
}
