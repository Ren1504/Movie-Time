import type { SeatPrompt } from '../../systems/seats/useSeatInteraction'

const PROMPT_TEXT: Record<SeatPrompt, string> = {
  sit: 'Sit',
  stand: 'Stand',
}

export function SeatPromptLabel({ prompt }: { prompt: SeatPrompt }) {
  return (
    <div className="seat-prompt" role="status">
      Press <kbd>E</kbd> to {PROMPT_TEXT[prompt]}
    </div>
  )
}
