import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ToastItem, ToastKind } from '../lib/types'

interface ToastApi {
  push: (msg: string, kind?: ToastKind, durationMs?: number) => string
  dismiss: (id: string) => void
}

const ToastCtx = createContext<ToastApi | null>(null)

const DEFAULT_DURATION: Record<ToastKind, number> = {
  info: 3500,
  success: 3500,
  warn: 4500,
  error: 5000,
}

let _seq = 0
const nextId = () => `t${++_seq}-${Date.now()}`

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, number>>(new Map())

  const dismiss = useCallback((id: string) => {
    const t = timersRef.current.get(id)
    if (t) {
      window.clearTimeout(t)
      timersRef.current.delete(id)
    }
    setItems((prev) => prev.filter((it) => it.id !== id))
  }, [])

  const push = useCallback(
    (message: string, kind: ToastKind = 'info', durationMs?: number) => {
      const id = nextId()
      const item: ToastItem = {
        id,
        kind,
        message,
        durationMs: durationMs ?? DEFAULT_DURATION[kind],
      }
      setItems((prev) => {
        // Cap to 4 visible toasts; drop oldest.
        const next = [...prev, item]
        if (next.length > 4) next.shift()
        return next
      })
      if (item.durationMs > 0) {
        const timer = window.setTimeout(() => dismiss(id), item.durationMs)
        timersRef.current.set(id, timer)
      }
      return id
    },
    [dismiss],
  )

  // Clear timers on unmount.
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t))
      timersRef.current.clear()
    }
  }, [])

  const api = useMemo<ToastApi>(() => ({ push, dismiss }), [push, dismiss])

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <ToastContainer items={items} onDismiss={dismiss} />
    </ToastCtx.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx)
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>')
  }
  return ctx
}

function ToastContainer({
  items,
  onDismiss,
}: {
  items: ToastItem[]
  onDismiss: (id: string) => void
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-28 z-[2500] flex flex-col items-center gap-2 px-3 sm:bottom-32"
      role="region"
      aria-label="通知"
    >
      {items.map((it) => (
        <ToastView key={it.id} item={it} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastView({
  item,
  onDismiss,
}: {
  item: ToastItem
  onDismiss: (id: string) => void
}) {
  const tone = toneFor(item.kind)
  return (
    <div
      role={item.kind === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-xl border px-3 py-2 text-sm shadow-2xl backdrop-blur-md animate-[toastIn_180ms_cubic-bezier(0.16,1,0.3,1)_both] ${tone}`}
    >
      <span aria-hidden className="mt-0.5 text-base leading-none">
        {iconFor(item.kind)}
      </span>
      <span className="flex-1 leading-relaxed">{item.message}</span>
      <button
        type="button"
        aria-label="关闭通知"
        onClick={() => onDismiss(item.id)}
        className="ml-1 rounded p-0.5 text-current/70 transition hover:bg-white/10 hover:text-current"
      >
        ×
      </button>
    </div>
  )
}

function toneFor(kind: ToastKind): string {
  switch (kind) {
    case 'success':
      return 'border-emerald-400/40 bg-emerald-950/70 text-emerald-100'
    case 'warn':
      return 'border-amber-400/40 bg-amber-950/70 text-amber-100'
    case 'error':
      return 'border-red-400/50 bg-red-950/70 text-red-100'
    default:
      return 'border-white/15 bg-slate-900/80 text-slate-100'
  }
}

function iconFor(kind: ToastKind): string {
  switch (kind) {
    case 'success':
      return '✓'
    case 'warn':
      return '!'
    case 'error':
      return '⚠'
    default:
      return 'ⓘ'
  }
}
