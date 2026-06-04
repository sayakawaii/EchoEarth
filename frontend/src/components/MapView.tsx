import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import type { Bubble } from '../lib/types'
import { BubbleMarker } from './BubbleMarker'

export interface BubbleCluster {
  key: string
  lat: number
  lng: number
  bubbles: Bubble[] // sorted oldest → newest
}

interface Props {
  center: LatLngExpression
  zoom?: number
  bubbles: Bubble[]
  focus?: { lat: number; lng: number; zoom?: number } | null
  selectedId?: string | null
  onMapClick?: (lat: number, lng: number) => void
  onBubbleClick?: (b: Bubble) => void
  onClusterClick?: (cluster: BubbleCluster) => void
}

export function MapView({
  center,
  zoom = 2,
  bubbles,
  focus,
  selectedId,
  onMapClick,
  onBubbleClick,
  onClusterClick,
}: Props) {
  const clusters = useMemo(() => groupByCoord(bubbles), [bubbles])

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={1}
      maxZoom={18}
      worldCopyJump
      scrollWheelZoom
      className="h-full w-full"
      attributionControl={true}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />

      <Focuser focus={focus} />
      <ClickHandler onMapClick={onMapClick} />

      {clusters.map((c) => {
        const head = c.bubbles[c.bubbles.length - 1]! // most recent on top
        const isCluster = c.bubbles.length > 1
        const isSelected = c.bubbles.some((b) => b.id === selectedId)
        return (
          <BubbleMarker
            key={c.key}
            bubble={head}
            highlighted={isSelected}
            clusterSize={c.bubbles.length}
            onClick={
              isCluster
                ? () => onClusterClick?.(c)
                : (b) => onBubbleClick?.(b)
            }
          />
        )
      })}
    </MapContainer>
  )
}

function groupByCoord(bubbles: Bubble[]): BubbleCluster[] {
  const map = new Map<string, BubbleCluster>()
  for (const b of bubbles) {
    const key = `${b.lat.toFixed(2)}_${b.lng.toFixed(2)}`
    const existing = map.get(key)
    if (existing) {
      existing.bubbles.push(b)
    } else {
      map.set(key, { key, lat: b.lat, lng: b.lng, bubbles: [b] })
    }
  }
  // Keep each cluster's bubbles sorted oldest → newest.
  for (const c of map.values()) {
    c.bubbles.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }
  return Array.from(map.values())
}

function Focuser({ focus }: { focus?: { lat: number; lng: number; zoom?: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (!focus) return
    map.flyTo([focus.lat, focus.lng], focus.zoom ?? Math.max(map.getZoom(), 4), {
      duration: 0.8,
    })
  }, [focus, map])
  return null
}

function ClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}
