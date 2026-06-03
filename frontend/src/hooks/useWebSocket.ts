import { useCallback, useEffect, useRef, useState } from 'react'
import type { Envelope, FrameType } from '../lib/types'

export type WSStatus = 'idle' | 'connecting' | 'open' | 'closed'

export interface UseWSOptions {
  url: string | null
  onFrame: (env: Envelope) => void
}

/**
 * Resilient WebSocket hook with exponential backoff reconnect (1s → 30s) and
 * a 25s app-level ping. The connection re-opens automatically whenever `url`
 * changes (e.g. nickname becomes available).
 */
export function useWebSocket({ url, onFrame }: UseWSOptions) {
  const [status, setStatus] = useState<WSStatus>('idle')
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef(0)
  const reconnectTimerRef = useRef<number | null>(null)
  const pingTimerRef = useRef<number | null>(null)
  const onFrameRef = useRef(onFrame)
  const closedByUserRef = useRef(false)

  useEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (pingTimerRef.current) {
      window.clearInterval(pingTimerRef.current)
      pingTimerRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.onopen = null
      wsRef.current.onmessage = null
      wsRef.current.onclose = null
      wsRef.current.onerror = null
      try {
        wsRef.current.close()
      } catch {
        // ignore
      }
      wsRef.current = null
    }
  }, [])

  const connect = useCallback(
    (target: string) => {
      cleanup()
      closedByUserRef.current = false
      setStatus('connecting')
      let ws: WebSocket
      try {
        ws = new WebSocket(target)
      } catch {
        scheduleReconnect(target)
        return
      }
      wsRef.current = ws

      ws.onopen = () => {
        retryRef.current = 0
        setStatus('open')
        pingTimerRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', payload: {} }))
          }
        }, 25_000)
      }

      ws.onmessage = (ev) => {
        try {
          const env = JSON.parse(ev.data) as Envelope
          if (env && typeof env.type === 'string') {
            onFrameRef.current(env)
          }
        } catch {
          // ignore malformed
        }
      }

      const failHandler = () => {
        setStatus('closed')
        if (pingTimerRef.current) {
          window.clearInterval(pingTimerRef.current)
          pingTimerRef.current = null
        }
        if (!closedByUserRef.current) {
          scheduleReconnect(target)
        }
      }
      ws.onclose = failHandler
      ws.onerror = failHandler
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cleanup],
  )

  const scheduleReconnect = useCallback(
    (target: string) => {
      retryRef.current += 1
      const delay = Math.min(30_000, 1000 * Math.pow(2, retryRef.current - 1))
      reconnectTimerRef.current = window.setTimeout(() => {
        connect(target)
      }, delay)
    },
    [connect],
  )

  useEffect(() => {
    if (!url) {
      cleanup()
      setStatus('idle')
      return
    }
    connect(url)
    return () => {
      closedByUserRef.current = true
      cleanup()
    }
  }, [url, connect, cleanup])

  const send = useCallback((type: FrameType, payload: unknown) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    ws.send(JSON.stringify({ type, payload }))
    return true
  }, [])

  return { status, send }
}
