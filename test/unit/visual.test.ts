import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderPng } from '../../src/render/render.ts'
import { fieldsOf } from '../../src/templates/fields.ts'
import { templates } from '../../src/templates/index.ts'
import type { AnyTemplate } from '../../src/templates/types.ts'
import { DEMO_SHOP_URL, type DemoHandle, demoImage, demoProduct } from '../demo.ts'
import { initNodeRenderer, nodeLoader } from '../render-node.ts'

// Tests visuels : chaque template est rendu avec des produits de la boutique de démo (fixtures),
// et le PNG est comparé à son image de référence. UPDATE_VISUALS=1 régénère les références.
const REFERENCES = join(import.meta.dirname, '../visual')
const OUTPUT = join(import.meta.dirname, '../output')
const UPDATE = process.env.UPDATE_VISUALS === '1'
/** Part de pixels différents tolérée (anticrénelage selon la plateforme) */
const TOLERANCE = 0.005

const DEMO_HANDLES: DemoHandle[] = ['the-snowboards', 'the-full-stack', 'the-oxygen', 'the-ultimatum']
const IMAGES: Record<string, string> = {}
for (const handle of DEMO_HANDLES) {
  const p = demoProduct(handle)
  // Les images enregistrées remplacent les URL du CDN (même ordre que record-fixtures).
  const urls = [...new Set([p.featuredImage?.url, ...p.colors.map((c) => c.image?.url)].filter(Boolean))] as string[]
  urls.slice(0, 4).forEach((url, i) => {
    const file = join(import.meta.dirname, '../fixtures/demo/images', `${handle}-${i}.jpeg`)
    if (existsSync(file)) IMAGES[url] = demoImage(`${handle}-${i}.jpeg`)
  })
}

/** Valeurs du template pour des produits de démo : points forts fixes, images en data URI. */
async function demoValues(t: AnyTemplate, handles: DemoHandle[]) {
  const products = handles.map(demoProduct)
  const ai = { highlights: async (_p: unknown, n: number) => ['Ultra légère', 'Parfaite en poudreuse', 'Fabriquée au Québec'].slice(0, n) }
  const imported = await t.fromProducts(products, { shop: { name: 'Démo', url: DEMO_SHOP_URL }, ai })
  const values = t.fields.parse(imported) as Record<string, unknown>
  for (const { name, meta } of fieldsOf(t.fields)) {
    const v = values[name]
    if (meta.kind === 'image' && typeof v === 'string' && v !== '') values[name] = IMAGES[v] ?? ''
  }
  return values
}

function compare(name: string, png: Uint8Array) {
  mkdirSync(OUTPUT, { recursive: true })
  writeFileSync(join(OUTPUT, `${name}.png`), png)
  const reference = join(REFERENCES, `${name}.png`)
  if (UPDATE || !existsSync(reference)) {
    writeFileSync(reference, png)
    return 0
  }
  const a = PNG.sync.read(Buffer.from(png))
  const b = PNG.sync.read(readFileSync(reference))
  expect([a.width, a.height]).toEqual([b.width, b.height])
  const diff = new PNG({ width: a.width, height: a.height })
  const pixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 })
  if (pixels > 0) writeFileSync(join(OUTPUT, `${name}.diff.png`), PNG.sync.write(diff))
  return pixels / (a.width * a.height)
}

beforeAll(() => initNodeRenderer())

describe.each(templates.map((t) => [t.id, t] as const))('rendu visuel de %s', (id, t) => {
  const sets: [string, DemoHandle[]][] =
    t.products.max === 1
      ? [
          ['deux-couleurs', ['the-snowboards']],
          ['sans-couleur', ['the-oxygen']],
          ['33-couleurs', ['the-ultimatum']],
        ]
      : [['selection', DEMO_HANDLES.slice(0, Math.max(t.products.min, Math.min(t.products.max, DEMO_HANDLES.length)))]]

  it.each(sets)('%s : identique à la référence', async (label, handles) => {
    const png = await renderPng(t, (await demoValues(t, handles)) as never, nodeLoader)
    expect(compare(`${id}--${label}`, png)).toBeLessThan(TOLERANCE)
  })
})
