import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Connection, parseConnection } from '../src/connection/schema.ts'
import type { NormalizedProduct } from '../src/product/types.ts'
import { normalizeProduct } from '../src/shopify/normalize.ts'
import { productResponse } from '../src/shopify/queries.ts'

const root = join(import.meta.dirname, '..')

/** connexion.demo.json : la boutique de démo Hydrogen de Shopify, sans IA. */
export function demoConnection(): Connection {
  const result = parseConnection(readFileSync(join(root, 'connexion.demo.json'), 'utf8'))
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result.connection
}

export const DEMO_SHOP_URL = 'https://checkout.hydrogen.shop'

export type DemoHandle = 'the-full-stack' | 'the-oxygen' | 'the-snowboards' | 'the-ultimatum'

/** Produit normalisé à partir de la réponse enregistrée (npm run fixtures:record). */
export function demoProduct(handle: DemoHandle): NormalizedProduct {
  const raw = productResponse.parse(
    JSON.parse(readFileSync(join(root, 'test/fixtures/demo', `product-${handle}.json`), 'utf8')),
  ).product
  if (raw === null) throw new Error(handle)
  return normalizeProduct(raw, DEMO_SHOP_URL)
}

/** Image enregistrée en data URI, comme le navigateur la prépare avant le rendu. */
export function demoImage(name: string): string {
  const bytes = readFileSync(join(root, 'test/fixtures/demo/images', name))
  return `data:image/${name.endsWith('.png') ? 'png' : 'jpeg'};base64,${bytes.toString('base64')}`
}
