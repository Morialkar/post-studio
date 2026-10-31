import { type FormEvent, useState } from 'react'
import { resolveStoreDomain } from './resolve.ts'
import { type Connection, connectionSchema, DEFAULT_GEMINI_MODEL } from './schema.ts'
import { downloadConnection } from './storage.ts'

type Props = {
  /** Valeurs de départ (« Réglages » sur une connexion existante) */
  initial?: Connection | null
  /** Formulaire complet (clé Gemini, options) ou seulement l'adresse du site */
  full: boolean
  onConnect(connection: Connection): void
  onExpand?(): void
}

// Remplace le fichier de connexion : on tape l'adresse du site (et la clé Gemini), l'outil trouve le
// domaine .myshopify.com et peut régénérer le fichier pour une collègue.
export function ConnectionForm({ initial, full, onConnect, onExpand }: Props) {
  const [address, setAddress] = useState(initial?.store.domain ?? '')
  const [apiKey, setApiKey] = useState(initial?.ai?.apiKey ?? '')
  const [model, setModel] = useState(initial?.ai?.model ?? DEFAULT_GEMINI_MODEL)
  const [language, setLanguage] = useState(initial?.store.language ?? 'FR')
  const [country, setCountry] = useState(initial?.store.country ?? 'CA')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function build(): Promise<Connection | null> {
    setBusy(true)
    setError(null)
    try {
      const domain = await resolveStoreDomain(address)
      const key = full ? apiKey.trim() : ''
      return connectionSchema.parse({
        format: 'post-studio',
        version: 1,
        store: { domain, language: language.trim().toUpperCase(), country: country.trim().toUpperCase() },
        ai: key === '' ? undefined : { provider: 'gemini', apiKey: key, model: model.trim() || DEFAULT_GEMINI_MODEL },
      })
    } catch (e) {
      const issues = (e as { issues?: { path: PropertyKey[]; message: string }[] }).issues
      setError(issues ? issues.map((i) => `${i.path.join('.')} : ${i.message}`).join(' ; ') : e instanceof Error ? e.message : String(e))
      return null
    } finally {
      setBusy(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const connection = await build()
    if (connection !== null) onConnect(connection)
  }

  async function exportFile() {
    const connection = await build()
    if (connection !== null) downloadConnection(connection)
  }

  return (
    <form className="connection-form" onSubmit={submit}>
      <label className="field">
        Adresse du site
        <input
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="www.ma-boutique.com ou ma-boutique.myshopify.com"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
      </label>
      {full && (
        <>
          <label className="field">
            Clé Gemini (facultative)
            <input type="password" autoComplete="off" placeholder="Sans clé, les points forts se tapent à la main" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            <span className="hint">
              Gratuite sur{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                Google AI Studio
              </a>
              , à restreindre au domaine de ce site.
            </span>
          </label>
          <details>
            <summary>Options</summary>
            <div className="options">
              <label className="field">
                Modèle Gemini
                <input type="text" value={model} onChange={(e) => setModel(e.target.value)} />
              </label>
              <label className="field">
                Langue
                <input type="text" maxLength={2} value={language} onChange={(e) => setLanguage(e.target.value)} />
              </label>
              <label className="field">
                Pays (prix)
                <input type="text" maxLength={2} value={country} onChange={(e) => setCountry(e.target.value)} />
              </label>
            </div>
          </details>
        </>
      )}
      <div className="actions">
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Recherche de la boutique…' : 'Se connecter'}
        </button>
        {full ? (
          <button type="button" disabled={busy} onClick={() => void exportFile()}>
            Exporter le fichier de clé
          </button>
        ) : (
          <button type="button" onClick={onExpand}>
            Configurer avec une clé Gemini…
          </button>
        )}
      </div>
      {error !== null && (
        <p className="errors" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
