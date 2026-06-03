import type { WSStatus } from '../hooks/useWebSocket'

interface Props {
  status: WSStatus
  bubbleCount: number
}

export function StatusBar({ status, bubbleCount }: Props) {
  const { color, label } = statusMeta(status)
  return (
    <div className="pointer-events-none fixed left-3 top-3 z-[1500] flex items-center gap-3 rounded-full border border-white/10 bg-echo-panel/80 px-3 py-1.5 text-xs text-echo-text shadow-lg backdrop-blur">
      <span className="flex items-center gap-1.5">
        <span
          className={`inline-block h-2 w-2 rounded-full ${color}`}
          style={{ boxShadow: '0 0 8px currentColor' }}
        />
        {label}
      </span>
      <span className="text-echo-muted">·</span>
      <span>
        活跃气泡 <span className="font-semibold text-echo-accent">{bubbleCount}</span>
      </span>
    </div>
  )
}

function statusMeta(s: WSStatus) {
  switch (s) {
    case 'open':
      return { color: 'bg-emerald-400 text-emerald-400', label: '已连接' }
    case 'connecting':
      return { color: 'bg-amber-400 text-amber-400', label: '连接中…' }
    case 'closed':
      return { color: 'bg-red-400 text-red-400', label: '已断开,自动重连' }
    default:
      return { color: 'bg-slate-400 text-slate-400', label: '等待' }
  }
}
