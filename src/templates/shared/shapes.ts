// Formes du template dessinées en SVG (data URI) : leur couleur reste modifiable,
// et le même rendu sert au DOM de l'éditeur et à Satori.

const uri = (svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`

/** Mélange une couleur avec du blanc (0 = couleur, 1 = blanc). */
export function tint(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * amount)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

function wavyPath(w: number, h: number, pad: number, waves: number, amp: number): string {
  const cx = w / 2
  const cy = h / 2
  const rx = w / 2 - pad
  const ry = h / 2 - pad
  const points: string[] = []
  const steps = 240
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    // Superellipse (coins arrondis) + ondulation du bord.
    const c = Math.cos(t)
    const s = Math.sin(t)
    const k = 2 / 4.5
    const x = Math.sign(c) * Math.abs(c) ** k
    const y = Math.sign(s) * Math.abs(s) ** k
    const wobble = 1 + (amp * Math.sin(t * waves)) / Math.min(rx, ry)
    points.push(`${(cx + rx * x * wobble).toFixed(1)},${(cy + ry * y * wobble).toFixed(1)}`)
  }
  return `M${points.join('L')}Z`
}

/** Bulle autocollant : bord ondulé de couleur, fond teinté, contour blanc et ombre légère. */
export function bubble(w: number, h: number, color: string): string {
  const d = wavyPath(w, h, 14, 22, 2.2)
  return uri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<path d="${d}" transform="translate(3 5)" fill="#000" fill-opacity="0.12"/>` +
      `<path d="${d}" fill="#fff" stroke="#fff" stroke-width="16" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="${tint(color, 0.8)}" stroke="${color}" stroke-width="7" stroke-linejoin="round"/>` +
      '</svg>',
  )
}

/** Étoile à pointes (badge prix), contour blanc. */
export function starburst(w: number, h: number, color: string, spikes = 14): string {
  const cx = w / 2
  const cy = h / 2
  const points: string[] = []
  for (let i = 0; i < spikes * 2; i++) {
    const t = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 === 0 ? 1 : 0.72
    points.push(`${(cx + (w / 2 - 12) * r * Math.cos(t)).toFixed(1)},${(cy + (h / 2 - 12) * r * Math.sin(t)).toFixed(1)}`)
  }
  const d = `M${points.join('L')}Z`
  return uri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<path d="${d}" fill="#fff" stroke="#fff" stroke-width="18" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="${color}" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>` +
      '</svg>',
  )
}

/** Bandeau au bord supérieur ondulé. */
export function wavyBand(w: number, h: number, color: string, waves = 18, amp = 6): string {
  const points: string[] = [`0,${h}`]
  for (let i = 0; i <= 200; i++) {
    const x = (i / 200) * w
    points.push(`${x.toFixed(1)},${(amp + amp * Math.sin((i / 200) * Math.PI * 2 * waves)).toFixed(1)}`)
  }
  points.push(`${w},${h}`)
  return uri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<path d="M${points.join('L')}Z" fill="${color}"/></svg>`,
  )
}

/** Fond par défaut tant qu'aucune photo de boutique n'est fournie : dégradé pastel. */
export function pastelBackground(w: number, h: number): string {
  return uri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#ffe3f4"/><stop offset="0.55" stop-color="#e6f3ff"/><stop offset="1" stop-color="#f1e4ff"/>' +
      `</linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/></svg>`,
  )
}
