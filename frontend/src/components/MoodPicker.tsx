import type { Mood } from '../lib/types'
import { MOODS } from '../lib/types'

interface Props {
  value: Mood
  onChange: (m: Mood) => void
}

const META: Record<Mood, { label: string; emoji: string; ring: string }> = {
  calm:  { label: '平静', emoji: '🌿', ring: 'ring-[var(--echo-accent)]' },
  happy: { label: '开心', emoji: '😄', ring: 'ring-amber-300' },
  sad:   { label: '难过', emoji: '😢', ring: 'ring-sky-300' },
  angry: { label: '愤怒', emoji: '😠', ring: 'ring-rose-400' },
}

export function MoodPicker({ value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label="情绪" className="flex items-center gap-1">
      {MOODS.map((m) => {
        const meta = META[m]
        const active = m === value
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={meta.label}
            title={meta.label}
            onClick={() => onChange(m)}
            className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/30 text-base transition hover:border-white/30 ${
              active ? `ring-2 ${meta.ring} ring-offset-2 ring-offset-[var(--echo-panel)]` : ''
            }`}
          >
            <span aria-hidden>{meta.emoji}</span>
          </button>
        )
      })}
    </div>
  )
}

export function moodColor(m: Mood | undefined): string {
  switch (m) {
    case 'happy':
      return '#fbbf24' // amber-400
    case 'sad':
      return '#7dd3fc' // sky-300
    case 'angry':
      return '#fb7185' // rose-400
    case 'calm':
    default:
      return '' // empty = caller uses CSS var var(--echo-bubble-dot)
  }
}

export function moodLabel(m: Mood | undefined): string {
  if (!m) return META.calm.label
  return META[m]?.label ?? META.calm.label
}

export function moodEmoji(m: Mood | undefined): string {
  if (!m) return META.calm.emoji
  return META[m]?.emoji ?? META.calm.emoji
}
