import { useRef, useState } from 'react'
import { compressImage } from '../lib/imageCompress'

interface Props {
  value: string | null
  onChange: (dataUrl: string | null, meta?: { bytes: number; width: number; height: number }) => void
  onError: (msg: string) => void
  /** target byte cap for the data URL string */
  targetBytes?: number
}

export function ImagePicker({ value, onChange, onError, targetBytes = 150 * 1024 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [meta, setMeta] = useState<{ bytes: number; w: number; h: number } | null>(null)

  const handlePick = async (file: File | null) => {
    if (!file) return
    setBusy(true)
    try {
      const r = await compressImage(file, { targetBytes })
      if (r.bytes > targetBytes * 1.05) {
        onError(`图片压缩后仍超过 ${Math.round(targetBytes / 1024)}KB,请换一张。`)
        return
      }
      setMeta({ bytes: r.bytes, w: r.width, h: r.height })
      onChange(r.dataUrl, { bytes: r.bytes, width: r.width, height: r.height })
    } catch (e) {
      onError(`图片处理失败:${(e as Error).message}`)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const clear = () => {
    setMeta(null)
    onChange(null)
  }

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <img
            src={value}
            alt="待发送图片"
            className="h-10 w-10 rounded-lg border border-white/15 object-cover"
          />
          <button
            type="button"
            onClick={clear}
            aria-label="移除图片"
            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow"
          >
            ×
          </button>
        </div>
        {meta && (
          <span className="text-[10px] text-[var(--echo-muted)]">
            {meta.w}×{meta.h} · {fmtKB(meta.bytes)}
          </span>
        )}
      </div>
    )
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="选择图片"
        className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-lg text-[var(--echo-text)] transition hover:border-[var(--echo-accent)]/50 disabled:opacity-60"
      >
        {busy ? '…' : '🖼'}
      </button>
    </>
  )
}

function fmtKB(b: number): string {
  return `${(b / 1024).toFixed(1)}KB`
}
