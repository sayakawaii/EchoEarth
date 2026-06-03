import { useEffect } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import type { Bubble } from '../lib/types'
import { BubbleMarker } from './BubbleMarker'

interface Props {
  center: LatLngExpression
  zoom?: number
  bubbles: Bubble[]
  focus?: { lat: number; lng: number; zoom?: number } | null
  onMapClick?: (lat: number, lng: number) => void
}

export function MapView({ center, zoom = 2, bubbles, focus, onMapClick }: Props) {
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

      {bubbles.map((b) => (
        <BubbleMarker key={b.id} bubble={b} />
      ))}
    </MapContainer>
  )
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
