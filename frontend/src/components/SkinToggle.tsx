import type { Skin } from '../lib/types'

interface Props {
  skin: Skin
  onToggle: () => void
}

export function SkinToggle({ skin, onToggle }: Props) {
  const next: Skin = skin === 'cyber' ? 'calm' : 'cyber'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`切换皮肤为 ${labelOf(next)}`}
      title={`当前:${labelOf(skin)} · 点击切到 ${labelOf(next)}`}
      className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/15 bg-[var(--echo-panel)]/85 px-3 py-1.5 text-xs text-[var(--echo-text)] shadow-lg backdrop-blur transition hover:border-[var(--echo-accent)]/60 hover:text-[var(--echo-accent)]"
    >
      <span aria-hidden>{skin === 'cyber' ? '⚡' : '🌙'}</span>
      <span>{labelOf(skin)}</span>
    </button>
  )
}

function labelOf(s: Skin): string {
  return s === 'cyber' ? '赛博' : '静谧'
}
