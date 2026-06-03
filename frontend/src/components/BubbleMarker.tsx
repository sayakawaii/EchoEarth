import { useEffect, useMemo } from 'react'
import { Marker } from 'react-leaflet'
import L from 'leaflet'
import type { Bubble } from '../lib/types'

/**
 * Renders one bubble as a Leaflet divIcon.
 * The icon HTML contains a glowing dot at the location + a card floating above.
 */
export function BubbleMarker({ bubble }: { bubble: Bubble }) {
  const icon = useMemo(() => makeIcon(bubble), [bubble])

  // Re-render forced by React; nothing else needed.
  useEffect(() => {
    return () => {
      // no-op
    }
  }, [bubble.id])

  return (
    <Marker
      position={[bubble.lat, bubble.lng]}
      icon={icon}
      interactive={false}
      keyboard={false}
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

function makeIcon(b: Bubble): L.DivIcon {
  const nick = escapeHtml(b.nickname || '匿名')
  const text = escapeHtml(b.text)
  const html = `
    <div class="echo-bubble__dot"></div>
    <div class="echo-bubble__card">
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
