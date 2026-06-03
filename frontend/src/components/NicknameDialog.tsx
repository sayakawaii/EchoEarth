import { useState } from 'react'

interface Props {
  initial?: string
  onSubmit: (nickname: string) => void
}

export function NicknameDialog({ initial = '', onSubmit }: Props) {
  const [value, setValue] = useState(initial)
  const trimmed = value.trim()
  const ok = trimmed.length >= 1 && trimmed.length <= 16

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!ok) return
          onSubmit(trimmed)
        }}
        className="w-[min(360px,90vw)] rounded-2xl border border-echo-accent/40 bg-echo-panel/95 p-6 shadow-2xl shadow-echo-accent/10"
      >
        <h1 className="text-xl font-semibold text-echo-text">
          欢迎来到 <span className="text-echo-accent">EchoEarth</span>
        </h1>
        <p className="mt-1 text-sm text-echo-muted">
          世界地图气泡留言。先取一个昵称(1–16 字符)。
        </p>

        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={16}
          placeholder="例如:旅行者-007"
          className="mt-4 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-echo-text outline-none focus:border-echo-accent"
        />

        <div className="mt-1 text-right text-xs text-echo-muted">
          {trimmed.length}/16
        </div>

        <button
          type="submit"
          disabled={!ok}
          className="mt-3 w-full rounded-lg bg-echo-accent px-4 py-2 font-semibold text-echo-bg transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          进入地图
        </button>

        <p className="mt-3 text-xs text-echo-muted">
          昵称仅存于本机浏览器,不需要注册。允许重名,后台用匿名 ID 区分。
        </p>
      </form>
    </div>
  )
}
