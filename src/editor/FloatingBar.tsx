import type { FieldEntry } from '../templates/fields.ts'
import type { Origin } from './values.ts'

export type ImageTools = {
  /** Images du ou des produits, pour remplacer une photo */
  choices: string[]
  /** Détourage en cours ou disponible pour ce champ */
  cutout?: { state: 'idle' | 'running' | 'error'; run(): void; progress?: string }
}

export function FloatingBar({
  fields,
  values,
  origins,
  imported,
  position,
  onChange,
  onReset,
  onClose,
  imageTools,
}: {
  fields: FieldEntry[]
  values: Record<string, unknown>
  origins: Record<string, Origin>
  imported: Record<string, string>
  position: { left: number; top: number }
  onChange(field: string, value: string): void
  onReset(field: string): void
  onClose(): void
  imageTools(field: string): ImageTools
}) {
  return (
    <div className="floating-bar" style={{ left: position.left, top: position.top }} onClick={(e) => e.stopPropagation()}>
      {fields.map(({ name, meta }) => {
        const value = String(values[name] ?? '')
        const resetLabel = imported[name] ? 'Rétablir la valeur Shopify' : 'Rétablir la valeur du template'
        return (
          <div key={name} className="bar-field">
            <span className="bar-label">{meta.label}</span>
            {meta.kind === 'color' && (
              <input type="color" value={value} onChange={(e) => onChange(name, e.target.value)} aria-label={meta.label} />
            )}
            {meta.kind === 'text' && <span className="bar-hint">Tape directement dans le visuel</span>}
            {meta.kind === 'image' && <ImageControls name={name} tools={imageTools(name)} onChange={onChange} />}
            {origins[name] === 'manual' && (
              <button type="button" className="link" onClick={() => onReset(name)}>
                {resetLabel}
              </button>
            )}
          </div>
        )
      })}
      <button type="button" className="close" aria-label="Fermer" onClick={onClose}>
        ×
      </button>
    </div>
  )
}

function ImageControls({ name, tools, onChange }: { name: string; tools: ImageTools; onChange(field: string, value: string): void }) {
  return (
    <div className="bar-images">
      {tools.choices.slice(0, 8).map((url) => (
        <button key={url} type="button" className="thumb" onClick={() => onChange(name, url)} aria-label="Utiliser cette image">
          <img src={url} alt="" />
        </button>
      ))}
      <label className="file">
        Fichier…
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (file !== undefined) onChange(name, await shrink(file))
          }}
        />
      </label>
      {tools.cutout && (
        <button type="button" disabled={tools.cutout.state === 'running'} onClick={tools.cutout.run}>
          {tools.cutout.state === 'running' ? `Détourage… ${tools.cutout.progress ?? ''}` : 'Relancer le détourage'}
        </button>
      )}
    </div>
  )
}

/** Fichier choisi → data URI réduite à 1080 px (le stockage du navigateur est limité). */
async function shrink(file: File, max = 1080): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.88)
}
