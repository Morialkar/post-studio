import { describe, expect, it } from 'vitest'
import { fieldsOf } from './fields.ts'
import { templates } from './index.ts'

// Ce que tout template du registre doit respecter.
describe.each(templates.map((t) => [t.id, t] as const))('template %s', (_id, t) => {
  it('identifiant unique, taille, polices, nombre de produits cohérent', () => {
    expect(templates.filter((o) => o.id === t.id)).toHaveLength(1)
    expect(t.size.width).toBeGreaterThan(0)
    expect(t.fonts.length).toBeGreaterThan(0)
    expect(t.products.min).toBeGreaterThanOrEqual(1)
    expect(t.products.max).toBeGreaterThanOrEqual(t.products.min)
  })

  it('chaque champ est typé (texte, couleur, image) et a une valeur par défaut', () => {
    const fields = fieldsOf(t.fields)
    expect(fields.length).toBe(Object.keys(t.fields.shape).length)
    expect(() => t.fields.parse({})).not.toThrow()
  })
})
