import { useEffect, useMemo, useRef, useState } from 'react'
import type { UserPosition } from '../hooks/useGeolocation'
import type { IPLocation } from '../lib/types'
import { EmojiPicker } from './EmojiPicker'

interface Props {
  position: UserPosition | null
  maxChars: number
  disabled: boolean
  ipLocation?: IPLocation | null
  onSend: (text: string) => void
  onChangeNickname?: () => void
  nickname: string
}

export function ComposerDock({
  position,
  maxChars,
  disabled,
  ipLocation,
  onSend,
  onChangeNickname,
  nickname,
}: Props) {
  const [text, setText] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const emojiBtnRef = useRef<HTMLButtonElement>(null)

  const trimmed = text.trim()
  const length = [...trimmed].length // count code points, not UTF-16 units
  const over = length > maxChars
  const warn = !over && length > maxChars * 0.7
  const canSend = !disabled && !!position && length > 0 && !over

  // Auto-grow textarea up to 5 lines.
  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [text])

  const cityLabel = useMemo(() => {
    if (!ipLocation) return ''
    const bits = [ipLocation.city, ipLocation.country].filter(Boolean)
    return bits.join(', ')
  }, [ipLocation])

  const insertEmoji = (e: string) => {
    const el = taRef.current
    if (!el) {
      setText((t) => t + e)
      return
    }
    const start = el.selectionStart ?? text.length
    const end = el.selectionEnd ?? text.length
    const next = text.slice(0, start) + e + text.slice(end)
    setText(next)
    requestAnimationFrame(() => {
      el.focus()
      const caret = start + e.length
      try {
        el.setSelectionRange(caret, caret)
      } catch {
        // ignore
      }
    })
  }

  const submit = () => {
    if (!canSend) return
    onSend(trimmed)
    setText('')
  }

  return (
    <div
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-[1500] mx-auto flex max-w-3xl flex-col gap-2 px-3 pt-2"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0), 12px)' }}
    >
      <div className="relative rounded-2xl border border-white/10 bg-[var(--echo-panel)]/90 p-3 shadow-2xl backdrop-blur-md">
        {/* Meta row */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-[var(--echo-muted)]">
          <span className="flex flex-wrap items-center gap-x-2">
            <span className="text-[var(--echo-accent)]">{nickname}</span>
            <span aria-hidden>·</span>
            {position ? (
              <>
                <span className="font-mono">
                  {position.lat.toFixed(2)}, {position.lng.toFixed(2)}
                </span>
                <span className="rounded-full border border-white/10 px-1.5 py-px text-[10px] uppercase tracking-wide">
                  {sourceLabel(position.source)}
                </span>
                {cityLabel && (
                  <span className="opacity-80">{cityLabel}</span>
                )}
              </>
            ) : (
              <span>位置获取中…可点击地图选点</span>
            )}
          </span>
          <span className="flex items-center gap-3">
            {onChangeNickname && (
              <button
                type="button"
                onClick={onChangeNickname}
                className="text-[var(--echo-muted)] transition hover:text-[var(--echo-accent)]"
              >
                改昵称
              </button>
            )}
            <span
              className={over ? 'font-semibold text-red-400' : warn ? 'text-amber-400' : ''}
              aria-live="polite"
            >
              {length}/{maxChars}
            </span>
          </span>
        </div>

        {/* Input row */}
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                submit()
              }
            }}
            rows={1}
            placeholder={
              position
                ? '在这里说点什么…(Enter 发送 · Shift+Enter 换行 · 5 分钟后消失)'
                : '等待位置中…可点击地图任意位置选点'
            }
            className="flex-1 resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[var(--echo-text)] placeholder:text-[var(--echo-muted)]/80 outline-none focus:border-[var(--echo-accent)]"
            aria-label="消息内容"
          />

          <div className="flex items-stretch gap-2">
            <button
              ref={emojiBtnRef}
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              aria-expanded={pickerOpen}
              aria-label="选择表情"
              className="rounded-xl border border-white/10 bg-black/30 px-3 text-lg text-[var(--echo-text)] transition hover:border-[var(--echo-accent)]/50"
            >
              😀
            </button>
            <button
              type="submit"
              disabled={!canSend}
              className="rounded-xl bg-[var(--echo-accent)] px-4 py-2 font-semibold text-[var(--echo-bg)] transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              发送
            </button>
          </div>

          <EmojiPicker
            open={pickerOpen}
            anchorRef={emojiBtnRef}
            onSelect={(e) => {
              insertEmoji(e)
              // Keep picker open for multiple inserts; user can press Esc or click outside.
            }}
            onClose={() => setPickerOpen(false)}
          />
        </form>

        <p className="mt-2 text-[11px] text-[var(--echo-muted)]">
          没定位?点击地图任意位置即可手动选点。
        </p>
      </div>
    </div>
  )
}

function sourceLabel(s: UserPosition['source']): string {
  switch (s) {
    case 'browser':
      return '浏览器'
    case 'ip':
      return 'IP'
    case 'manual':
      return '手动'
    default:
      return '兜底'
  }
}
