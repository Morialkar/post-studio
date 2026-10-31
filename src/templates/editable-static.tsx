import type { CSSProperties } from 'react'
import type { Editable } from './types.ts'

/** Primitives en mode statique : ce que Satori dessine à l'export. */
export function staticEditable(values: Record<string, unknown>): Editable {
  const value = (field: string): string => {
    const v = values[field]
    return typeof v === 'string' ? v : ''
  }
  return {
    editing: false,
    text(field, style, options) {
      return <div style={{ display: 'flex', ...style }}>{options?.display ?? value(field)}</div>
    },
    image(field, style) {
      const src = value(field)
      return src === '' ? null : <img src={src} alt="" style={style as CSSProperties} />
    },
    region(_fields, style, children) {
      return <div style={{ display: 'flex', ...style }}>{children}</div>
    },
  }
}
