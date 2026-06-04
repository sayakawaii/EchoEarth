import { useEffect, useRef } from 'react'

// Curated, lightweight set. Keeps bundle tiny; can be replaced later.
const EMOJIS: string[] = [
  '😀', '😂', '🥹', '😊', '😍', '🤩', '😎', '😴',
  '🤔', '😅', '🙃', '😭', '😡', '🤯', '🥳', '🤗',
  '👍', '👏', '🙌', '🙏', '🤝', '✨', '🔥', '💯',
  '❤️', '💔', '🌍', '🌏', '🌎', '🌟', '🌈', '☀️',
  '🌧️', '☕', '🍻', '🍕', '🎵', '🎮', '🚀', '🛸',
]

interface Props {
  open: boolean
  onSelect: (emoji: string) => void
  onClose: () => void
  anchorRef?: React.RefObject<HTMLElement>
}

/**
 * Lightweight grid picker. Closes on outside click, Escape, or selection.
 * Positioned absolutely above its trigger by the parent.
 */
export function EmojiPicker({ open, onSelect, onClose, anchorRef }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (panelRef.current && panelRef.current.contains(target)) return
      if (anchorRef?.current && anchorRef.current.contains(target)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('touchstart', onDocClick, { passive: true })
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('touchstart', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, anchorRef])

  if (!open) return null

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="选择表情"
      className="absolute bottom-[110%] right-0 z-[1700] w-[280px] rounded-2xl border border-white/10 bg-[var(--echo-panel)]/95 p-2 shadow-2xl backdrop-blur-md animate-[popIn_140ms_cubic-bezier(0.16,1,0.3,1)_both]"
    >
      <div className="grid grid-cols-8 gap-1">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onSelect(e)}
            className="rounded-lg p-1.5 text-lg leading-none transition hover:bg-white/10"
            aria-label={`插入表情 ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}
