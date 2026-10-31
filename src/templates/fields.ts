import { z } from 'zod'

/**
 * Champs d'un template. Le type choisit l'outil d'édition sur le visuel :
 * texte tapé en place, sélecteur de couleur, ou image (autre photo du produit, fichier, détourage).
 * scope « template » : la valeur suit le template d'un produit à l'autre (adresse, fond de boutique).
 */
export type FieldKind = 'text' | 'color' | 'image'
export type FieldMeta = {
  kind: FieldKind
  label: string
  scope: 'product' | 'template'
  /** Image : détourer la photo si elle n'a pas déjà de transparence */
  cutout?: boolean
  /** Texte : plusieurs lignes permises */
  multiline?: boolean
}

const registry = new WeakMap<z.ZodType, FieldMeta>()

function field<T extends z.ZodType>(schema: T, meta: FieldMeta): T {
  registry.set(schema, meta)
  return schema
}

type Options = { scope?: 'product' | 'template' }

export const text = (label: string, fallback = '', options: Options & { multiline?: boolean } = {}) =>
  field(z.string().default(fallback), { kind: 'text', label, scope: options.scope ?? 'product', multiline: options.multiline })

export const color = (label: string, fallback: string, options: Options = {}) =>
  field(z.string().regex(/^#[0-9a-f]{6}$/i).default(fallback), { kind: 'color', label, scope: options.scope ?? 'product' })

/** Image : URL https, asset du template, data URI, ou vide (rien n'est dessiné). */
export const image = (label: string, options: Options & { cutout?: boolean; fallback?: string } = {}) =>
  field(z.string().default(options.fallback ?? ''), { kind: 'image', label, scope: options.scope ?? 'product', cutout: options.cutout })

export function fieldMeta(schema: z.ZodType): FieldMeta | undefined {
  return registry.get(schema)
}

export type FieldEntry = { name: string; meta: FieldMeta }

/** Champs déclarés d'un schéma de template, dans l'ordre. */
export function fieldsOf(schema: z.ZodObject): FieldEntry[] {
  return Object.entries(schema.shape).flatMap(([name, s]) => {
    const meta = fieldMeta(s as z.ZodType)
    return meta === undefined ? [] : [{ name, meta }]
  })
}
