import { initWasm, Resvg } from '@resvg/resvg-wasm'
import satori from 'satori'
import type { z } from 'zod'
import { staticEditable } from '../templates/editable-static.tsx'
import { fieldsOf } from '../templates/fields.ts'
import type { AnyTemplate, FontAsset } from '../templates/types.ts'

/** Charge un fichier (police, wasm, image) : fetch dans le navigateur, lecture disque dans les tests. */
export type AssetLoader = (url: string) => Promise<ArrayBuffer>

export const fetchLoader: AssetLoader = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} : ${res.status}`)
  return res.arrayBuffer()
}

let wasmReady: Promise<void> | null = null

export function initRenderer(wasm: () => Promise<ArrayBuffer | Response>): Promise<void> {
  wasmReady ??= wasm().then((w) => initWasm(w))
  return wasmReady
}

const fontCache = new Map<string, Promise<ArrayBuffer>>()

async function loadFonts(fonts: FontAsset[], load: AssetLoader) {
  return Promise.all(
    fonts.map(async (f) => {
      if (!fontCache.has(f.url)) fontCache.set(f.url, load(f.url))
      return { name: f.name, data: await (fontCache.get(f.url) as Promise<ArrayBuffer>), weight: f.weight, style: f.style ?? 'normal' }
    }),
  )
}

/** Template → SVG (Satori), avec les primitives en mode statique. Les images doivent être des data URI. */
export async function renderSvg(template: AnyTemplate, values: z.infer<AnyTemplate['fields']>, load: AssetLoader): Promise<string> {
  for (const { name, meta } of fieldsOf(template.fields)) {
    const v = (values as Record<string, unknown>)[name]
    if (meta.kind === 'image' && typeof v === 'string' && v !== '' && !v.startsWith('data:'))
      throw new Error(`image « ${name} » non préparée (data URI attendue)`)
  }
  const element = template.render(values, staticEditable(values as Record<string, unknown>))
  return satori(element, {
    width: template.size.width,
    height: template.size.height,
    fonts: await loadFonts(template.fonts, load),
  })
}

/** SVG → PNG à la taille du template (resvg). initRenderer doit avoir été appelé. */
export async function svgToPng(svg: string, width: number): Promise<Uint8Array> {
  if (wasmReady === null) throw new Error('initRenderer non appelé')
  await wasmReady
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: false } })
  return resvg.render().asPng()
}

export async function renderPng(template: AnyTemplate, values: z.infer<AnyTemplate['fields']>, load: AssetLoader): Promise<Uint8Array> {
  return svgToPng(await renderSvg(template, values, load), template.size.width)
}
