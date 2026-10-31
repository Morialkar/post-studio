import { describe, expect, it } from 'vitest'
import { hostOf, resolveStoreDomain } from './resolve.ts'

const meta = (body: unknown, ok = true) =>
  (async () => ({ ok, json: async () => body })) as unknown as typeof fetch

describe('hostOf', () => {
  it.each([
    ['https://www.Boutique.com/collections/x?y=1', 'www.boutique.com'],
    ['boutique.com', 'boutique.com'],
    ['  ma-boutique.myshopify.com/ ', 'ma-boutique.myshopify.com'],
    ['', null],
    ['pas une adresse', null],
  ])('%s → %s', (input, host) => expect(hostOf(input)).toBe(host))
})

describe('resolveStoreDomain', () => {
  it('garde un domaine .myshopify.com sans appel réseau', async () => {
    const never = (async () => {
      throw new Error('appel inattendu')
    }) as unknown as typeof fetch
    expect(await resolveStoreDomain('https://ma-boutique.myshopify.com', never)).toBe('ma-boutique.myshopify.com')
  })

  it('lit le domaine .myshopify.com dans /meta.json', async () => {
    expect(await resolveStoreDomain('checkout.hydrogen.shop', meta({ myshopify_domain: 'hydrogen-preview.myshopify.com' }))).toBe(
      'hydrogen-preview.myshopify.com',
    )
  })

  it('refuse un site qui n’est pas une boutique Shopify', async () => {
    await expect(resolveStoreDomain('exemple.com', meta(null, false))).rejects.toThrow('ne semble pas être une boutique Shopify')
    await expect(resolveStoreDomain('exemple.com', meta({ autre: 1 }))).rejects.toThrow('ne semble pas')
  })

  it('refuse une adresse invalide', async () => {
    await expect(resolveStoreDomain('???')).rejects.toThrow('adresse invalide')
  })
})
