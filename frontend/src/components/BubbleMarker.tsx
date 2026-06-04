import { useMemo } from 'react'
import { Marker } from 'react-leaflet'
import L from 'leaflet'
import type { Bubble } from '../lib/types'
import { moodColor } from './MoodPicker'

interface Props {
  bubble: Bubble
  highlighted?: boolean
  /** Optional cluster size: when > 1 show a "+N" badge. */
  clusterSize?: number
  onClick?: (bubble: Bubble) => void
}

export function BubbleMarker({ bubble, highlighted = false, clusterSize, onClick }: Props) {
  const icon = useMemo(
    () => makeIcon(bubble, highlighted, clusterSize ?? 1),
    [bubble, highlighted, clusterSize],
  )

  return (
    <Marker
      position={[bubble.lat, bubble.lng]}
      icon={icon}
      interactive={!!onClick}
      keyboard={false}
      bubblingMouseEvents={false}
      eventHandlers={onClick ? { click: () => onClick(bubble) } : undefined}
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

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function makeIcon(b: Bubble, highlighted: boolean, clusterSize: number): L.DivIcon {
  const nick = escapeHtml(b.nickname || '匿名')
  const previewSource = b.text.length > 80 ? b.text.slice(0, 80) + '…' : b.text
  const text = escapeHtml(previewSource)
  const cardCls = highlighted ? 'echo-bubble__card echo-bubble__card--active' : 'echo-bubble__card'
  const color = moodColor(b.mood)
  const colorStyle = color ? `style="--echo-bubble-dot-color: ${color}; --echo-bubble-mood-border: ${color};"` : ''

  const thumb = b.image
    ? `<img class="echo-bubble__thumb" src="${escapeAttr(b.image)}" alt="" />`
    : ''
  const likes = b.likes > 0
    ? `<span class="echo-bubble__likes" aria-label="${b.likes} 个喜欢">♥ ${b.likes}</span>`
    : ''
  const cluster = clusterSize > 1
    ? `<span class="echo-bubble__cluster" aria-label="该坐标共 ${clusterSize} 条">+${clusterSize - 1}</span>`
    : ''

  const html = `
    <div class="echo-bubble__dot" ${colorStyle}></div>
    <div class="${cardCls}" ${colorStyle} role="button" aria-label="查看气泡详情">
      <span class="echo-bubble__nick">${nick}</span>
      <span class="echo-bubble__text">${text}</span>
      ${thumb}
      ${likes}
      ${cluster}
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
