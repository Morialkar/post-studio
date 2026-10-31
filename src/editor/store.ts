import type { Layer } from './values.ts'

// Modifications gardées dans le navigateur : par template et par produit (ou sélection de produits),
// et par template seulement pour les champs de portée « template » (adresse, fond de boutique).
const productKey = (templateId: string, products: string[]) =>
  `post-studio:edits:${templateId}:${[...products].sort().join('+')}`
const templateKey = (templateId: string) => `post-studio:template:${templateId}`

function read(key: string): Layer {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return Object.fromEntries(Object.entries(parsed).filter((e): e is [string, string] => typeof e[1] === 'string'))
  } catch {
    return {}
  }
}

/** false si le navigateur refuse (stockage plein ou bloqué) : la modification reste pour la séance. */
function write(key: string, layer: Layer): boolean {
  try {
    if (Object.keys(layer).length === 0) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(layer))
    return true
  } catch {
    return false
  }
}

export const loadEdits = (templateId: string, products: string[]): Layer => ({
  ...read(templateKey(templateId)),
  ...read(productKey(templateId, products)),
})

export function saveEdits(templateId: string, products: string[], split: { product: Layer; template: Layer }): boolean {
  const a = write(productKey(templateId, products), split.product)
  const b = write(templateKey(templateId), split.template)
  return a && b
}
