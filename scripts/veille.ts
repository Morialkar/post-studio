// Veille mensuelle : version épinglée de la Storefront API et modèle Gemini par défaut.
// Écrit les constats (un par ligne, Markdown) dans le fichier passé en argument ; vide = rien à faire.
// Usage : node scripts/veille.ts veille.md   (GEMINI_API_KEY facultatif)
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { DEFAULT_GEMINI_MODEL, parseConnection } from '../src/connection/schema.ts'
import { STOREFRONT_API_VERSION, storefront } from '../src/shopify/storefront.ts'

const root = join(import.meta.dirname, '..')
const findings: string[] = []

const demo = parseConnection(readFileSync(join(root, 'connexion.demo.json'), 'utf8'))
if (!demo.ok) throw new Error(demo.errors.join('\n'))

// Shopify : une version reste supportée environ 12 mois ; on prévient dans les 6 derniers.
const versions = await storefront(
  demo.connection.store,
  'query { publicApiVersions { handle supported } }',
  z.object({ publicApiVersions: z.array(z.object({ handle: z.string(), supported: z.boolean() })) }),
)
const supported = versions.publicApiVersions.filter((v) => v.supported && /^\d{4}-\d{2}$/.test(v.handle)).map((v) => v.handle).sort()
const latest = supported.at(-1)
if (!supported.includes(STOREFRONT_API_VERSION))
  findings.push(`- **Urgent** : la Storefront API \`${STOREFRONT_API_VERSION}\` n'est plus supportée. Passer à \`${latest}\` dans \`src/shopify/storefront.ts\`.`)
else if (supported.indexOf(STOREFRONT_API_VERSION) < 2)
  findings.push(`- La Storefront API \`${STOREFRONT_API_VERSION}\` sera retirée d'ici six mois. Passer à \`${latest}\` dans \`src/shopify/storefront.ts\`, puis \`npm run test:live\`.`)

// Gemini : le modèle par défaut existe-t-il encore ? (seulement si une clé de test est fournie)
const key = process.env.GEMINI_API_KEY
if (key) {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', { headers: { 'x-goog-api-key': key } })
  if (!res.ok) findings.push(`- Liste des modèles Gemini illisible (${res.status}) : vérifier la clé de veille.`)
  else {
    const { models } = z.object({ models: z.array(z.object({ name: z.string() })) }).parse(await res.json())
    if (!models.some((m) => m.name === `models/${DEFAULT_GEMINI_MODEL}`))
      findings.push(`- Le modèle Gemini \`${DEFAULT_GEMINI_MODEL}\` n'existe plus. Choisir un modèle Flash gratuit, le mettre dans \`DEFAULT_GEMINI_MODEL\` et dans les fichiers de connexion (\`ai.model\`).`)
  }
}

writeFileSync(process.argv[2] ?? 'veille.md', findings.join('\n'))
console.log(findings.length === 0 ? 'rien à signaler' : findings.join('\n'))
