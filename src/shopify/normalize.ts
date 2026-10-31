import type { Money, NormalizedProduct, ProductColor, ProductImage } from '../product/types.ts'
import type { RawProduct } from './queries.ts'

/** Noms d'option reconnus comme couleur, en français et en anglais. */
const COLOR_OPTION = /^(couleurs?|colou?rs?|teintes?)$/i

const money = (m: { amount: string; currencyCode: string }): Money => ({
  amount: Number(m.amount),
  currency: m.currencyCode,
})

const image = (i: { url: string; altText: string | null; width: number | null; height: number | null }): ProductImage => ({
  url: i.url,
  alt: i.altText,
  width: i.width,
  height: i.height,
})

/** Convertit la réponse Shopify en modèle neutre ; les templates ne voient jamais Shopify. */
export function normalizeProduct(raw: RawProduct, storeUrl: string): NormalizedProduct {
  const variants = raw.variants.nodes
  // Variante de référence : la moins chère encore disponible, sinon la moins chère.
  const ordered = [...variants].sort((a, b) => Number(a.price.amount) - Number(b.price.amount))
  const reference = ordered.find((v) => v.availableForSale) ?? ordered[0]
  if (reference === undefined) throw new Error(`« ${raw.title} » n’a aucune variante`)

  const compare = reference.compareAtPrice
  const compareAtPrice =
    compare !== null && Number(compare.amount) > Number(reference.price.amount) ? money(compare) : null

  const colorOption = raw.options.find((o) => COLOR_OPTION.test(o.name.trim()))
  const colors: ProductColor[] =
    colorOption === undefined
      ? []
      : colorOption.optionValues.map(({ name }) => {
          const variant = variants.find((v) =>
            v.selectedOptions.some((o) => o.name === colorOption.name && o.value === name && v.image !== null),
          )
          return { name, image: variant?.image ? image(variant.image) : null }
        })

  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    description: raw.description,
    price: money(reference.price),
    compareAtPrice,
    colors,
    featuredImage: raw.featuredImage ? image(raw.featuredImage) : null,
    images: raw.images.nodes.map(image),
    url: raw.onlineStoreUrl ?? `${storeUrl.replace(/\/$/, '')}/products/${raw.handle}`,
    availableForSale: raw.availableForSale,
  }
}
