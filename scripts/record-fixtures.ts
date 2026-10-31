// Enregistre les données de test depuis la boutique de démo (connexion.demo.json) :
// réponses brutes de la Storefront API et petites images, pour des tests unitaires sans réseau.
// Usage : npm run fixtures:record
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseConnection } from '../src/connection/schema.ts'
import { PRODUCT_QUERY, productResponse, SEARCH_QUERY, searchResponse, SHOP_QUERY, shopResponse } from '../src/shopify/queries.ts'
import { storefront } from '../src/shopify/storefront.ts'

const root = join(import.meta.dirname, '..')
const out = join(root, 'test/fixtures/demo')
mkdirSync(join(out, 'images'), { recursive: true })
const parsed = parseConnection(readFileSync(join(root, 'connexion.demo.json'), 'utf8'))
if (!parsed.ok) throw new Error(parsed.errors.join('\n'))
const store = parsed.connection.store
const ctx = { country: store.country, language: store.language }

const save = (name: string, data: unknown) => writeFileSync(join(out, name), `${JSON.stringify(data, null, 2)}\n`)
save('shop.json', await storefront(store, SHOP_QUERY, shopResponse))
save('search-snowboard.json', await storefront(store, SEARCH_QUERY, searchResponse, { term: 'snowboard', first: 6, ...ctx }))

// Une couleur, aucune option couleur, deux couleurs avec leur image, 33 couleurs (cas limite).
for (const handle of ['the-full-stack', 'the-oxygen', 'the-snowboards', 'the-ultimatum']) {
  const data = await storefront(store, PRODUCT_QUERY, productResponse, { handle, ...ctx })
  if (data.product === null) throw new Error(`${handle} introuvable`)
  save(`product-${handle}.json`, data)
  // Images réduites par le CDN Shopify (paramètre width) pour garder le dépôt léger.
  const urls = [...new Set([data.product.featuredImage?.url, ...data.product.variants.nodes.map((v) => v.image?.url)].filter(Boolean))] as string[]
  for (const [i, url] of urls.slice(0, 4).entries()) {
    const small = `${url}${url.includes('?') ? '&' : '?'}width=400`
    const res = await fetch(small)
    if (!res.ok) throw new Error(`${small} : ${res.status}`)
    writeFileSync(join(out, 'images', `${handle}-${i}.${(res.headers.get('content-type') ?? 'image/jpeg').split('/')[1]}`), Buffer.from(await res.arrayBuffer()))
  }
}
console.log(`fixtures enregistrées dans ${out}`)
