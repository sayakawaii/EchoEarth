import { useState } from 'react'
import type { UserPosition } from '../hooks/useGeolocation'

interface Props {
  position: UserPosition | null
  maxChars: number
  disabled: boolean
  hint?: string
  onSend: (text: string) => void
  onChangeNickname?: () => void
  nickname: string
}

export function ComposerDock({
  position,
  maxChars,
  disabled,
  hint,
  onSend,
  onChangeNickname,
  nickname,
}: Props) {
  const [text, setText] = useState('')
  const trimmed = text.trim()
  const over = trimmed.length > maxChars
  const canSend = !disabled && !!position && trimmed.length > 0 && !over

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-[1500] mx-auto flex max-w-3xl flex-col gap-2 px-3 pb-3 pt-2 sm:pb-4">
      <div className="rounded-2xl border border-white/10 bg-echo-panel/90 p-3 shadow-2xl backdrop-blur-md">
        <div className="mb-2 flex items-center justify-between text-xs text-echo-muted">
          <span>
            <span className="text-echo-accent">{nickname}</span>{' '}
            {position
              ? `· ${position.lat.toFixed(2)}, ${position.lng.toFixed(2)} · ${sourceLabel(position.source)}`
              : '· 位置获取中…'}
          </span>
          <div className="flex items-center gap-3">
            {onChangeNickname && (
              <button
                type="button"
                onClick={onChangeNickname}
                className="text-echo-muted hover:text-echo-accent"
              >
                改昵称
              </button>
            )}
            <span className={over ? 'text-red-400' : ''}>
              {trimmed.length}/{maxChars}
            </span>
          </div>
        </div>

        <form
          className="flex items-stretch gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!canSend) return
            onSend(trimmed)
            setText('')
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              position
                ? '在这个坐标说点什么…(5 分钟后自动消失)'
                : '等待位置中…可点击地图任意位置选点'
            }
            maxLength={maxChars + 32}
            className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-echo-text outline-none focus:border-echo-accent"
          />
          <button
            type="submit"
            disabled={!canSend}
            className="rounded-xl bg-echo-accent px-4 py-2 font-semibold text-echo-bg transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            发送
          </button>
        </form>

        {hint && (
          <p className="mt-2 text-xs text-amber-300/90">{hint}</p>
        )}
        <p className="mt-2 text-[11px] text-echo-muted">
          没定位?点击地图任意位置即可手动选点。
        </p>
      </div>
    </div>
  )
}

function sourceLabel(s: UserPosition['source']): string {
  switch (s) {
    case 'browser':
      return '浏览器定位'
    case 'ip':
      return 'IP 估算'
    case 'manual':
      return '手动选点'
    default:
      return '兜底坐标'
  }
}
