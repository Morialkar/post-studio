import { z } from 'zod'
import type { Connection } from '../connection/schema'

// Version épinglée : Shopify retire les versions environ un an après leur sortie.
// La veille mensuelle (phase 3) ouvrira une issue avant l'échéance.
export const STOREFRONT_API_VERSION = '2026-10'

type Store = Connection['store']

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
  if (!response.ok) throw new Error(`Shopify a répondu ${response.status}`)
  const body = z
    .object({ data: z.unknown().optional(), errors: z.array(z.object({ message: z.string() })).optional() })
    .parse(await response.json())
  if (body.errors !== undefined && body.errors.length > 0)
    throw new Error(`Shopify : ${body.errors.map((e) => e.message).join('; ')}`)
  return schema.parse(body.data)
}

const shopSchema = z.object({ shop: z.object({ name: z.string() }) })

/** Test de connexion : le nom de la boutique. */
export async function fetchShopName(store: Store): Promise<string> {
  const data = await storefront(store, `query Shop { shop { name } }`, shopSchema)
  return data.shop.name
}
