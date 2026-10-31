import { describe, expect, it } from 'vitest'
import { crunchieFunnyBottle } from '../templates/crunchie-funny-bottle/index.tsx'
import { fieldsOf } from '../templates/fields.ts'
import type { AnyTemplate } from '../templates/types.ts'
import { resolveValues, splitByScope } from './values.ts'

const t = crunchieFunnyBottle as unknown as AnyTemplate

describe('trois couches de valeurs', () => {
  it('manuel, sinon importé, sinon template ; l’origine de chaque champ est connue', () => {
    const { values, origins } = resolveValues(t, { title: 'Importé', price: '9.99$' }, { price: '7.00$' })
    const v = values as Record<string, unknown>
    expect(v.title).toBe('Importé')
    expect(origins.title).toBe('imported')
    expect(v.price).toBe('7.00$')
    expect(origins.price).toBe('manual')
    expect(v.titleColor1).toBe('#ff3bbc')
    expect(origins.titleColor1).toBe('template')
  })

  it('valeur importée vide : celle du template', () => {
    const { origins } = resolveValues(t, { bubble3: '' }, {})
    expect(origins.bubble3).toBe('template')
  })

  it('modifications partagées : adresse et fond suivent le template, le reste suit le produit', () => {
    const split = splitByScope(fieldsOf(t.fields), { footer: 'Adresse', background: 'data:x', title: 'T' })
    expect(split.template).toEqual({ footer: 'Adresse', background: 'data:x' })
    expect(split.product).toEqual({ title: 'T' })
  })
})
