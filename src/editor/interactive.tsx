import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import type { Editable } from '../templates/types.ts'
import type { Origin } from './values.ts'

export type EditorApi = {
  values: Record<string, unknown>
  origins: Record<string, Origin>
  selected: string[]
  /** Image à afficher pour un champ (version détourée si prête) */
  displaySrc(field: string): string
  select(fields: string[], target: HTMLElement): void
  setValue(field: string, value: string): void
}

const dot: CSSProperties = {
  position: 'absolute',
  top: -6,
  right: -6,
  width: 14,
  height: 14,
  borderRadius: 7,
  background: '#ff3bbc',
  border: '2px solid #fff',
  pointerEvents: 'none',
}

const ring = (on: boolean): CSSProperties =>
  on ? { outline: '4px solid #079cf8', outlineOffset: 4, cursor: 'pointer' } : { cursor: 'pointer' }

function EditableText({
  api,
  field,
  style,
  display,
  colors,
}: {
  api: EditorApi
  field: string
  style: CSSProperties
  display?: ReactNode
  colors: string[]
}) {
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const value = String(api.values[field] ?? '')
  const selected = api.selected.includes(field)
  useEffect(() => {
    if (!editing || ref.current === null) return
    ref.current.focus()
    const range = document.createRange()
    range.selectNodeContents(ref.current)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }, [editing])
  useEffect(() => {
    if (!selected) setEditing(false)
  }, [selected])
  const modified = api.origins[field] === 'manual' || colors.some((c) => api.origins[c] === 'manual')
  const empty = value.trim() === ''
  return (
    <div
      data-field={field}
      style={{ display: 'flex', ...style, ...ring(selected), position: style.position ?? 'relative' }}
      onClick={(e) => {
        e.stopPropagation()
        api.select([field, ...colors], e.currentTarget)
        setEditing(true)
      }}
    >
      {editing ? (
        <div
          ref={ref}
          contentEditable="plaintext-only"
          suppressContentEditableWarning
          style={{ outline: 'none', whiteSpace: 'pre-wrap', minWidth: 40, width: '100%', textAlign: style.textAlign ?? 'center' }}
          onBlur={(e) => {
            // textContent : le texte tapé, sans la transformation CSS (majuscules) qu'innerText appliquerait.
            const next = (e.currentTarget.textContent ?? '').replace(/\n+$/, '')
            if (next !== value) api.setValue(field, next)
            setEditing(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') e.currentTarget.blur()
          }}
        >
          {value}
        </div>
      ) : empty ? (
        <span style={{ opacity: 0.45, fontStyle: 'italic', textTransform: 'none' }}>Cliquer pour écrire</span>
      ) : (
        (display ?? value)
      )}
      {modified && <span style={dot} />}
    </div>
  )
}

/** Primitives en mode édition : chaque champ du template devient cliquable et modifiable en place. */
export function interactiveEditable(api: EditorApi): Editable {
  return {
    editing: true,
    text(field, style, options) {
      return <EditableText key={field} api={api} field={field} style={style} display={options?.display} colors={options?.colors ?? []} />
    },
    image(field, style) {
      const src = api.displaySrc(field)
      const selected = api.selected.includes(field)
      const select = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation()
        api.select([field], e.currentTarget)
      }
      const modified = api.origins[field] === 'manual'
      return (
        <div key={field} data-field={field} style={{ ...style, display: 'flex', position: style.position ?? 'relative', ...ring(selected) }} onClick={select}>
          {src === '' ? (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', border: '3px dashed #9d39cc', borderRadius: 16, color: '#9d39cc', fontSize: 28, background: '#ffffffaa' }}>
              Image
            </div>
          ) : (
            <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: style.objectFit ?? 'contain' }} />
          )}
          {modified && <span style={dot} />}
        </div>
      )
    },
    region(fields, style, children) {
      const selected = fields.length > 0 && fields.every((f) => api.selected.includes(f))
      const modified = fields.some((f) => api.origins[f] === 'manual')
      return (
        <div
          key={fields.join('+') || undefined}
          style={{ display: 'flex', ...style, ...(fields.length > 0 ? ring(selected) : {}) }}
          onClick={
            fields.length === 0
              ? undefined
              : (e) => {
                  e.stopPropagation()
                  api.select(fields, e.currentTarget)
                }
          }
        >
          {children}
          {modified && <span style={dot} />}
        </div>
      )
    },
  }
}
