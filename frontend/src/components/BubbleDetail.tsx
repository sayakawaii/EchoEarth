import { useEffect, useState } from 'react'
import type { Bubble } from '../lib/types'

interface Props {
  bubble: Bubble | null
  onClose: () => void
  onFocus?: (lat: number, lng: number) => void
}

/**
 * Side sheet that shows the full text, exact timestamp, and a live TTL
 * progress bar for the selected bubble. Renders nothing when bubble is null.
 */
export function BubbleDetail({ bubble, onClose, onFocus }: Props) {
  const [now, setNow] = useState(() => Date.now())

  // Tick once per second while open to update the TTL bar.
  useEffect(() => {
    if (!bubble) return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [bubble])

  // Close on Escape.
  useEffect(() => {
    if (!bubble) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [bubble, onClose])

  if (!bubble) return null

  const created = new Date(bubble.createdAt)
  const expires = new Date(bubble.expiresAt)
  const totalMs = Math.max(1, expires.getTime() - created.getTime())
  const remainingMs = Math.max(0, expires.getTime() - now)
  const pct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100))

  return (
    <aside
      role="dialog"
      aria-label="气泡详情"
      className="fixed inset-y-0 right-0 z-[1800] flex w-full max-w-sm flex-col border-l border-white/10 bg-[var(--echo-panel)]/95 p-4 shadow-2xl backdrop-blur-md animate-[slideInRight_220ms_cubic-bezier(0.16,1,0.3,1)_both] sm:max-w-md"
    >
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-[var(--echo-text)]">
            <span className="text-[var(--echo-accent)]">{bubble.nickname}</span>
            <span className="text-[var(--echo-muted)]"> 的气泡</span>
          </h2>
          <p className="mt-0.5 text-xs text-[var(--echo-muted)]">
            {bubble.lat.toFixed(2)}, {bubble.lng.toFixed(2)}
          </p>
        </div>
        <button
          type="button"
          aria-label="关闭详情"
          onClick={onClose}
          className="rounded-full p-1.5 text-[var(--echo-muted)] transition hover:bg-white/10 hover:text-[var(--echo-text)]"
        >
          ×
        </button>
      </header>

      <div className="flex-1 overflow-auto">
        <p className="whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-relaxed text-[var(--echo-text)]">
          {bubble.text}
        </p>

        <dl className="mt-4 space-y-2 text-xs">
          <Row label="发布时间" value={formatDateTime(created)} />
          <Row label="过期时间" value={formatDateTime(expires)} />
          <Row label="剩余时间" value={formatRemaining(remainingMs)} />
        </dl>

        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-[var(--echo-accent)] transition-[width] duration-700 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <footer className="mt-3 flex gap-2">
        {onFocus && (
          <button
            type="button"
            onClick={() => onFocus(bubble.lat, bubble.lng)}
            className="flex-1 rounded-lg border border-white/15 px-3 py-2 text-sm text-[var(--echo-text)] transition hover:border-[var(--echo-accent)]/50 hover:text-[var(--echo-accent)]"
          >
            在地图聚焦
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg bg-[var(--echo-accent)] px-3 py-2 text-sm font-semibold text-[var(--echo-bg)] transition hover:opacity-90"
        >
          关闭
        </button>
      </footer>
    </aside>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[var(--echo-muted)]">{label}</dt>
      <dd className="font-mono text-[var(--echo-text)]">{value}</dd>
    </div>
  )
}

function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '即将消失'
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}
