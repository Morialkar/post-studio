import { type DragEvent, useEffect, useState } from 'react'
import { testGemini } from './ai/gemini.ts'
import { ConnectionForm } from './connection/ConnectionForm.tsx'
import { type Connection, parseConnection } from './connection/schema.ts'
import { clearAll, downloadConnection, loadConnection, saveConnection } from './connection/storage.ts'
import { fetchShop, type Shop } from './shopify/storefront.ts'
import { Studio } from './studio/Studio.tsx'

type Check<T> = { state: 'checking' } | { state: 'ok'; value: T } | { state: 'error'; message: string } | { state: 'off' }

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

export default function App() {
  const [connection, setConnection] = useState<Connection | null>(() => loadConnection())
  const [errors, setErrors] = useState<string[]>([])
  const [shop, setShop] = useState<Check<Shop>>({ state: 'checking' })
  const [gemini, setGemini] = useState<Check<true>>({ state: 'checking' })
  const [dragging, setDragging] = useState(false)
  /** Formulaire complet ouvert (clé Gemini, export) */
  const [configuring, setConfiguring] = useState(false)

  // Test de connexion : nom de la boutique via Shopify, petit appel Gemini.
  useEffect(() => {
    if (connection === null) return
    let cancelled = false
    fetchShop(connection.store)
      .then((value) => !cancelled && setShop({ state: 'ok', value }))
      .catch((e: unknown) => !cancelled && setShop({ state: 'error', message: message(e) }))
    if (connection.ai)
      testGemini(connection.ai)
        .then(() => !cancelled && setGemini({ state: 'ok', value: true }))
        .catch((e: unknown) => !cancelled && setGemini({ state: 'error', message: message(e) }))
    return () => {
      cancelled = true
    }
  }, [connection])

  async function importFile(file: File) {
    const result = parseConnection(await file.text())
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    connect(result.connection)
  }

  function connect(next: Connection) {
    setErrors([])
    setConfiguring(false)
    saveConnection(next)
    setShop({ state: 'checking' })
    setGemini(next.ai ? { state: 'checking' } : { state: 'off' })
    setConnection(next)
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file !== undefined) void importFile(file)
  }

  function disconnect() {
    clearAll()
    setConnection(null)
  }

  if (connection === null)
    return (
      <main className="welcome">
        <h1>Studio de publications</h1>
        <p>Pour commencer, ajoute le fichier de connexion de ta boutique, ou entre l’adresse du site. Ce n’est demandé qu’une fois sur ce poste.</p>
        <label
          className={dragging ? 'drop dragging' : 'drop'}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <span>Glisse le fichier ici ou clique pour le choisir</span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file !== undefined) void importFile(file)
            }}
          />
        </label>
        {errors.length > 0 && (
          <ul className="errors" role="alert">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
        <p className="or">ou</p>
        <ConnectionForm full={configuring} onConnect={connect} onExpand={() => setConfiguring(true)} />
      </main>
    )

  const geminiState = connection.ai ? gemini : ({ state: 'off' } as const)

  return (
    <main className="studio">
      <header>
        <h1>Studio de publications</h1>
        <div className="actions">
          <button type="button" onClick={() => setConfiguring((c) => !c)} aria-expanded={configuring}>
            Réglages
          </button>
          <button type="button" onClick={() => downloadConnection(connection)}>
            Exporter
          </button>
          <button type="button" onClick={disconnect}>
            Déconnecter
          </button>
        </div>
      </header>
      {configuring && (
        <section className="settings">
          <ConnectionForm key={JSON.stringify(connection)} initial={connection} full onConnect={connect} />
        </section>
      )}
      <section className="status">
        <span>
          Boutique : <strong>{connection.store.domain}</strong>{' '}
          {shop.state === 'checking' && '— vérification…'}
          {shop.state === 'ok' && <span className="ok">— connectée ({shop.value.name})</span>}
          {shop.state === 'error' && <span className="ko">— injoignable : {shop.message}</span>}
        </span>
        <span>
          IA :{' '}
          {geminiState.state === 'off' && 'aucune clé, les points forts se tapent à la main'}
          {geminiState.state === 'checking' && `Gemini (${connection.ai?.model}) — vérification…`}
          {geminiState.state === 'ok' && <span className="ok">Gemini ({connection.ai?.model})</span>}
          {geminiState.state === 'error' && <span className="ko">Gemini indisponible : {geminiState.message} (saisie à la main)</span>}
        </span>
      </section>
      {shop.state === 'ok' && <Studio connection={geminiState.state === 'error' ? { ...connection, ai: undefined } : connection} shop={shop.value} />}
    </main>
  )
}
