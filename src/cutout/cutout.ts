import { hasTransparentCorners } from '../render/images.ts'

// Détourage dans le navigateur : BiRefNet lite (licence MIT) via transformers.js.
// Le modèle se télécharge au premier usage puis reste dans le cache du navigateur.
// À éviter : RMBG-2.0 de Bria, sous licence non commerciale.
// Deux exports du même BiRefNet lite : 1024 px sur WebGPU, 512 px en WASM (en 1024, le WASM manque de mémoire).
export const CUTOUT_MODELS = { webgpu: 'onnx-community/BiRefNet_lite-ONNX', wasm: 'studioludens/birefnet-lite-512' } as const

export type Progress = (loaded: number, total: number) => void

// WebGPU quand le GPU le permet (certains n'ont que 10 tampons par shader, un de moins que ce que
// BiRefNet demande) ; sinon WASM.
type Device = 'webgpu' | 'wasm'

type Tensor = { dims: number[]; data: Float32Array | Uint8Array }
type Engine = { device: Device; run(uri: string): Promise<{ mask: Tensor; width: number; height: number }> }
let engine: { device: Device; ready: Promise<Engine> } | null = null

async function load(device: Device, onProgress?: Progress): Promise<Engine> {
  const { AutoModel, AutoProcessor, RawImage, env } = await import('@huggingface/transformers')
  env.allowLocalModels = false
  const files = new Map<string, { loaded: number; total: number }>()
  const progress_callback = (p: { status: string; file?: string; loaded?: number; total?: number }) => {
    if (p.status !== 'progress' || p.file === undefined) return
    files.set(p.file, { loaded: p.loaded ?? 0, total: p.total ?? 0 })
    const all = [...files.values()]
    onProgress?.(all.reduce((s, f) => s + f.loaded, 0), all.reduce((s, f) => s + f.total, 0))
  }
  const model = await AutoModel.from_pretrained(CUTOUT_MODELS[device], { device, dtype: 'fp32', progress_callback })
  const processor = await AutoProcessor.from_pretrained(CUTOUT_MODELS[device])
  return {
    device,
    async run(uri) {
      const image = await RawImage.fromURL(uri)
      const { pixel_values } = await (processor as unknown as (i: unknown) => Promise<{ pixel_values: unknown }>)(image)
      const outputs = (await (model as unknown as (x: unknown) => Promise<Record<string, Tensor>>)({ input_image: pixel_values }))
      const mask = Object.values(outputs)[0]
      if (mask === undefined) throw new Error('détourage sans résultat')
      return { mask, width: image.width, height: image.height }
    },
  }
}

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image illisible'))
    img.src = uri
  })
}

/** L'image a-t-elle déjà de la transparence dans les coins ? */
export async function isAlreadyCut(uri: string): Promise<boolean> {
  const img = await loadImage(uri)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (ctx === null) return false
  ctx.drawImage(img, 0, 0)
  return hasTransparentCorners(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)
}

/** Masque (logits ou probabilités, N×N) → canal alpha de l'image d'origine, en PNG. */
async function applyMask(uri: string, mask: Tensor): Promise<string> {
  const [h = 0, w = 0] = mask.dims.slice(-2)
  const values = mask.data
  const logits = Array.prototype.some.call(values, (v: number) => v < 0 || v > 1)
  const small = document.createElement('canvas')
  small.width = w
  small.height = h
  const sctx = small.getContext('2d')
  if (sctx === null) throw new Error('canvas indisponible')
  const alpha = sctx.createImageData(w, h)
  for (let i = 0; i < w * h; i++) {
    const v = Number(values[i] ?? 0)
    const p = logits ? 1 / (1 + Math.exp(-v)) : v
    alpha.data[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, p)) * 255)
  }
  sctx.putImageData(alpha, 0, 0)

  const img = await loadImage(uri)
  const out = document.createElement('canvas')
  out.width = img.naturalWidth
  out.height = img.naturalHeight
  const ctx = out.getContext('2d')
  if (ctx === null) throw new Error('canvas indisponible')
  // Masque agrandi à la taille de l'image, puis l'image n'est gardée que là où le masque est opaque.
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(small, 0, 0, out.width, out.height)
  ctx.globalCompositeOperation = 'source-in'
  ctx.drawImage(img, 0, 0)
  return out.toDataURL('image/png')
}

/** BiRefNet demande 11 tampons de stockage par shader : on vérifie l'adaptateur avant de choisir WebGPU. */
async function pickDevice(): Promise<Device> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ limits: { maxStorageBuffersPerShaderStage: number } } | null> } }).gpu
    const adapter = await gpu?.requestAdapter()
    return adapter && adapter.limits.maxStorageBuffersPerShaderStage >= 11 ? 'webgpu' : 'wasm'
  } catch {
    return 'wasm'
  }
}

// Un détourage à la fois : le modèle tient déjà une bonne part de la mémoire.
let queue: Promise<unknown> = Promise.resolve()

/** Retire le fond (data URI → data URI PNG transparent). */
export function removeBackground(uri: string, onProgress?: Progress): Promise<string> {
  const next = queue.then(() => removeNow(uri, onProgress))
  queue = next.catch(() => undefined)
  return next
}

async function removeNow(uri: string, onProgress?: Progress): Promise<string> {
  engine ??= (() => {
    const device = pickDevice()
    return { device: 'webgpu' as Device, ready: device.then((d) => load(d, onProgress)) }
  })()
  const used = engine
  let result: Awaited<ReturnType<Engine['run']>>
  try {
    result = await (await used.ready).run(uri)
  } catch (error) {
    if ((await used.ready.catch(() => null))?.device === 'wasm') throw error
    if (engine === used) engine = { device: 'wasm', ready: load('wasm', onProgress) }
    result = await (await engine.ready).run(uri)
  }
  return applyMask(uri, result.mask)
}

/** Détoure seulement si l'image n'a pas déjà de transparence. */
export async function cutoutIfNeeded(uri: string, onProgress?: Progress): Promise<string> {
  return (await isAlreadyCut(uri)) ? uri : removeBackground(uri, onProgress)
}
