import { useCallback, useEffect, useState } from 'react'
import type { Skin } from '../lib/types'

const KEY = 'echoearth.skin'
const DEFAULT: Skin = 'cyber'

function readInitial(): Skin {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'cyber' || v === 'calm') return v
  } catch {
    // ignore
  }
  return DEFAULT
}

/**
 * Persisted skin selector. Writes `data-skin="<skin>"` on <html> so CSS
 * variables in :root[data-skin=...] kick in.
 */
export function useTheme() {
  const [skin, setSkinState] = useState<Skin>(readInitial)

  useEffect(() => {
    document.documentElement.setAttribute('data-skin', skin)
  }, [skin])

  const setSkin = useCallback((s: Skin) => {
    try {
      localStorage.setItem(KEY, s)
    } catch {
      // ignore
    }
    setSkinState(s)
  }, [])

  const toggle = useCallback(() => {
    setSkin(skin === 'cyber' ? 'calm' : 'cyber')
  }, [skin, setSkin])

  return { skin, setSkin, toggle }
}
