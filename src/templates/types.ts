import type { JSX } from 'react'
import type { ZodType } from 'zod'
import type { NormalizedProduct } from '../product/types'

export type FontAsset = {
  name: string
  url: string
  weight?: 400 | 500 | 600 | 700 | 800 | 900
  style?: 'normal' | 'italic'
}

/** Assets résolus du template (fond, formes, etc.), adresses prêtes pour le rendu. */
export type TemplateAssets = Record<string, string>

export type AiHelpers = {
  /** Propose des points forts courts à partir d'une description publique. */
  highlights(description: string, count: number): Promise<string[]>
}

/**
 * Contrat d'un template : un module autonome. En ajouter un, c'est ajouter un dossier
 * dans src/templates/ et l'inscrire dans le registre, sans toucher au reste de l'outil.
 */
export interface TemplateDefinition<F> {
  id: string
  name: string
  size: { width: number; height: number }
  fonts: FontAsset[]
  /** Schéma des champs éditables ; le type de chaque champ choisit l'outil d'édition. */
  fields: ZodType<F>
  /** Remplissage par défaut à partir du produit normalisé. */
  fromProduct(product: NormalizedProduct, ai?: AiHelpers): Promise<F>
  /** Composant pur, rendu en DOM dans l'éditeur et par Satori à l'export. */
  render(fields: F, assets: TemplateAssets): JSX.Element
}
