import { z } from 'zod'
import type { Connection } from '../connection/schema.ts'
import type { NormalizedProduct } from '../product/types.ts'
import { normalizeProduct } from './normalize.ts'
import {
  PRODUCT_QUERY,
  productResponse,
  SEARCH_QUERY,
  type SearchHit,
  SHOP_QUERY,
  searchResponse,
  shopResponse,
} from './queries.ts'

// Version épinglée : Shopify retire les versions environ un an après leur sortie.
// La veille mensuelle (.github/workflows/veille.yml) ouvre une issue avant l'échéance.
export const STOREFRONT_API_VERSION = '2026-10'

export type Store = Connection['store']
export type Shop = { name: string; url: string }

/** Appel à la Storefront API sans token (accès public de la boutique en ligne). */
export async function storefront<T>(
  store: Store,
  query: string,
  schema: z.ZodType<T>,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(`https://${store.domain}/api/${STOREFRONT_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  if (response.status === 404) throw new Error('boutique introuvable ou accès public fermé')
  if (!response.ok) throw new Error(`Shopify a répondu ${response.status}`)
  const body = z
    .object({ data: z.unknown().optional(), errors: z.array(z.object({ message: z.string() })).optional() })
    .parse(await response.json())
  if (body.errors !== undefined && body.errors.length > 0)
    throw new Error(`Shopify : ${body.errors.map((e) => e.message).join('; ')}`)
  return schema.parse(body.data)
}

const context = (store: Store) => ({ country: store.country, language: store.language })

/** Test de connexion : nom et adresse publique de la boutique. */
export async function fetchShop(store: Store): Promise<Shop> {
  const data = await storefront(store, SHOP_QUERY, shopResponse)
  return { name: data.shop.name, url: data.shop.primaryDomain.url }
}

export async function fetchShopName(store: Store): Promise<string> {
  return (await fetchShop(store)).name
}

export async function searchProducts(store: Store, term: string, first = 12): Promise<SearchHit[]> {
  const data = await storefront(store, SEARCH_QUERY, searchResponse, {
    term: term.trim() === '' ? null : term,
    first,
    ...context(store),
  })
  return data.products.nodes
}

export async function fetchProduct(store: Store, handle: string, shopUrl: string): Promise<NormalizedProduct> {
  const data = await storefront(store, PRODUCT_QUERY, productResponse, { handle, ...context(store) })
  if (data.product === null) throw new Error(`produit « ${handle} » introuvable`)
  return normalizeProduct(data.product, shopUrl)
}
