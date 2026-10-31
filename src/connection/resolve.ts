import { z } from 'zod'

const MYSHOPIFY = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/

/** « https://www.boutique.com/collections/x » → « www.boutique.com » ; null si ce n'est pas une adresse. */
export function hostOf(input: string): string | null {
  const text = input.trim().toLowerCase()
  if (text === '') return null
  try {
    const host = new URL(/^[a-z]+:\/\//.test(text) ? text : `https://${text}`).hostname
    return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) ? host : null
  } catch {
    return null
  }
}

const metaSchema = z.object({ myshopify_domain: z.string().regex(MYSHOPIFY) })

/**
 * Adresse du site (domaine public ou .myshopify.com) → domaine .myshopify.com de la boutique.
 * Toute boutique Shopify publie /meta.json (CORS ouvert), qui donne son domaine .myshopify.com.
 */
export async function resolveStoreDomain(input: string, fetchFn: typeof fetch = fetch): Promise<string> {
  const host = hostOf(input)
  if (host === null) throw new Error('adresse invalide, ex. www.ma-boutique.com')
  if (MYSHOPIFY.test(host)) return host
  let res: Response
  try {
    res = await fetchFn(`https://${host}/meta.json`)
  } catch {
    throw new Error(`${host} est injoignable ou n’est pas une boutique Shopify`)
  }
  const meta = res.ok ? metaSchema.safeParse(await res.json().catch(() => null)) : null
  if (!meta?.success) throw new Error(`${host} ne semble pas être une boutique Shopify`)
  return meta.data.myshopify_domain
}
