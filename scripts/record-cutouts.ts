// Détoure les images enregistrées de la boutique de démo avec le modèle du navigateur (BiRefNet lite),
// pour que les tests visuels montrent les photos comme l'outil les exporte : sans fond.
// Écrit <image>.cutout.png à côté de chaque image de test/fixtures/demo/images.
// Usage : npm run fixtures:cutouts (le modèle, environ 200 Mo, va dans un cache qu'on peut effacer après ;
// HF_CACHE pour choisir où).
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { AutoModel, AutoProcessor, env, RawImage } from '@huggingface/transformers'
import sharp from 'sharp'
import { CUTOUT_MODELS } from '../src/cutout/cutout.ts'

const dir = join(import.meta.dirname, '..', 'test/fixtures/demo/images')
if (process.env.HF_CACHE) env.cacheDir = process.env.HF_CACHE

const model = await AutoModel.from_pretrained(CUTOUT_MODELS.webgpu, { dtype: 'fp32' })
const processor = await AutoProcessor.from_pretrained(CUTOUT_MODELS.webgpu)

for (const name of readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/.test(f) && !f.includes('.cutout.'))) {
  const file = join(dir, name)
  const image = await RawImage.read(file)
  const { pixel_values } = await (processor as unknown as (i: unknown) => Promise<{ pixel_values: unknown }>)(image)
  const outputs = await (model as unknown as (x: unknown) => Promise<Record<string, { dims: number[]; data: Float32Array }>>)({ input_image: pixel_values })
  const mask = Object.values(outputs)[0]
  if (mask === undefined) throw new Error(`${name} : détourage sans résultat`)
  // Même conversion que dans le navigateur : logits → probabilités → canal alpha.
  const [h = 0, w = 0] = mask.dims.slice(-2)
  const logits = mask.data.some((v) => v < 0 || v > 1)
  const alpha = Buffer.alloc(w * h)
  for (let i = 0; i < w * h; i++) {
    const v = mask.data[i] ?? 0
    alpha[i] = Math.round(Math.max(0, Math.min(1, logits ? 1 / (1 + Math.exp(-v)) : v)) * 255)
  }
  const resized = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } }).resize(image.width, image.height).extractChannel(0).raw().toBuffer()
  const out = join(dir, name.replace(/\.[^.]+$/, '.cutout.png'))
  await sharp(file).joinChannel(resized, { raw: { width: image.width, height: image.height, channels: 1 } }).png().toFile(out)
  console.log(out)
}
