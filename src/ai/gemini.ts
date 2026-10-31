import { z } from 'zod'
import type { Connection } from '../connection/schema.ts'
import type { NormalizedProduct } from '../product/types.ts'
import type { AiHelpers } from '../templates/types.ts'

type AiConfig = NonNullable<Connection['ai']>

const API = 'https://generativelanguage.googleapis.com/v1beta/models'

const response = z.object({
  candidates: z
    .array(z.object({ content: z.object({ parts: z.array(z.object({ text: z.string().optional() })) }) }))
    .min(1),
})

type Part = { text: string } | { inlineData: { mimeType: string; data: string } }

/** Appel generateContent ; la réponse est demandée en JSON et validée. Seules des données publiques sont envoyées. */
export async function generate<T>(config: AiConfig, parts: Part[], schema: z.ZodType<T>, fetcher: typeof fetch = fetch): Promise<T> {
  const res = await fetcher(`${API}/${encodeURIComponent(config.model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
    }),
  })
  if (res.status === 429) throw new Error('quota Gemini gratuit épuisé pour aujourd’hui')
  if (!res.ok) throw new Error(`Gemini a répondu ${res.status}`)
  const text = response.parse(await res.json()).candidates[0]?.content.parts.map((p) => p.text ?? '').join('') ?? ''
  return schema.parse(JSON.parse(text))
}

/** Test de connexion : petit appel. */
export async function testGemini(config: AiConfig, fetcher: typeof fetch = fetch): Promise<void> {
  await generate(config, [{ text: 'Réponds {"ok": true}' }], z.object({ ok: z.boolean() }), fetcher)
}

export function geminiHelpers(config: AiConfig, fetcher: typeof fetch = fetch): AiHelpers {
  return {
    async highlights(product, count) {
      const prompt = [
        `Tu écris pour une publication Instagram d'une boutique de jouets québécoise.`,
        `À partir de cette fiche produit, propose ${count} points forts très courts (3 à 7 mots chacun), en français, ton enjoué, sans emoji, sans répéter le nom du produit.`,
        `Réponds en JSON : {"highlights": ["...", "..."]}`,
        `Produit : ${product.title}`,
        `Description : ${product.description.slice(0, 2000)}`,
      ].join('\n')
      const out = await generate(config, [{ text: prompt }], z.object({ highlights: z.array(z.string()) }), fetcher)
      return out.highlights.map((h) => h.trim()).filter(Boolean).slice(0, count)
    },
  }
}

/**
 * Couleurs sans image liée (images non rattachées aux variantes) : Gemini en mode vision
 * associe chaque couleur à l'image qui la montre. `images` : data URI des images de la galerie.
 */
export async function assignColorImages(
  config: AiConfig,
  product: NormalizedProduct,
  images: string[],
  fetcher: typeof fetch = fetch,
): Promise<NormalizedProduct> {
  const missing = product.colors.filter((c) => c.image === null)
  if (missing.length === 0 || images.length === 0) return product
  const parts: Part[] = [
    {
      text:
        `Voici ${images.length} images numérotées de 0 à ${images.length - 1} du produit « ${product.title} ». ` +
        `Pour chaque couleur ${JSON.stringify(product.colors.map((c) => c.name))}, donne le numéro de l'image qui la montre le mieux, ou null. ` +
        `Réponds en JSON : {"colors": {"<couleur>": <numéro ou null>}}`,
    },
    ...images.map((uri) => {
      const [head, data = ''] = uri.split(',')
      return { inlineData: { mimeType: head?.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg', data } }
    }),
  ]
  const out = await generate(config, parts, z.object({ colors: z.record(z.string(), z.number().int().nullable()) }), fetcher)
  return {
    ...product,
    colors: product.colors.map((c) => {
      if (c.image !== null) return c
      const index = out.colors[c.name]
      const image = index === null || index === undefined ? undefined : product.images[index]
      return { ...c, image: image ?? null }
    }),
  }
}
