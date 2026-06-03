import type { BootstrapResponse } from './types'

export async function fetchBootstrap(): Promise<BootstrapResponse | null> {
  try {
    const res = await fetch('/api/bootstrap')
    if (!res.ok) return null
    return (await res.json()) as BootstrapResponse
  } catch {
    return null
  }
}
