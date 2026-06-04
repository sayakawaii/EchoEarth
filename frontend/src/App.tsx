import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

import { MapView } from './components/MapView'
import type { BubbleCluster } from './components/MapView'
import { NicknameDialog } from './components/NicknameDialog'
import { ComposerDock } from './components/ComposerDock'
import { StatusBar } from './components/StatusBar'
import { BubbleDetail } from './components/BubbleDetail'
import { ClusterList } from './components/ClusterList'

import { useNickname } from './hooks/useNickname'
import { useGeolocation } from './hooks/useGeolocation'
import { useWebSocket } from './hooks/useWebSocket'
import { useTheme } from './hooks/useTheme'
import { useToast } from './components/Toast'

import { fetchBootstrap } from './lib/api'
import type {
  Bubble,
  BootstrapResponse,
  Envelope,
  ErrorPayload,
  ExpirePayload,
  HelloPayload,
  LikeUpdatePayload,
  Mood,
  ToastKind,
} from './lib/types'

// Fix Leaflet's default marker icon URLs under Vite bundling.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const MAX_BUBBLES_CLIENT = 200
const MOOD_KEY = 'echoearth.mood'
const LIKES_KEY = 'echoearth.likedBubbles'

function readPersistedMood(): Mood {
  try {
    const v = localStorage.getItem(MOOD_KEY)
    if (v === 'calm' || v === 'happy' || v === 'sad' || v === 'angry') return v
  } catch { /* ignore */ }
  return 'calm'
}

function readPersistedLikes(): Set<string> {
  try {
    const v = localStorage.getItem(LIKES_KEY)
    if (!v) return new Set()
    const arr = JSON.parse(v)
    if (Array.isArray(arr)) return new Set(arr.filter((x) => typeof x === 'string'))
  } catch { /* ignore */ }
  return new Set()
}

function writePersistedLikes(s: Set<string>) {
  try {
    localStorage.setItem(LIKES_KEY, JSON.stringify(Array.from(s)))
  } catch { /* ignore */ }
}

export default function App() {
  const { nickname, setNickname, ready: nickReady } = useNickname()
  const [showNickEditor, setShowNickEditor] = useState(false)
  const { skin, toggle: toggleSkin } = useTheme()
  const toast = useToast()

  const [boot, setBoot] = useState<BootstrapResponse | null>(null)
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedCluster, setSelectedCluster] = useState<BubbleCluster | null>(null)
  const [mood, setMoodState] = useState<Mood>(readPersistedMood)
  const [likedIds, setLikedIds] = useState<Set<string>>(readPersistedLikes)
  const [serverConfig, setServerConfig] = useState<{
    bubbleTtlSecs: number
    maxTextChars: number
    rateLimitSecs: number
    maxImageBytes: number
  }>({ bubbleTtlSecs: 300, maxTextChars: 140, rateLimitSecs: 10, maxImageBytes: 200 * 1024 })

  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom?: number } | null>(null)

  const setMood = useCallback((m: Mood) => {
    setMoodState(m)
    try { localStorage.setItem(MOOD_KEY, m) } catch { /* ignore */ }
  }, [])

  // 1. Fetch /api/bootstrap once at start.
  useEffect(() => {
    fetchBootstrap().then((b) => {
      if (!b) return
      setBoot(b)
      setBubbles((prev) => mergeBubbles(prev, b.activeBubbles))
    })
  }, [])

  // 2. Decide user position.
  const ipFallback = boot ? { lat: boot.ipLocation.lat, lng: boot.ipLocation.lng } : null
  const { position, setManual } = useGeolocation({ ipFallback })

  // Fly to first-known position.
  const flewToInitialRef = useRef(false)
  useEffect(() => {
    if (flewToInitialRef.current) return
    if (!position) return
    flewToInitialRef.current = true
    setFocus({ lat: position.lat, lng: position.lng, zoom: 5 })
  }, [position])

  // 3. WebSocket.
  const wsUrl = useMemo(() => {
    if (!nickname) return null
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}/ws?nickname=${encodeURIComponent(nickname)}`
  }, [nickname])

  const prevStatusRef = useRef<'idle' | 'connecting' | 'open' | 'closed'>('idle')

  const onFrame = useCallback(
    (env: Envelope) => {
      switch (env.type) {
        case 'hello': {
          const p = env.payload as HelloPayload
          setServerConfig({
            bubbleTtlSecs: p.bubbleTtlSecs,
            maxTextChars: p.maxTextChars,
            rateLimitSecs: p.rateLimitSecs,
            maxImageBytes: p.maxImageBytes ?? 200 * 1024,
          })
          setBubbles((prev) => mergeBubbles(prev, p.activeBubbles))
          break
        }
        case 'bubble': {
          const b = env.payload as Bubble
          setBubbles((prev) => mergeBubbles(prev, [b]))
          break
        }
        case 'like_update': {
          const p = env.payload as LikeUpdatePayload
          setBubbles((prev) =>
            prev.map((b) => (b.id === p.bubbleId ? { ...b, likes: p.count } : b)),
          )
          break
        }
        case 'expire': {
          const p = env.payload as ExpirePayload
          setBubbles((prev) => prev.filter((b) => b.id !== p.id))
          setSelectedId((sel) => (sel === p.id ? null : sel))
          setLikedIds((prev) => {
            if (!prev.has(p.id)) return prev
            const next = new Set(prev)
            next.delete(p.id)
            writePersistedLikes(next)
            return next
          })
          break
        }
        case 'error': {
          const p = env.payload as ErrorPayload
          const [msg, kind] = translateError(p)
          toast.push(msg, kind)
          break
        }
        case 'pong':
          break
        default:
          break
      }
    },
    [toast],
  )

  const { status, send } = useWebSocket({ url: wsUrl, onFrame })

  // Connection status toasts.
  useEffect(() => {
    const prev = prevStatusRef.current
    if (prev === status) return
    if (prev === 'open' && status === 'closed') {
      toast.push('已断开,正在自动重连…', 'warn')
    } else if ((prev === 'connecting' || prev === 'closed') && status === 'open') {
      if (prev === 'closed') toast.push('已重新连接', 'success')
    }
    prevStatusRef.current = status
  }, [status, toast])

  // Client-side TTL sweeper (defense in depth).
  useEffect(() => {
    const t = window.setInterval(() => {
      const now = Date.now()
      setBubbles((prev) => prev.filter((b) => new Date(b.expiresAt).getTime() > now))
    }, 5000)
    return () => window.clearInterval(t)
  }, [])

  // Clear selected bubble / cluster if its contents were removed.
  useEffect(() => {
    if (selectedId && !bubbles.some((b) => b.id === selectedId)) setSelectedId(null)
  }, [bubbles, selectedId])
  useEffect(() => {
    if (!selectedCluster) return
    const present = selectedCluster.bubbles.filter((b) => bubbles.some((bb) => bb.id === b.id))
    if (present.length === 0) {
      setSelectedCluster(null)
    } else if (present.length !== selectedCluster.bubbles.length) {
      setSelectedCluster({ ...selectedCluster, bubbles: present })
    }
  }, [bubbles, selectedCluster])

  const handleSend = useCallback(
    (text: string, m: Mood, image: string | null) => {
      if (!position) {
        toast.push('还没有定位,点击地图选个点再发送吧。', 'warn')
        return
      }
      if (status !== 'open') {
        toast.push('连接尚未就绪,正在重连…', 'warn')
        return
      }
      const ok = send('publish', {
        text,
        lat: position.lat,
        lng: position.lng,
        mood: m,
        image: image ?? undefined,
      })
      if (!ok) {
        toast.push('发送失败,请重试。', 'error')
      }
    },
    [position, send, status, toast],
  )

  const handleToggleLike = useCallback(
    (b: Bubble) => {
      if (status !== 'open') {
        toast.push('连接尚未就绪,稍后再试。', 'warn')
        return
      }
      const ok = send('like', { bubbleId: b.id })
      if (!ok) {
        toast.push('点喜欢失败,请重试。', 'error')
        return
      }
      // Toggle local flag immediately for UI feedback; server broadcasts the new count.
      setLikedIds((prev) => {
        const next = new Set(prev)
        if (next.has(b.id)) next.delete(b.id)
        else next.add(b.id)
        writePersistedLikes(next)
        return next
      })
    },
    [send, status, toast],
  )

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      setManual(lat, lng)
      setFocus({ lat, lng })
    },
    [setManual],
  )

  const initialCenter: [number, number] = useMemo(() => {
    if (position) return [position.lat, position.lng]
    if (boot) return [boot.ipLocation.lat, boot.ipLocation.lng]
    return [30, 0]
  }, [position, boot])

  const selectedBubble = useMemo(
    () => (selectedId ? bubbles.find((b) => b.id === selectedId) ?? null : null),
    [selectedId, bubbles],
  )

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
    <div className="relative h-[100dvh] w-screen overflow-hidden">
      <MapView
        center={initialCenter}
        zoom={2}
        bubbles={bubbles.slice(-MAX_BUBBLES_CLIENT)}
        focus={focus}
        selectedId={selectedId}
        onMapClick={handleMapClick}
        onBubbleClick={(b) => {
          setSelectedCluster(null)
          setSelectedId(b.id)
        }}
        onClusterClick={(c) => {
          setSelectedId(null)
          setSelectedCluster(c)
        }}
      />

      <StatusBar
        status={status}
        bubbleCount={bubbles.length}
        skin={skin}
        onToggleSkin={toggleSkin}
      />

      <ComposerDock
        position={position}
        ipLocation={boot?.ipLocation ?? null}
        maxChars={serverConfig.maxTextChars}
        maxImageBytes={serverConfig.maxImageBytes}
        disabled={status !== 'open'}
        onSend={handleSend}
        onError={(msg) => toast.push(msg, 'warn')}
        nickname={nickname}
        onChangeNickname={() => setShowNickEditor(true)}
        mood={mood}
        onMoodChange={setMood}
      />

      <BubbleDetail
        bubble={selectedBubble}
        liked={!!(selectedBubble && likedIds.has(selectedBubble.id))}
        onClose={() => setSelectedId(null)}
        onFocus={(lat, lng) => setFocus({ lat, lng, zoom: 6 })}
        onToggleLike={handleToggleLike}
      />

      <ClusterList
        cluster={selectedCluster}
        onClose={() => setSelectedCluster(null)}
        onSelectBubble={(b) => {
          setSelectedCluster(null)
          setSelectedId(b.id)
        }}
      />
    </div>
  )
}

function mergeBubbles(prev: Bubble[], incoming: Bubble[]): Bubble[] {
  const map = new Map<string, Bubble>()
  for (const b of prev) map.set(b.id, b)
  for (const b of incoming) {
    // If we already know a newer "likes" count locally (from like_update), keep it.
    const existing = map.get(b.id)
    if (existing && existing.likes > b.likes) {
      map.set(b.id, { ...b, likes: existing.likes })
    } else {
      map.set(b.id, b)
    }
  }
  const out = Array.from(map.values())
  out.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  if (out.length > MAX_BUBBLES_CLIENT) {
    return out.slice(out.length - MAX_BUBBLES_CLIENT)
  }
  return out
}

function translateError(p: ErrorPayload): [string, ToastKind] {
  switch (p.code) {
    case 'rate_limited':
      return ['发得太快啦,稍等几秒再试。', 'warn']
    case 'too_long':
      return ['消息太长了。', 'warn']
    case 'empty_text':
      return ['消息不能为空。', 'warn']
    case 'blocked':
      return ['内容被过滤,请换种说法。', 'warn']
    case 'bad_image':
      return ['图片格式不支持。', 'warn']
    case 'image_too_large':
      return ['图片太大了,请换一张或重试压缩。', 'warn']
    case 'not_found':
      return ['该气泡已过期或不存在。', 'warn']
    case 'bad_payload':
    case 'bad_frame':
      return ['协议错误(可能版本不匹配)。', 'error']
    default:
      return [`服务返回错误:${p.message || p.code}`, 'error']
  }
}
