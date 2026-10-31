import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm?url'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { assignColorImages, geminiHelpers } from '../ai/gemini.ts'
import type { Connection } from '../connection/schema.ts'
import { cutoutIfNeeded, removeBackground } from '../cutout/cutout.ts'
import { FloatingBar } from '../editor/FloatingBar.tsx'
import { type EditorApi, interactiveEditable } from '../editor/interactive.tsx'
import { loadEdits, saveEdits } from '../editor/store.ts'
import { type Layer, resolveValues, splitByScope } from '../editor/values.ts'
import type { NormalizedProduct } from '../product/types.ts'
import { imageToDataUri } from '../render/images.ts'
import { fetchLoader, initRenderer, renderPng, renderSvg } from '../render/render.ts'
import type { SearchHit } from '../shopify/queries.ts'
import { fetchProduct, searchProducts, type Shop } from '../shopify/storefront.ts'
import { fieldsOf } from '../templates/fields.ts'
import { templateById, templates } from '../templates/index.ts'

type Cutout = { state: 'running' | 'done' | 'error'; src?: string; progress?: string }

const startRenderer = () => initRenderer(() => fetch(resvgWasm))

export function Studio({ connection, shop }: { connection: Connection; shop: Shop }) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const template = templateById(templateId) ?? templates[0]
  const fieldList = useMemo(() => (template ? fieldsOf(template.fields) : []), [template])
  const ai = useMemo(() => (connection.ai ? geminiHelpers(connection.ai) : undefined), [connection.ai])

  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [products, setProducts] = useState<NormalizedProduct[]>([])
  const [imported, setImported] = useState<Layer>({})
  const [manual, setManual] = useState<Layer>({})
  const [selected, setSelected] = useState<{ fields: string[]; left: number; top: number } | null>(null)
  const [cutouts, setCutouts] = useState<Record<string, Cutout>>({})
  const [status, setStatus] = useState<string>('')
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)
  const handles = products.map((p) => p.handle)

  // Échelle de l'aperçu : le visuel 1080 px tient dans la largeur disponible.
  useEffect(() => {
    const el = stage.current
    if (el === null || template === undefined) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(Math.min(1, entry.contentRect.width / template.size.width))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [template])

  const runSearch = useCallback(
    async (term: string) => {
      setSearching(true)
      try {
        setHits(await searchProducts(connection.store, term, 12))
        setStatus('')
      } catch (e) {
        setStatus(`Recherche impossible : ${e instanceof Error ? e.message : e}`)
      } finally {
        setSearching(false)
      }
    },
    [connection.store],
  )

  useEffect(() => {
    void runSearch('')
  }, [runSearch])

  // Produits choisis → valeurs importées (Shopify, puis Gemini s'il y a une clé).
  useEffect(() => {
    if (template === undefined || products.length < template.products.min) {
      setImported({})
      return
    }
    let cancelled = false
    setStatus(ai ? 'Préparation du visuel et des points forts…' : 'Préparation du visuel…')
    template
      .fromProducts(products, { shop, ai })
      .then((values) => {
        if (cancelled) return
        setImported(Object.fromEntries(Object.entries(values).filter((e): e is [string, string] => typeof e[1] === 'string')))
        setManual(loadEdits(template.id, products.map((p) => p.handle)))
        setStatus('')
      })
      .catch((e) => !cancelled && setStatus(`Remplissage impossible : ${e instanceof Error ? e.message : e}`))
    return () => {
      cancelled = true
    }
  }, [template, products, shop, ai])

  const { values, origins } = useMemo(
    () => (template ? resolveValues(template, imported, manual) : { values: {}, origins: {} }),
    [template, imported, manual],
  )

  const cutoutField = useCallback((name: string) => fieldList.find((f) => f.name === name)?.meta.cutout === true, [fieldList])

  // Détourage automatique des images marquées « cutout », une seule fois par image.
  const startCutout = useCallback((url: string, force = false) => {
    setCutouts((c) => {
      if (!force && c[url] !== undefined) return c
      void (async () => {
        try {
          const uri = await imageToDataUri(url)
          const onProgress = (loaded: number, total: number) =>
            setCutouts((cc) => ({ ...cc, [url]: { state: 'running', progress: total > 0 ? `${Math.round((loaded / total) * 100)} %` : '' } }))
          const src = force ? await removeBackground(uri, onProgress) : await cutoutIfNeeded(uri, onProgress)
          setCutouts((cc) => ({ ...cc, [url]: { state: 'done', src } }))
        } catch {
          setCutouts((cc) => ({ ...cc, [url]: { state: 'error' } }))
        }
      })()
      return { ...c, [url]: { state: 'running' } }
    })
  }, [])

  useEffect(() => {
    for (const { name } of fieldList) {
      const v = (values as Record<string, unknown>)[name]
      if (cutoutField(name) && typeof v === 'string' && v !== '') startCutout(v)
    }
  }, [fieldList, values, cutoutField, startCutout])

  const setValue = useCallback(
    (field: string, value: string) => {
      if (template === undefined) return
      setManual((m) => {
        const next = { ...m, [field]: value }
        if (!saveEdits(template.id, handles, splitByScope(fieldList, next)))
          setStatus('Stockage du navigateur plein : cette modification ne sera pas gardée après la fermeture.')
        return next
      })
    },
    [template, handles, fieldList],
  )

  const reset = useCallback(
    (field: string) => {
      if (template === undefined) return
      setManual((m) => {
        const { [field]: _, ...next } = m
        saveEdits(template.id, handles, splitByScope(fieldList, next))
        return next
      })
    },
    [template, handles, fieldList],
  )

  const displaySrc = useCallback(
    (field: string) => {
      const v = String((values as Record<string, unknown>)[field] ?? '')
      if (v === '' || !cutoutField(field)) return v
      return cutouts[v]?.src ?? v
    },
    [values, cutouts, cutoutField],
  )

  const api: EditorApi = {
    values: values as Record<string, unknown>,
    origins,
    selected: selected?.fields ?? [],
    displaySrc,
    setValue,
    select(fields, target) {
      const box = stage.current?.getBoundingClientRect()
      const rect = target.getBoundingClientRect()
      if (box === undefined) return
      setSelected({ fields, left: Math.max(0, Math.min(rect.left - box.left, box.width - 320)), top: rect.bottom - box.top + 8 })
    },
  }

  /** Toutes les images en data URI (versions détourées si prêtes) pour Satori. */
  async function preparedValues() {
    const out: Record<string, unknown> = { ...values }
    for (const { name, meta } of fieldList) {
      const v = out[name]
      if (meta.kind !== 'image' || typeof v !== 'string' || v === '') continue
      const cut = meta.cutout ? cutouts[v]?.src : undefined
      out[name] = cut ?? (await imageToDataUri(v))
    }
    return out as typeof values
  }

  async function showPreview() {
    if (template === undefined) return
    setBusy(true)
    try {
      const svg = await renderSvg(template, await preparedValues(), fetchLoader)
      setPreview(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)
    } catch (e) {
      setStatus(`Aperçu impossible : ${e instanceof Error ? e.message : e}`)
    } finally {
      setBusy(false)
    }
  }

  async function download() {
    if (template === undefined) return
    setBusy(true)
    try {
      await startRenderer()
      const png = await renderPng(template, await preparedValues(), fetchLoader)
      const url = URL.createObjectURL(new Blob([png as BlobPart], { type: 'image/png' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${handles.join('+') || 'publication'}-${template.id}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setStatus(`Export impossible : ${e instanceof Error ? e.message : e}`)
    } finally {
      setBusy(false)
    }
  }

  async function toggleProduct(hit: SearchHit) {
    if (template === undefined) return
    if (products.some((p) => p.id === hit.id)) {
      setProducts(products.filter((p) => p.id !== hit.id))
      return
    }
    try {
      let product = await fetchProduct(connection.store, hit.handle, shop.url)
      // Couleurs sans image liée : Gemini vision les associe aux images, s'il y a une clé.
      if (connection.ai && product.colors.some((c) => c.image === null) && product.images.length > 1) {
        const images = await Promise.all(product.images.slice(0, 6).map((i) => imageToDataUri(i.url, 400)))
        product = await assignColorImages(connection.ai, product, images).catch(() => product)
      }
      const next = template.products.max === 1 ? [product] : [...products, product].slice(-template.products.max)
      setProducts(next)
      setSelected(null)
    } catch (e) {
      setStatus(`Produit illisible : ${e instanceof Error ? e.message : e}`)
    }
  }

  if (template === undefined) return <p>Aucun template.</p>
  const ready = products.length >= template.products.min
  const selectedFields = fieldList.filter((f) => selected?.fields.includes(f.name))
  const choices = [...new Set(products.flatMap((p) => p.images.map((i) => i.url)))]
  const soldOut = products.filter((p) => !p.availableForSale)

  return (
    <div className="studio-grid">
      <aside className="panel">
        <label className="field">
          Template
          <select value={templateId} onChange={(e) => { setTemplateId(e.target.value); setProducts([]); setSelected(null) }}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.products.max === 1 ? '1 produit' : `${t.products.min} à ${t.products.max} produits`})
              </option>
            ))}
          </select>
        </label>
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault()
            void runSearch(query)
          }}
        >
          <input type="search" placeholder="Chercher un produit" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button type="submit" disabled={searching}>
            {searching ? '…' : 'Chercher'}
          </button>
        </form>
        <p className="hint">
          {template.products.max === 1 ? 'Choisis un produit.' : `Choisis de ${template.products.min} à ${template.products.max} produits.`}
        </p>
        <ul className="hits">
          {hits.map((hit) => {
            const on = products.some((p) => p.id === hit.id)
            return (
              <li key={hit.id}>
                <button type="button" className={on ? 'hit on' : 'hit'} onClick={() => void toggleProduct(hit)}>
                  {hit.featuredImage ? <img src={`${hit.featuredImage.url}&width=120`} alt="" /> : <span className="noimg" />}
                  <span>
                    {hit.title}
                    <small>
                      {Number(hit.priceRange.minVariantPrice.amount).toFixed(2)}$
                      {!hit.availableForSale && ' · épuisé'}
                    </small>
                  </span>
                </button>
              </li>
            )
          })}
          {hits.length === 0 && !searching && <li className="hint">Aucun produit trouvé.</li>}
        </ul>
      </aside>

      <section className="canvas-col">
        <div className="toolbar">
          <button type="button" disabled={!ready || busy} onClick={() => void showPreview()}>
            Aperçu final
          </button>
          <button type="button" className="primary" disabled={!ready || busy} onClick={() => void download()}>
            {busy ? 'Rendu…' : 'Télécharger le PNG'}
          </button>
        </div>
        {status !== '' && <p className="status-line">{status}</p>}
        {soldOut.length > 0 && <p className="status-line">Attention : {soldOut.map((p) => p.title).join(', ')} en rupture de stock.</p>}
        {!ai && ready && <p className="hint">Sans clé Gemini : clique dans les bulles pour écrire les points forts.</p>}
        <div className="stage" ref={stage} onClick={() => setSelected(null)}>
          {ready ? (
            <div style={{ width: template.size.width * scale, height: template.size.height * scale }}>
              <div className="canvas" style={{ width: template.size.width, height: template.size.height, transform: `scale(${scale})` }}>
                {template.render(values, interactiveEditable(api))}
              </div>
            </div>
          ) : (
            <div className="empty">Choisis un produit à gauche pour commencer.</div>
          )}
          {selected !== null && selectedFields.length > 0 && (
            <FloatingBar
              fields={selectedFields}
              values={values as Record<string, unknown>}
              origins={origins}
              imported={imported}
              position={selected}
              onChange={setValue}
              onReset={reset}
              onClose={() => setSelected(null)}
              imageTools={(name) => {
                const v = String((values as Record<string, unknown>)[name] ?? '')
                const c = cutouts[v]
                return {
                  choices,
                  cutout: cutoutField(name) && v !== ''
                    ? { state: c?.state === 'running' ? 'running' : c?.state === 'error' ? 'error' : 'idle', progress: c?.progress, run: () => startCutout(v, true) }
                    : undefined,
                }
              }}
            />
          )}
        </div>
        {Object.values(cutouts).some((c) => c.state === 'running') && (
          <p className="hint">
            Détourage en cours{' '}
            {Object.values(cutouts).find((c) => c.state === 'running' && c.progress)?.progress ?? ''} (le premier télécharge le modèle une
            fois, ensuite il reste en cache).
          </p>
        )}
      </section>

      {preview !== null && (
        <div className="modal" onClick={() => setPreview(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <p>Rendu réel de l’export (Satori). Vérifie les retours de ligne avant de télécharger.</p>
            <img src={preview} alt="Aperçu final" />
            <button type="button" onClick={() => setPreview(null)}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
