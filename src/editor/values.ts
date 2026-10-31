import type { z } from 'zod'
import { type FieldEntry, fieldsOf } from '../templates/fields.ts'
import type { AnyTemplate } from '../templates/types.ts'

export type Layer = Record<string, string>
export type Origin = 'manual' | 'imported' | 'template'

/**
 * Trois couches de valeurs, par champ : la modification manuelle, sinon la valeur importée
 * (Shopify ou Gemini), sinon la valeur par défaut du template.
 */
export function resolveValues(template: AnyTemplate, imported: Layer, manual: Layer) {
  const defaults = template.fields.parse({}) as Record<string, unknown>
  const values: Record<string, unknown> = { ...defaults }
  const origins: Record<string, Origin> = {}
  for (const { name } of fieldsOf(template.fields)) {
    if (manual[name] !== undefined) {
      values[name] = manual[name]
      origins[name] = 'manual'
    } else if (imported[name] !== undefined && imported[name] !== '') {
      values[name] = imported[name]
      origins[name] = 'imported'
    } else origins[name] = 'template'
  }
  return { values: template.fields.parse(values) as z.infer<AnyTemplate['fields']>, origins }
}

/** Partage des modifications manuelles entre portée produit et portée template. */
export function splitByScope(fields: FieldEntry[], manual: Layer): { product: Layer; template: Layer } {
  const product: Layer = {}
  const template: Layer = {}
  for (const { name, meta } of fields) {
    const v = manual[name]
    if (v === undefined) continue
    if (meta.scope === 'template') template[name] = v
    else product[name] = v
  }
  return { product, template }
}
