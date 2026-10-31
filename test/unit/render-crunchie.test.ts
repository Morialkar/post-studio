import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderPng, renderSvg } from '../../src/render/render.ts'
import { crunchieFunnyBottle, fields } from '../../src/templates/crunchie-funny-bottle/index.tsx'
import { DEMO_SHOP_URL, demoImage, demoProduct } from '../demo.ts'
import { initNodeRenderer, nodeLoader, prepareImages } from '../render-node.ts'

const t = crunchieFunnyBottle as never

beforeAll(() => initNodeRenderer())

async function valuesFor(handle: 'the-snowboards' | 'the-oxygen', images: string[]) {
  const imported = await crunchieFunnyBottle.fromProducts([demoProduct(handle)], { shop: { name: 'Démo', url: DEMO_SHOP_URL } })
  const v = fields.parse({ ...imported, bubble1: 'Planche légère et nerveuse', bubble2: 'Parfaite pour la poudreuse' })
  // Images préparées comme dans le navigateur : data URI.
  const prepared = await prepareImages(crunchieFunnyBottle, v)
  return { ...prepared, photo: demoImage(images[0] as string), thumb1: images[1] ? demoImage(images[1]) : '', thumb2: images[2] ? demoImage(images[2]) : '', thumb3: '', thumb4: '' }
}

describe('Crunchie Funny Bottle', () => {
  it('fromProducts : titre, prix, couleurs, vignettes, adresse de la boutique', async () => {
    const v = await crunchieFunnyBottle.fromProducts([demoProduct('the-snowboards')], { shop: { name: 'Démo', url: DEMO_SHOP_URL } })
    expect(v.title).toBe(demoProduct('the-snowboards').title)
    expect(v.price).toMatch(/^\d+\.\d{2}\$$/)
    expect(v.bubble3).toBe('2 couleurs :\nturquoise, ember')
    expect(v.thumb1).toMatch(/^https:/)
    expect(v.url).toBe('checkout.hydrogen.shop')
  })

  it('sans option couleur : la 3e bulle attend un 3e point fort', async () => {
    const ai = { highlights: async (_p: unknown, n: number) => ['un', 'deux', 'trois'].slice(0, n) }
    const v = await crunchieFunnyBottle.fromProducts([demoProduct('the-oxygen')], { shop: { name: 'Démo', url: DEMO_SHOP_URL }, ai })
    expect([v.bubble1, v.bubble2, v.bubble3]).toEqual(['un', 'deux', 'trois'])
  })

  it('rendu Satori → resvg : PNG 1080×1080', async () => {
    const v = await valuesFor('the-snowboards', ['the-snowboards-0.jpeg', 'the-snowboards-1.jpeg', 'the-snowboards-2.jpeg'])
    const svg = await renderSvg(t, v as never, nodeLoader)
    expect(svg).toContain('<svg')
    const png = await renderPng(t, v as never, nodeLoader)
    expect([...png.slice(1, 4)].map((c) => String.fromCharCode(c)).join('')).toBe('PNG')
    const width = (png[16] << 24) | (png[17] << 16) | (png[18] << 8) | (png[19] as number)
    expect(width).toBe(1080)
    mkdirSync(join(import.meta.dirname, '../../test/output'), { recursive: true })
    writeFileSync(join(import.meta.dirname, '../../test/output/crunchie-the-snowboards.png'), png)
  })

  it('image non préparée : refusée avant Satori', async () => {
    const v = { ...(await prepareImages(crunchieFunnyBottle, fields.parse({}))), photo: 'https://cdn.shopify.com/x.jpg' }
    await expect(renderSvg(t, v as never, nodeLoader)).rejects.toThrow(/data URI/)
  })
})
