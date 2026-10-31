import { fitText, wrapCount } from './fitText.ts'

const CHAR = 0.62

/**
 * Titre à mots colorés : le premier mot en gros dans la 1re couleur, les suivants en dessous,
 * en alternance dans les autres couleurs. Tailles ajustées pour tenir dans width × height.
 */
export function MultiColorTitle({
  title,
  colors,
  width,
  height,
  first,
  rest,
  stroke,
}: {
  title: string
  colors: [string, ...string[]]
  width: number
  height: number
  first: { max: number; min: number }
  rest: { max: number; min: number }
  stroke?: string
}) {
  const [head = '', ...tail] = title.trim().split(/\s+/)
  const others = colors.slice(1)
  const tailText = tail.join(' ')
  let headSize = fitText(head, { width, ...first, charWidth: CHAR })
  let tailSize = tail.length === 0 ? 0 : fitText(tailText, { width, ...rest, lines: 2, charWidth: CHAR })
  // Réduire ensemble tant que le bloc dépasse la hauteur.
  const total = () => headSize * 0.9 + (tail.length === 0 ? 0 : wrapCount(tailText, tailSize, width, CHAR) * tailSize * 0.92)
  while (total() > height && (headSize > first.min || tailSize > rest.min)) {
    headSize = Math.max(first.min, headSize - 4)
    if (tail.length > 0) tailSize = Math.max(rest.min, tailSize - 3)
  }
  const outline = (size: number) => (stroke === undefined ? {} : { WebkitTextStroke: `${Math.max(2, Math.round(size / 22))}px ${stroke}` })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width, lineHeight: 0.9 }}>
      <div style={{ display: 'flex', fontSize: headSize, color: colors[0], ...outline(headSize) }}>{head}</div>
      {tail.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', fontSize: tailSize, width, lineHeight: 0.92 }}>
          {tail.map((word, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: les mots peuvent se répéter
              key={i}
              style={{ color: others[i % Math.max(1, others.length)] ?? colors[0], marginRight: i < tail.length - 1 ? tailSize * 0.22 : 0, ...outline(tailSize) }}
            >
              {word}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
