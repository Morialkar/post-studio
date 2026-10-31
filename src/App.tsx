import { type DragEvent, useEffect, useState } from 'react'
import { type Connection, parseConnection } from './connection/schema'
import { clearAll, exportConnection, loadConnection, saveConnection } from './connection/storage'
import { fetchShopName } from './shopify/storefront'

type ShopCheck = { state: 'idle' | 'checking' } | { state: 'ok'; name: string } | { state: 'error'; message: string }

export default function App() {
  const [connection, setConnection] = useState<Connection | null>(() => loadConnection())
  const [errors, setErrors] = useState<string[]>([])
  const [shop, setShop] = useState<ShopCheck>(() => ({ state: connection === null ? 'idle' : 'checking' }))
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (connection === null) return
    let cancelled = false
    fetchShopName(connection.store)
      .then((name) => !cancelled && setShop({ state: 'ok', name }))
      .catch((e: unknown) => !cancelled && setShop({ state: 'error', message: String(e instanceof Error ? e.message : e) }))
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
    setErrors([])
    saveConnection(result.connection)
    setShop({ state: 'checking' })
    setConnection(result.connection)
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file !== undefined) void importFile(file)
  }

  function download() {
    if (connection === null) return
    const url = URL.createObjectURL(exportConnection(connection))
    const a = document.createElement('a')
    a.href = url
    a.download = 'connexion-post-studio.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function disconnect() {
    clearAll()
    setConnection(null)
    setShop({ state: 'idle' })
  }

  if (connection === null)
    return (
      <main className="welcome">
        <h1>Studio de publications</h1>
        <p>Pour commencer, ajoute le fichier de connexion de ta boutique. Il n’est demandé qu’une fois sur ce poste.</p>
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
      </main>
    )

  return (
    <main className="studio">
      <header>
        <h1>Studio de publications</h1>
        <div className="actions">
          <button type="button" onClick={download}>
            Exporter
          </button>
          <button type="button" onClick={disconnect}>
            Déconnecter
          </button>
        </div>
      </header>
      <section className="status">
        <p>
          Boutique : <strong>{connection.store.domain}</strong>{' '}
          {shop.state === 'checking' && <span>— vérification…</span>}
          {shop.state === 'ok' && <span className="ok">— connectée ({shop.name})</span>}
          {shop.state === 'error' && <span className="ko">— injoignable : {shop.message}</span>}
        </p>
        <p>IA : {connection.ai ? `Gemini (${connection.ai.model})` : 'aucune clé, les points forts se tapent à la main'}</p>
      </section>
      <p className="next">La recherche de produits et le premier template arrivent à la phase 1.</p>
    </main>
  )
}
