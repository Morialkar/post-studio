import { z } from 'zod'

export const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest'

// Fichier de connexion : branche l'outil à une boutique et, au besoin, à une clé Gemini.
// Le site ne contient aucune configuration ; tout vient de ce fichier.
export const connectionSchema = z.object({
  format: z.literal('post-studio', {
    error: 'ce n’est pas un fichier de connexion du Studio (format attendu : « post-studio »)',
  }),
  version: z.literal(1, { error: 'version de fichier non prise en charge (attendu : 1)' }),
  store: z.object({
    domain: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/, {
        error: 'domaine attendu en .myshopify.com, ex. ma-boutique.myshopify.com',
      }),
    language: z.string().regex(/^[A-Z]{2}$/, { error: 'code de langue à 2 lettres, ex. FR' }).default('FR'),
    country: z.string().regex(/^[A-Z]{2}$/, { error: 'code de pays à 2 lettres, ex. CA' }).default('CA'),
  }),
  ai: z
    .object({
      provider: z.literal('gemini', { error: 'seul le fournisseur « gemini » est pris en charge' }),
      apiKey: z.string().min(1, { error: 'clé Gemini vide' }),
      model: z.string().min(1).default(DEFAULT_GEMINI_MODEL),
    })
    .optional(),
})

export type Connection = z.infer<typeof connectionSchema>

export type ParseResult =
  | { ok: true; connection: Connection }
  | { ok: false; errors: string[] }

/** Lit le texte d'un fichier de connexion ; un message clair par champ fautif. */
export function parseConnection(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['le fichier n’est pas du JSON valide'] }
  }
  const result = connectionSchema.safeParse(raw)
  if (result.success) return { ok: true, connection: result.data }
  return {
    ok: false,
    errors: result.error.issues.map((i) =>
      i.path.length > 0 ? `${i.path.join('.')} : ${i.message}` : i.message,
    ),
  }
}
