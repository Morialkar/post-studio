import { describe, expect, it, vi } from 'vitest'
import { demoProduct } from '../../test/demo.ts'
import { assignColorImages, geminiHelpers, testGemini } from './gemini.ts'

const config = { provider: 'gemini' as const, apiKey: 'test-key', model: 'gemini-flash-latest' }

/** Faux Gemini : répond le JSON donné, et garde la requête pour vérification. */
function fakeGemini(json: unknown, status = 200) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
    new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(json) }] } }] }), { status }),
  ) as unknown as typeof fetch & ReturnType<typeof vi.fn>
}

describe('Gemini', () => {
  it('points forts : prompt en français à partir de la description publique, clé en en-tête', async () => {
    const fetcher = fakeGemini({ highlights: [' Glisse comme un rêve ', 'Parfaite en poudreuse', 'en trop'] })
    const out = await geminiHelpers(config, fetcher).highlights(demoProduct('the-oxygen'), 2)
    expect(out).toEqual(['Glisse comme un rêve', 'Parfaite en poudreuse'])
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/models/gemini-flash-latest:generateContent')
    expect(url).not.toContain('test-key')
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('test-key')
    expect(String(init.body)).toContain('The Oxygen Snowboard')
  })

  it('quota épuisé : message clair', async () => {
    await expect(testGemini(config, fakeGemini({}, 429))).rejects.toThrow(/quota/)
  })

  it('vision : associe chaque couleur sans image à une image de la galerie', async () => {
    const product = { ...demoProduct('the-snowboards') }
    product.colors = product.colors.map((c) => ({ ...c, image: null }))
    const fetcher = fakeGemini({ colors: { Turquoise: 1, Ember: null } })
    const out = await assignColorImages(config, product, ['data:image/jpeg;base64,AAAA', 'data:image/jpeg;base64,BBBB'], fetcher)
    expect(out.colors[0]?.image?.url).toBe(product.images[1]?.url)
    expect(out.colors[1]?.image).toBeNull()
    const body = JSON.parse(String((fetcher.mock.calls[0] as [string, RequestInit])[1].body))
    expect(body.contents[0].parts[1].inlineData).toEqual({ mimeType: 'image/jpeg', data: 'AAAA' })
  })

  it('réponse invalide : erreur, l’outil reste utilisable à la main', async () => {
    await expect(geminiHelpers(config, fakeGemini({ autre: 1 })).highlights(demoProduct('the-oxygen'), 2)).rejects.toThrow()
  })
})
