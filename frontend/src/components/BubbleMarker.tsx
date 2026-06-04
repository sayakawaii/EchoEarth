import { useMemo } from 'react'
import { Marker } from 'react-leaflet'
import L from 'leaflet'
import type { Bubble } from '../lib/types'

interface Props {
  bubble: Bubble
  highlighted?: boolean
  onClick?: (bubble: Bubble) => void
}

export function BubbleMarker({ bubble, highlighted = false, onClick }: Props) {
  const icon = useMemo(() => makeIcon(bubble, highlighted), [bubble, highlighted])

  return (
    <Marker
      position={[bubble.lat, bubble.lng]}
      icon={icon}
      interactive={!!onClick}
      keyboard={false}
      bubblingMouseEvents={false}
      eventHandlers={
        onClick
          ? {
              click: () => onClick(bubble),
            }
          : undefined
      }
    />
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function makeIcon(b: Bubble, highlighted: boolean): L.DivIcon {
  const nick = escapeHtml(b.nickname || '匿名')
  // Bubble cards above ~80 chars get truncated visually; click reveals full text.
  const previewSource = b.text.length > 80 ? b.text.slice(0, 80) + '…' : b.text
  const text = escapeHtml(previewSource)
  const cardCls = highlighted ? 'echo-bubble__card echo-bubble__card--active' : 'echo-bubble__card'
  const html = `
    <div class="echo-bubble__dot"></div>
    <div class="${cardCls}" role="button" aria-label="查看气泡详情">
      <span class="echo-bubble__nick">${nick}</span>
      <span class="echo-bubble__text">${text}</span>
      <span class="echo-bubble__tail"></span>
    </div>
  `
  return L.divIcon({
    className: 'echo-bubble',
    html,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}
