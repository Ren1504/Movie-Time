import { useEffect, useRef, useState, type FormEvent } from 'react'
import { MAX_CHAT_LENGTH, REACTIONS, type ChatMessage } from '@movie/shared'
import { REQUEST_TIMEOUT_MS, socket } from '../../network/socket'
import { isTyping } from '../../utils/isTyping'

const MAX_KEPT_MESSAGES = 50

const SEND_FAILED = "That message didn't send."
const TOO_FAST = "You're sending messages too quickly."

/** Lines fade out by themselves, and all come back while typing. */
export function ChatBox() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMessage = (message: ChatMessage) => {
      setMessages((previous) => [...previous, message].slice(-MAX_KEPT_MESSAGES))
    }
    socket.on('chat:message', handleMessage)
    return () => {
      socket.off('chat:message', handleMessage)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event) || event.repeat) return
      const reactionIndex = /^Digit([1-6])$/.exec(event.code)
      if (reactionIndex && document.pointerLockElement) {
        const reaction = REACTIONS[Number(reactionIndex[1]) - 1]
        socket.emit('reaction:send', { reaction })
      } else if (
        event.code === 'KeyT' ||
        (event.code === 'Enter' && document.pointerLockElement)
      ) {
        // Otherwise the T would land in the box as it opens.
        event.preventDefault()
        setError(null)
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight)
  }, [messages, open])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) {
      setOpen(false)
      return
    }
    socket.timeout(REQUEST_TIMEOUT_MS).emit('chat:send', { text: trimmed }, (failure, result) => {
      if (!failure && result.ok) return
      setError(!failure && !result.ok && result.error === 'RATE_LIMITED' ? TOO_FAST : SEND_FAILED)
      setText(trimmed)
      setOpen(true)
    })
    setText('')
    setOpen(false)
  }

  return (
    <div className={open ? 'chat-box open' : 'chat-box'}>
      <div className="chat-lines" ref={listRef} role="log">
        {messages.map((message) => (
          <div key={message.id} className="chat-line">
            <strong>{message.name}</strong> {message.text}
          </div>
        ))}
      </div>
      {error && <div className="chat-error" role="alert">{error}</div>}
      {open && (
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            aria-label="Chat message"
            placeholder="Say something, then press Enter"
            value={text}
            maxLength={MAX_CHAT_LENGTH}
            autoComplete="off"
            onChange={(event) => setText(event.target.value)}
            onBlur={() => setOpen(false)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setOpen(false)
            }}
          />
        </form>
      )}
    </div>
  )
}
