// Browser-side image compression: load → canvas → JPEG → iterate quality until
// the encoded size fits the target. Returns a data URL.

export interface CompressOptions {
  maxEdge?: number       // longest edge in pixels, default 800
  initialQuality?: number // 0..1, default 0.82
  minQuality?: number    // floor before giving up, default 0.4
  targetBytes?: number   // desired upper bound (data URL string length), default 150 KiB
  mime?: 'image/jpeg' | 'image/webp'
}

export interface CompressResult {
  dataUrl: string
  bytes: number
  width: number
  height: number
  mime: string
  qualityUsed: number
}

const DEFAULTS: Required<Omit<CompressOptions, 'mime'>> & { mime: 'image/jpeg' | 'image/webp' } = {
  maxEdge: 800,
  initialQuality: 0.82,
  minQuality: 0.4,
  targetBytes: 150 * 1024,
  mime: 'image/jpeg',
}

export async function compressImage(file: File, opts: CompressOptions = {}): Promise<CompressResult> {
  const o = { ...DEFAULTS, ...opts }

  if (!file.type.startsWith('image/')) {
    throw new Error('not an image')
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('file too large (> 10MB)')
  }

  const bitmap = await loadBitmap(file)
  const { width, height } = scaleToFit(bitmap.width, bitmap.height, o.maxEdge)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('canvas 2d unsupported')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)

  let q = o.initialQuality
  let dataUrl = canvas.toDataURL(o.mime, q)
  while (dataUrl.length > o.targetBytes && q > o.minQuality) {
    q = Math.max(o.minQuality, q - 0.12)
    dataUrl = canvas.toDataURL(o.mime, q)
  }
  // If still too big at min quality, shrink the canvas further once.
  if (dataUrl.length > o.targetBytes) {
    const shrink = Math.max(0.6, (o.targetBytes / dataUrl.length) ** 0.5)
    const w2 = Math.max(64, Math.floor(width * shrink))
    const h2 = Math.max(64, Math.floor(height * shrink))
    canvas.width = w2
    canvas.height = h2
    const ctx2 = canvas.getContext('2d', { alpha: false })!
    ctx2.fillStyle = '#000'
    ctx2.fillRect(0, 0, w2, h2)
    ctx2.drawImage(bitmap, 0, 0, w2, h2)
    dataUrl = canvas.toDataURL(o.mime, o.minQuality)
    return {
      dataUrl,
      bytes: dataUrl.length,
      width: w2,
      height: h2,
      mime: o.mime,
      qualityUsed: o.minQuality,
    }
  }

  return {
    dataUrl,
    bytes: dataUrl.length,
    width,
    height,
    mime: o.mime,
    qualityUsed: q,
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // Prefer createImageBitmap (faster, off-thread) where available.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // fall through
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

function scaleToFit(w: number, h: number, maxEdge: number) {
  if (w <= maxEdge && h <= maxEdge) return { width: w, height: h }
  if (w >= h) {
    const r = maxEdge / w
    return { width: maxEdge, height: Math.round(h * r) }
  }
  const r = maxEdge / h
  return { width: Math.round(w * r), height: maxEdge }
}
