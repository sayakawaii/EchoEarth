// Wire types mirroring backend/internal/hub/messages.go.

export type FrameType =
  | 'publish'
  | 'like'
  | 'ping'
  | 'hello'
  | 'bubble'
  | 'like_update'
  | 'expire'
  | 'pong'
  | 'error'

export interface Envelope<T = unknown> {
  type: FrameType
  payload?: T
}

export type Mood = 'calm' | 'happy' | 'sad' | 'angry'

export const MOODS: Mood[] = ['calm', 'happy', 'sad', 'angry']

export interface PublishPayload {
  text: string
  lat: number
  lng: number
  mood?: Mood
  image?: string
}

export interface LikePayload {
  bubbleId: string
}

export interface Bubble {
  id: string
  text: string
  lat: number
  lng: number
  nickname: string
  createdAt: string // ISO timestamp
  expiresAt: string
  mood?: Mood
  image?: string
  likes: number
}

export interface IPLocation {
  lat: number
  lng: number
  city: string
  country: string
  source: 'ip-api' | 'fallback' | 'local' | string
}

export interface HelloPayload {
  clientId: string
  ipLocation: IPLocation
  activeBubbles: Bubble[]
  bubbleTtlSecs: number
  serverTime: number
  rateLimitSecs: number
  maxTextChars: number
  maxImageBytes: number
}

export interface ExpirePayload {
  id: string
}

export interface LikeUpdatePayload {
  bubbleId: string
  count: number
}

export interface ErrorPayload {
  code: string
  message: string
}

export interface BootstrapResponse {
  ipLocation: IPLocation
  activeBubbles: Bubble[]
  online: number
}

// UI-only types -------------------------------------------------------------

export type ToastKind = 'info' | 'success' | 'warn' | 'error'

export interface ToastItem {
  id: string
  kind: ToastKind
  message: string
  durationMs: number
}

export type Skin = 'cyber' | 'calm'
