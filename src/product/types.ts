// Modèle neutre : les templates ne voient jamais Shopify, une autre source pourra s'ajouter.
export type Money = { amount: number; currency: string }

export type ProductImage = { url: string; alt: string | null; width: number | null; height: number | null }

export type ProductColor = { name: string; image: ProductImage | null }

export type NormalizedProduct = {
  id: string
  handle: string
  title: string
  description: string
  price: Money
  compareAtPrice: Money | null
  colors: ProductColor[]
  featuredImage: ProductImage | null
  images: ProductImage[]
  url: string
  availableForSale: boolean
}
