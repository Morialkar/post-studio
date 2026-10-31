import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { type AssetLoader, initRenderer } from '../src/render/render.ts'

const root = join(import.meta.dirname, '..')
const require = createRequire(import.meta.url)

/** Chargeur Node : les URL « ?url » de Vite pointent vers des fichiers du projet ou de node_modules. */
export const nodeLoader: AssetLoader = async (url) => {
  const clean = url.replace(/[?#].*$/, '')
  const path = clean.startsWith('/@fs/') ? clean.slice(4) : join(root, clean)
  const buf = readFileSync(path)
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

export function initNodeRenderer(): Promise<void> {
  return initRenderer(async () => {
    const buf = readFileSync(require.resolve('@resvg/resvg-wasm/index_bg.wasm'))
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  })
}

const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml' }

/**
 * Images en data URI, comme le navigateur les prépare : les assets du template sont lus sur disque,
 * les URL du CDN remplacées par les images enregistrées (`known`), les autres vidées. Un champ à
 * détourer prend la version détourée enregistrée (`cut`), comme l'outil après le détourage.
 */
export async function prepareImages(
  template: { fields: import('zod').ZodObject },
  values: Record<string, unknown>,
  known: Record<string, string> = {},
  cut: Record<string, string> = {},
): Promise<Record<string, unknown>> {
  const { fieldsOf } = await import('../src/templates/fields.ts')
  const out = { ...values }
  for (const { name, meta } of fieldsOf(template.fields)) {
    const v = out[name]
    if (meta.kind !== 'image' || typeof v !== 'string' || v === '' || v.startsWith('data:')) continue
    if (meta.cutout === true && cut[v] !== undefined) out[name] = cut[v]
    else if (known[v] !== undefined) out[name] = known[v]
    else if (/^https?:/.test(v)) out[name] = ''
    else {
      const ext = v.replace(/[?#].*$/, '').split('.').pop()?.toLowerCase() ?? ''
      out[name] = `data:${MIME[ext] ?? 'application/octet-stream'};base64,${Buffer.from(await nodeLoader(v)).toString('base64')}`
    }
  }
  return out
}
