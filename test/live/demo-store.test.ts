import { describe, expect, it } from 'vitest'
import { fetchProduct, fetchShop, searchProducts, STOREFRONT_API_VERSION } from '../../src/shopify/storefront.ts'
import { demoConnection } from '../demo.ts'

// Suite live : la vraie boutique de démo, telle que connexion.demo.json la décrit.
// Échoue si Shopify retire la version épinglée ou ferme l'accès public.
const { store } = demoConnection()

describe(`boutique de démo, Storefront API ${STOREFRONT_API_VERSION}`, () => {
  it('test de connexion : nom de la boutique', async () => {
    expect((await fetchShop(store)).name).toBe('Hydrogen Demo Store')
  })

  it('recherche puis fiche produit normalisée, prix en CAD', async () => {
    const hits = await searchProducts(store, 'snowboard', 5)
    expect(hits.length).toBeGreaterThan(0)
    const shop = await fetchShop(store)
    const product = await fetchProduct(store, 'the-snowboards', shop.url)
    expect(product.price.currency).toBe('CAD')
    expect(product.colors.length).toBeGreaterThan(1)
  })

  it('images du CDN lisibles depuis un autre domaine (CORS), sans proxy', async () => {
    const shop = await fetchShop(store)
    const product = await fetchProduct(store, 'the-full-stack', shop.url)
    const res = await fetch(`${product.featuredImage?.url}&width=200`, { headers: { Origin: 'https://example.github.io' } })
    expect(res.ok).toBe(true)
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('produit inconnu : erreur claire', async () => {
    await expect(fetchProduct(store, 'produit-qui-nexiste-pas-123', 'https://x')).rejects.toThrow(/introuvable/)
  })
})
