import { crunchieFunnyBottle } from './crunchie-funny-bottle/index.tsx'
import type { AnyTemplate } from './types.ts'

// Registre : liste des templates disponibles, alimente le sélecteur.
export const templates: AnyTemplate[] = [crunchieFunnyBottle as unknown as AnyTemplate]

export function templateById(id: string): AnyTemplate | undefined {
  return templates.find((t) => t.id === id)
}
