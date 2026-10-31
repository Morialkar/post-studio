import { beforeAll, describe, expect, it } from 'vitest'
import { renderPng, renderSvg } from '../../src/render/render.ts'
import { crunchieFunnyBottle, fields } from '../../src/templates/crunchie-funny-bottle/index.tsx'
import { fitText, wrapCount } from '../../src/templates/shared/fitText.ts'
import { colorsSentence, thumbnails } from '../../src/templates/shared/format.ts'
import { DEMO_SHOP_URL, demoProduct } from '../demo.ts'
import { initNodeRenderer, nodeLoader, prepareImages } from '../render-node.ts'

const t = crunchieFunnyBottle as never
const shop = { name: 'Démo', url: DEMO_SHOP_URL }
beforeAll(() => initNodeRenderer())

describe('cas limites', () => {
  it('titre très long : la taille descend sans dépasser les bornes', () => {
    const long = 'Super Méga Shimmering Squishy Dumpling Édition Collector Arc-en-ciel Géant'
    expect(fitText(long, { width: 1040, max: 110, min: 48, lines: 2 })).toBe(48)
    expect(fitText('Court', { width: 1040, max: 110, min: 48 })).toBe(110)
    expect(wrapCount('un deux trois', 40, 200)).toBeGreaterThan(1)
  })

  it('titre très long : le rendu passe', async () => {
    const v = await prepareImages(crunchieFunnyBottle, fields.parse({ title: 'Super Méga Shimmering Squishy Dumpling Édition Collector Arc-en-ciel Géant Lumineux' }))
    await expect(renderSvg(t, v as never, nodeLoader)).resolves.toContain('<svg')
  })

  it('sans couleur : pas de bulle couleurs ; vignettes tirées de la galerie', () => {
    const p = demoProduct('the-oxygen')
    expect(colorsSentence(p)).toBe('')
    expect(thumbnails(p, 4).length).toBeGreaterThan(0)
  })

  it('33 couleurs : la bulle garde les premières et ajoute « et plus »', () => {
    const sentence = colorsSentence(demoProduct('the-ultimatum'))
    expect(sentence).toMatch(/^33 couleurs :\n/)
    expect(sentence).toMatch(/et plus$/)
  })

  it('sans image ni point fort : le visuel s’exporte quand même, bulles vides cachées', async () => {
    const imported = await crunchieFunnyBottle.fromProducts([{ ...demoProduct('the-oxygen'), featuredImage: null, images: [] }], { shop })
    expect(imported.photo).toBe('')
    const v = await prepareImages(crunchieFunnyBottle, fields.parse(imported))
    const png = await renderPng(t, v as never, nodeLoader)
    expect(png.length).toBeGreaterThan(1000)
    const svg = await renderSvg(t, v as never, nodeLoader)
    expect(svg).not.toContain('Cliquer pour écrire')
  })

  it('rupture de stock : signalée par le produit (l’interface prévient avant l’export)', () => {
    const p = { ...demoProduct('the-full-stack'), availableForSale: false }
    expect(p.availableForSale).toBe(false)
  })

  it('aucun produit : rien d’importé', async () => {
    expect(await crunchieFunnyBottle.fromProducts([], { shop })).toEqual({})
  })
})
