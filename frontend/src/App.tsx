import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

import { MapView } from './components/MapView'
import { NicknameDialog } from './components/NicknameDialog'
import { ComposerDock } from './components/ComposerDock'
import { StatusBar } from './components/StatusBar'

import { useNickname } from './hooks/useNickname'
import { useGeolocation } from './hooks/useGeolocation'
import { useWebSocket } from './hooks/useWebSocket'

import { fetchBootstrap } from './lib/api'
import type {
  Bubble,
  BootstrapResponse,
  Envelope,
  ErrorPayload,
  ExpirePayload,
  HelloPayload,
} from './lib/types'

// Fix Leaflet's default marker icon URLs under Vite bundling.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const MAX_BUBBLES_CLIENT = 200

export default function App() {
  const { nickname, setNickname, ready: nickReady } = useNickname()
  const [showNickEditor, setShowNickEditor] = useState(false)

  const [boot, setBoot] = useState<BootstrapResponse | null>(null)
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [hint, setHint] = useState<string | null>(null)
  const [serverConfig, setServerConfig] = useState<{
    bubbleTtlSecs: number
    maxTextChars: number
    rateLimitSecs: number
  }>({ bubbleTtlSecs: 300, maxTextChars: 140, rateLimitSecs: 10 })

  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom?: number } | null>(null)

  // 1. Fetch /api/bootstrap once at start to seed IP location + active bubbles.
  useEffect(() => {
    fetchBootstrap().then((b) => {
      if (!b) return
      setBoot(b)
      setBubbles((prev) => mergeBubbles(prev, b.activeBubbles))
    })
  }, [])

  // 2. Decide user position: browser geo → IP fallback → manual click.
  const ipFallback = boot
    ? { lat: boot.ipLocation.lat, lng: boot.ipLocation.lng }
    : null

  const { position, setManual } = useGeolocation({ ipFallback })

  // Fly the map to first-known position.
  const flewToInitialRef = useRef(false)
  useEffect(() => {
    if (flewToInitialRef.current) return
    if (!position) return
    flewToInitialRef.current = true
    setFocus({ lat: position.lat, lng: position.lng, zoom: 5 })
  }, [position])

  // 3. WebSocket connection (only once nickname is known).
  const wsUrl = useMemo(() => {
    if (!nickname) return null
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const u = `${proto}//${window.location.host}/ws?nickname=${encodeURIComponent(nickname)}`
    return u
  }, [nickname])

  const onFrame = useCallback((env: Envelope) => {
    switch (env.type) {
      case 'hello': {
        const p = env.payload as HelloPayload
        setServerConfig({
          bubbleTtlSecs: p.bubbleTtlSecs,
          maxTextChars: p.maxTextChars,
          rateLimitSecs: p.rateLimitSecs,
        })
        setBubbles((prev) => mergeBubbles(prev, p.activeBubbles))
        break
      }
      case 'bubble': {
        const b = env.payload as Bubble
        setBubbles((prev) => mergeBubbles(prev, [b]))
        break
      }
      case 'expire': {
        const p = env.payload as ExpirePayload
        setBubbles((prev) => prev.filter((b) => b.id !== p.id))
        break
      }
      case 'error': {
        const p = env.payload as ErrorPayload
        setHint(translateError(p))
        window.setTimeout(() => setHint(null), 4000)
        break
      }
      case 'pong':
        break
      default:
        break
    }
  }, [])

  const { status, send } = useWebSocket({ url: wsUrl, onFrame })

  // 4. Client-side TTL sweeper (defense in depth against missed expire frames).
  useEffect(() => {
    const t = window.setInterval(() => {
      const now = Date.now()
      setBubbles((prev) => prev.filter((b) => new Date(b.expiresAt).getTime() > now))
    }, 5000)
    return () => window.clearInterval(t)
  }, [])

  // 5. Send a bubble.
  const handleSend = useCallback(
    (text: string) => {
      if (!position) {
        setHint('还没有定位,点击地图选个点再发送吧。')
        return
      }
      const ok = send('publish', { text, lat: position.lat, lng: position.lng })
      if (!ok) {
        setHint('连接尚未就绪,正在重连…')
      }
    },
    [position, send],
  )

  // 6. Handle map click → set manual position; if user hasn't sent yet, also re-focus.
  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      setManual(lat, lng)
      setFocus({ lat, lng })
    },
    [setManual],
  )

  // Initial map center: position > IP > default.
  const initialCenter: [number, number] = useMemo(() => {
    if (position) return [position.lat, position.lng]
    if (boot) return [boot.ipLocation.lat, boot.ipLocation.lng]
    return [30, 0]
  }, [position, boot])

  // Nickname gating.
  if (!nickReady) return null
  if (!nickname || showNickEditor) {
    return (
      <NicknameDialog
        initial={nickname ?? ''}
        onSubmit={(n) => {
          setNickname(n)
          setShowNickEditor(false)
        }}
      />
    )
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <MapView
        center={initialCenter}
        zoom={2}
        bubbles={bubbles.slice(-MAX_BUBBLES_CLIENT)}
        focus={focus}
        onMapClick={handleMapClick}
      />
      <StatusBar status={status} bubbleCount={bubbles.length} />
      <ComposerDock
        position={position}
        maxChars={serverConfig.maxTextChars}
        disabled={status !== 'open'}
        hint={hint ?? undefined}
        onSend={handleSend}
        nickname={nickname}
        onChangeNickname={() => setShowNickEditor(true)}
      />
    </div>
  )
}

function mergeBubbles(prev: Bubble[], incoming: Bubble[]): Bubble[] {
  const map = new Map<string, Bubble>()
  for (const b of prev) map.set(b.id, b)
  for (const b of incoming) map.set(b.id, b)
  const out = Array.from(map.values())
  out.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  // Hard cap to keep DOM light.
  if (out.length > MAX_BUBBLES_CLIENT) {
    return out.slice(out.length - MAX_BUBBLES_CLIENT)
  }
  return out
}

function translateError(p: ErrorPayload): string {
  switch (p.code) {
    case 'rate_limited':
      return '发得太快啦,稍等几秒再试。'
    case 'too_long':
      return '消息太长了。'
    case 'empty_text':
      return '消息不能为空。'
    case 'blocked':
      return '内容被过滤,请换种说法。'
    case 'bad_payload':
    case 'bad_frame':
      return '协议错误(可能版本不匹配)。'
    default:
      return `服务返回错误:${p.message || p.code}`
  }
}
