import type { CSSProperties, JSX, ReactNode } from 'react'
import type { z } from 'zod'
import type { NormalizedProduct } from '../product/types.ts'

export type FontAsset = {
  name: string
  url: string
  weight: 400 | 500 | 600 | 700 | 800 | 900
  style?: 'normal' | 'italic'
}

export type Shop = { name: string; url: string }

export type AiHelpers = {
  /** Propose des points forts courts à partir d'une description publique. */
  highlights(product: NormalizedProduct, count: number): Promise<string[]>
}

export type FillContext = {
  shop: Shop
  ai?: AiHelpers
}

/**
 * Primitives d'édition. À l'export (Satori), elles rendent du texte, des formes et des images simples ;
 * dans l'éditeur, les mêmes appels rendent chaque champ cliquable et modifiable en place.
 */
export interface Editable {
  readonly editing: boolean
  /** Texte d'un champ ; `display` remplace l'affichage (titre multicolore), pas la valeur. `colors` : champs couleur liés */
  text(field: string, style: CSSProperties, options?: { display?: ReactNode; colors?: string[] }): JSX.Element
  /** Image d'un champ ; rien à l'export si le champ est vide */
  image(field: string, style: CSSProperties): JSX.Element | null
  /** Zone qui expose des champs couleur (forme, bandeau) */
  region(fields: string[], style: CSSProperties, children?: ReactNode): JSX.Element
}

/**
 * Contrat d'un template : un module autonome dans src/templates/<id>/, inscrit dans le registre.
 * Il déclare combien de produits il accepte, ses champs (schéma Zod de champs typés), comment
 * les remplir à partir des produits, et comment les dessiner. Le même JSX sert à l'éditeur et à l'export.
 */
export interface TemplateDefinition<S extends z.ZodObject = z.ZodObject> {
  id: string
  name: string
  /** D'où vient le design (lien Canva), pour s'y retrouver */
  source?: string
  size: { width: number; height: number }
  fonts: FontAsset[]
  /** Nombre de produits choisis pour une publication : 1..1 pour une fiche, 2..4 pour une sélection */
  products: { min: number; max: number }
  /** Champs éditables ; leurs valeurs par défaut sont celles du template */
  fields: S
  /** Valeurs importées des produits (et de Gemini) ; un champ absent garde la valeur du template */
  fromProducts(products: NormalizedProduct[], context: FillContext): Promise<Partial<z.infer<S>>>
  render(values: z.infer<S>, e: Editable): JSX.Element
}

export type AnyTemplate = TemplateDefinition<z.ZodObject>
