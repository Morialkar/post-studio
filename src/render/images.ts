/** Convertit des octets d'image en data URI. */
export function bytesToDataUri(bytes: ArrayBuffer, type: string): string {
  const view = new Uint8Array(bytes)
  let binary = ''
  for (let i = 0; i < view.length; i += 0x8000) binary += String.fromCharCode(...view.subarray(i, i + 0x8000))
  return `data:${type};base64,${btoa(binary)}`
}

/** Image distante → data URI, réduite par le CDN Shopify si possible (paramètre width). */
export async function imageToDataUri(url: string, width = 1080): Promise<string> {
  if (url.startsWith('data:')) return url
  const sized = /cdn\.shopify\.com/.test(url) ? `${url}${url.includes('?') ? '&' : '?'}width=${width}` : url
  const res = await fetch(sized)
  if (!res.ok) throw new Error(`image ${res.status}`)
  const blob = await res.blob()
  return bytesToDataUri(await blob.arrayBuffer(), blob.type || 'image/jpeg')
}

/**
 * Transparence déjà présente ? On regarde les quatre coins (zones de 8×8 px) :
 * une photo déjà détourée a des coins transparents, une photo produit classique un fond opaque.
 */
export function hasTransparentCorners(data: Uint8ClampedArray, width: number, height: number, patch = 8): boolean {
  const corners: [number, number][] = [
    [0, 0],
    [width - patch, 0],
    [0, height - patch],
    [width - patch, height - patch],
  ]
  return corners.every(([x0, y0]) => {
    let transparent = 0
    for (let y = y0; y < y0 + patch; y++)
      for (let x = x0; x < x0 + patch; x++) if ((data[(y * width + x) * 4 + 3] ?? 255) < 16) transparent++
    return transparent > patch * patch * 0.8
  })
}
