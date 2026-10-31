/**
 * Tailles de police estimées par largeur moyenne d'un caractère (en em).
 * Suffisant pour des polices d'affiche ; l'« Aperçu final » montre le vrai rendu Satori.
 */
export function fitText(
  text: string,
  { width, max, min, lines = 1, charWidth = 0.6 }: { width: number; max: number; min: number; lines?: number; charWidth?: number },
): number {
  for (let size = max; size > min; size -= 2) if (wrapCount(text, size, width, charWidth) <= lines) return size
  return min
}

/** Nombre de lignes d'un texte coupé aux espaces (et aux retours de ligne) à cette taille. */
export function wrapCount(text: string, size: number, width: number, charWidth = 0.6): number {
  const perLine = Math.max(1, Math.floor(width / (size * charWidth)))
  return text
    .trim()
    .split('\n')
    .reduce((total, paragraph) => {
      let lines = 1
      let used = 0
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const need = used === 0 ? word.length : used + 1 + word.length
        if (need <= perLine) used = need
        else {
          lines += used === 0 ? 0 : 1
          used = word.length
          lines += Math.floor((word.length - 1) / perLine)
        }
      }
      return total + lines
    }, 0)
}
