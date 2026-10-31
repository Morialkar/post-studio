import { describe, expect, it } from 'vitest'
import { demoProduct } from '../../test/demo.ts'

describe('normalizeProduct (fixtures de la boutique de démo)', () => {
  it('prix en CAD, galerie, URL publique, disponibilité', () => {
    const p = demoProduct('the-full-stack')
    expect(p.title).toBe('The Full Stack Snowboard')
    expect(p.price.currency).toBe('CAD')
    expect(p.price.amount).toBeGreaterThan(0)
    expect(p.images.length).toBeGreaterThan(1)
    expect(p.featuredImage?.url).toMatch(/^https:\/\/cdn\.shopify\.com\//)
    expect(p.url).toMatch(/^https:\/\//)
  })

  it('option « Color » : une couleur par valeur, avec l’image de sa variante', () => {
    const p = demoProduct('the-snowboards')
    expect(p.colors.map((c) => c.name)).toEqual(['Turquoise', 'Ember'])
    const urls = p.colors.map((c) => c.image?.url)
    expect(urls.every(Boolean)).toBe(true)
    expect(new Set(urls).size).toBe(2)
  })

  it('aucune option couleur : liste vide', () => {
    expect(demoProduct('the-oxygen').colors).toEqual([])
  })

  it('beaucoup de couleurs : toutes gardées, l’affichage décide quoi montrer', () => {
    expect(demoProduct('the-ultimatum').colors.length).toBeGreaterThan(30)
  })
})
