import { describe, expect, it } from 'vitest'
import demo from '../../connexion.demo.json?raw'
import { DEFAULT_GEMINI_MODEL, parseConnection } from './schema.ts'

const valid = {
  format: 'post-studio',
  version: 1,
  store: { domain: 'lecoffreauxjouetsettresors.myshopify.com', language: 'FR', country: 'CA' },
  ai: { provider: 'gemini', apiKey: 'AIza-test', model: 'gemini-flash-latest' },
}

describe('parseConnection', () => {
  it('accepte le fichier du document', () => {
    expect(parseConnection(JSON.stringify(valid))).toEqual({ ok: true, connection: valid })
  })

  it('valeurs par défaut : FR, CA, modèle Gemini ; ai facultatif', () => {
    const result = parseConnection(
      JSON.stringify({ format: 'post-studio', version: 1, store: { domain: 'X.myshopify.com' } }),
    )
    expect(result).toEqual({
      ok: true,
      connection: { format: 'post-studio', version: 1, store: { domain: 'x.myshopify.com', language: 'FR', country: 'CA' } },
    })
    const withAi = parseConnection(
      JSON.stringify({ ...valid, ai: { provider: 'gemini', apiKey: 'k' } }),
    )
    expect(withAi.ok && withAi.connection.ai?.model).toBe(DEFAULT_GEMINI_MODEL)
  })

  it('un message par champ fautif', () => {
    const result = parseConnection(
      JSON.stringify({ format: 'autre', version: 2, store: { domain: 'boutique.com' } }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toHaveLength(3)
    expect(result.errors.join('\n')).toMatch(/format.*post-studio/)
    expect(result.errors.join('\n')).toMatch(/store\.domain.*myshopify/)
  })

  it('JSON invalide : refusé avec un message clair', () => {
    expect(parseConnection('{pas du json')).toEqual({ ok: false, errors: ['le fichier n’est pas du JSON valide'] })
  })
})

describe('fichiers du dépôt', () => {
  it('connexion.demo.json : valide, sans IA', () => {
    const result = parseConnection(demo)
    expect(result.ok && result.connection.ai).toBeUndefined()
    expect(result.ok && result.connection.store.domain).toBe('hydrogen-preview.myshopify.com')
  })
})
