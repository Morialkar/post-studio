import type { Money, NormalizedProduct } from '../../product/types.ts'

/** Prix au format du template : 12.99$ */
export const formatPrice = (m: Money): string => `${m.amount.toFixed(2)}$`

/** « 3 couleurs : rose, bleu, mauve » ; vide s'il y a moins de deux couleurs. */
export function colorsSentence(p: NormalizedProduct, max = 4): string {
  const names = p.colors.map((c) => c.name.toLowerCase())
  if (names.length < 2) return ''
  const shown = names.length > max ? [...names.slice(0, max - 1), 'et plus'] : names
  return `${names.length} couleurs :\n${shown.join(', ')}`
}

/** Hôte d'une URL, sans www : lecoffreauxjouetsettresors.com */
export const host = (url: string): string => {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Vignettes : une image par couleur, sinon les images 2 à 4 de la galerie. */
export function thumbnails(p: NormalizedProduct, count: number): string[] {
  const byColor = p.colors.flatMap((c) => (c.image ? [c.image.url] : []))
  const unique = [...new Set(byColor)]
  const source = unique.length >= 2 ? unique : p.images.slice(1).map((i) => i.url)
  return source.slice(0, count)
}
