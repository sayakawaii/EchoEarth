import { useCallback, useEffect, useState } from 'react'

const KEY = 'echoearth.nickname'

export function useNickname() {
  const [nickname, setNicknameState] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY)
      if (v && v.trim()) setNicknameState(v.trim())
    } catch {
      // ignore (private mode, etc.)
    }
    setReady(true)
  }, [])

  const setNickname = useCallback((raw: string) => {
    const n = raw.trim().slice(0, 16)
    if (!n) return
    try {
      localStorage.setItem(KEY, n)
    } catch {
      // ignore
    }
    setNicknameState(n)
  }, [])

  return { nickname, setNickname, ready }
}
