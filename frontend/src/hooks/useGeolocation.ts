import { useEffect, useState } from 'react'

export type GeoSource = 'browser' | 'ip' | 'manual' | 'fallback'

export interface UserPosition {
  lat: number
  lng: number
  source: GeoSource
}

interface Options {
  ipFallback?: { lat: number; lng: number } | null
  timeoutMs?: number
}

/**
 * Tries browser Geolocation first. On failure / denial falls back to the
 * server-provided IP estimate. Caller can override with a manual setting.
 */
export function useGeolocation(opts: Options) {
  const { ipFallback, timeoutMs = 6000 } = opts
  const [position, setPosition] = useState<UserPosition | null>(null)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!('geolocation' in navigator)) {
      setTried(true)
      return
    }
    const timer = window.setTimeout(() => {
      if (cancelled) return
      setTried(true)
    }, timeoutMs + 500)

    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (cancelled) return
        window.clearTimeout(timer)
        setPosition({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          source: 'browser',
        })
        setTried(true)
      },
      () => {
        if (cancelled) return
        window.clearTimeout(timer)
        setTried(true)
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 5 * 60 * 1000 },
    )
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [timeoutMs])

  // After we've tried once, fall back to IP if we still don't have a position.
  useEffect(() => {
    if (!tried) return
    if (position) return
    if (ipFallback) {
      setPosition({ lat: ipFallback.lat, lng: ipFallback.lng, source: 'ip' })
    }
  }, [tried, position, ipFallback])

  const setManual = (lat: number, lng: number) => {
    setPosition({ lat, lng, source: 'manual' })
  }

  return { position, setManual, tried }
}
