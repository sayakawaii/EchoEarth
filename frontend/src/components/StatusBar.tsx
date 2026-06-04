import type { WSStatus } from '../hooks/useWebSocket'
import type { Skin } from '../lib/types'
import { SkinToggle } from './SkinToggle'

interface Props {
  status: WSStatus
  bubbleCount: number
  skin: Skin
  onToggleSkin: () => void
}

export function StatusBar({ status, bubbleCount, skin, onToggleSkin }: Props) {
  const { dot, label } = statusMeta(status)
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[1500] flex items-start justify-between gap-2 p-3">
      <div
        className="flex items-center gap-2 rounded-full border border-white/10 bg-[var(--echo-panel)]/85 px-3 py-1.5 text-xs text-[var(--echo-text)] shadow-lg backdrop-blur"
        role="status"
        aria-live="polite"
      >
        <span className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2 w-2 rounded-full ${dot}`}
            style={{ boxShadow: '0 0 8px currentColor' }}
            aria-hidden
          />
          <span className="hidden xs:inline">{label}</span>
          <span className="xs:hidden">{shortLabel(status)}</span>
        </span>
        <span aria-hidden className="text-[var(--echo-muted)]">·</span>
        <span>
          <span className="hidden xs:inline">活跃气泡 </span>
          <span className="font-semibold text-[var(--echo-accent)]">{bubbleCount}</span>
        </span>
      </div>

      <SkinToggle skin={skin} onToggle={onToggleSkin} />
    </div>
  )
}

function statusMeta(s: WSStatus) {
  switch (s) {
    case 'open':
      return { dot: 'bg-emerald-400 text-emerald-400', label: '已连接' }
    case 'connecting':
      return { dot: 'bg-amber-400 text-amber-400', label: '连接中…' }
    case 'closed':
      return { dot: 'bg-red-400 text-red-400', label: '已断开,自动重连' }
    default:
      return { dot: 'bg-slate-400 text-slate-400', label: '等待' }
  }
}

function shortLabel(s: WSStatus): string {
  switch (s) {
    case 'open':
      return '在线'
    case 'connecting':
      return '连接…'
    case 'closed':
      return '重连…'
    default:
      return '等待'
  }
}
