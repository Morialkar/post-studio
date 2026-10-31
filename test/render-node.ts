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
