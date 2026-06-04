import { useEffect } from 'react'
import type { Bubble } from '../lib/types'
import type { BubbleCluster } from './MapView'
import { moodColor, moodEmoji } from './MoodPicker'

interface Props {
  cluster: BubbleCluster | null
  onClose: () => void
  onSelectBubble: (b: Bubble) => void
}

export function ClusterList({ cluster, onClose, onSelectBubble }: Props) {
  useEffect(() => {
    if (!cluster) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [cluster, onClose])

  if (!cluster) return null

  // Show most recent first.
  const items = [...cluster.bubbles].reverse()

  return (
    <aside
      role="dialog"
      aria-label={`坐标 ${cluster.lat.toFixed(2)}, ${cluster.lng.toFixed(2)} 的气泡列表`}
      className="fixed inset-y-0 right-0 z-[1750] flex w-full max-w-sm flex-col border-l border-white/10 bg-[var(--echo-panel)]/95 p-4 shadow-2xl backdrop-blur-md animate-[slideInRight_220ms_cubic-bezier(0.16,1,0.3,1)_both] sm:max-w-md"
    >
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-[var(--echo-text)]">
            该坐标共 <span className="text-[var(--echo-accent)]">{cluster.bubbles.length}</span> 条气泡
          </h2>
          <p className="mt-0.5 text-xs text-[var(--echo-muted)]">
            {cluster.lat.toFixed(2)}, {cluster.lng.toFixed(2)} · 最新在上
          </p>
        </div>
        <button
          type="button"
          aria-label="关闭列表"
          onClick={onClose}
          className="rounded-full p-1.5 text-[var(--echo-muted)] transition hover:bg-white/10 hover:text-[var(--echo-text)]"
        >
          ×
        </button>
      </header>

      <ul className="flex-1 space-y-2 overflow-auto pr-1">
        {items.map((b) => {
          const color = moodColor(b.mood)
          const created = new Date(b.createdAt)
          const elapsed = formatRelative(Date.now() - created.getTime())
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onSelectBubble(b)}
                className="group flex w-full items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-[var(--echo-accent)]/50"
                style={color ? { boxShadow: `inset 4px 0 0 0 ${color}` } : undefined}
              >
                <span aria-hidden className="text-xl leading-none">{moodEmoji(b.mood)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 text-xs text-[var(--echo-muted)]">
                    <span className="text-[var(--echo-accent)]">{b.nickname}</span>
                    <span>·</span>
                    <span>{elapsed}前</span>
                    {b.likes > 0 && (
                      <>
                        <span>·</span>
                        <span aria-label={`${b.likes} 个喜欢`}>♥ {b.likes}</span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 break-words text-sm text-[var(--echo-text)] group-hover:text-white">
                    {b.text}
                  </p>
                  {b.image && (
                    <img
                      src={b.image}
                      alt=""
                      className="mt-2 h-16 w-full rounded-md border border-white/10 object-cover"
                    />
                  )}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

function formatRelative(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h`
}
