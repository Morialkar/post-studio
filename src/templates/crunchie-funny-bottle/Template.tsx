import type { CSSProperties } from 'react'
import { MultiColorTitle } from '../shared/MultiColorTitle.tsx'
import { bubble, pastelBackground, starburst, wavyBand } from '../shared/shapes.ts'
import { fitText } from '../shared/fitText.ts'
import type { Editable } from '../types.ts'
import type { CrunchieFields } from './index.tsx'

const abs = (left: number, top: number, width: number, height: number, extra: CSSProperties = {}): CSSProperties => ({
  position: 'absolute',
  left,
  top,
  width,
  height,
  display: 'flex',
  ...extra,
})

const center: CSSProperties = { alignItems: 'center', justifyContent: 'center', textAlign: 'center' }

/** Bulle de texte inclinée : forme SVG + texte en majuscules, taille ajustée. */
function Bubble({
  e,
  field,
  colorField,
  text,
  color,
  box,
  rotation,
}: {
  e: Editable
  field: string
  colorField: string
  text: string
  color: string
  box: [number, number, number, number]
  rotation: number
}) {
  if (text.trim() === '' && !e.editing) return null
  const [left, top, width, height] = box
  const size = fitText(text, { width: width - 56, max: 34, min: 16, lines: 4, charWidth: 0.72 })
  return e.region([colorField], abs(left, top, width, height, { transform: `rotate(${rotation}deg)` }), [
    <img key="shape" src={bubble(width, height, color)} alt="" style={abs(0, 0, width, height)} />,
    e.text(field, abs(22, 18, width - 44, height - 36, {
      ...center,
      fontFamily: 'Fredoka',
      fontWeight: 600,
      fontSize: size,
      lineHeight: 1,
      color,
      textTransform: 'uppercase',
      whiteSpace: 'pre-wrap',
    }), { colors: [colorField] }),
  ])
}

export function Template({ values: v, e }: { values: CrunchieFields; e: Editable }) {
  const thumbs = (['thumb1', 'thumb2', 'thumb3', 'thumb4'] as const).filter((k) => v[k] !== '' || e.editing).slice(0, 4)
  const thumbSize = thumbs.length > 3 ? 150 : 175
  const priceSize = fitText(v.price, { width: 300, max: 100, min: 60, charWidth: 0.58 })

  return (
    <div style={{ display: 'flex', position: 'relative', width: 1080, height: 1080, overflow: 'hidden', fontFamily: 'Fredoka' }}>
      {/* Fond de boutique (photo fournie) ou dégradé pastel par défaut */}
      {v.background !== ''
        ? e.image('background', abs(0, 0, 1080, 1080, { objectFit: 'cover' }))
        : e.region([], abs(0, 0, 1080, 1080), <img src={pastelBackground(1080, 1080)} alt="" style={abs(0, 0, 1080, 1080)} />)}

      {/* Adresse du site, en haut */}
      {e.text('url', abs(15, 18, 1050, 75, {
        ...center,
        fontSize: fitText(v.url, { width: 1040, max: 63, min: 30, charWidth: 0.66 }),
        fontWeight: 700,
        color: '#fff6fc',
        textTransform: 'uppercase',
        textShadow: '0 4px 0 #f82da1, 0 0 10px rgba(0,0,0,0.25)',
      }))}

      {/* Titre multicolore */}
      {e.text('title', abs(10, 92, 1060, 250, { justifyContent: 'center', alignItems: 'flex-start', fontWeight: 700 }), {
        display: (
          <MultiColorTitle
            title={v.title}
            colors={[v.titleColor1, v.titleColor2, v.titleColor3]}
            width={1040}
            height={250}
            first={{ max: 165, min: 80 }}
            rest={{ max: 110, min: 48 }}
            stroke="#ffffff"
          />
        ),
        colors: ['titleColor1', 'titleColor2', 'titleColor3'],
      })}

      {/* Photo principale (détourée) */}
      {e.image('photo', abs(250, 330, 500, 640, { objectFit: 'contain' }))}

      {/* Colonne de droite : une vignette par couleur */}
      <div style={abs(870, 330, 200, 600, { flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' })}>
        {thumbs.map((k) => (
          <div key={k} style={{ display: 'flex', width: thumbSize, height: thumbSize, marginBottom: 8 }}>
            {e.image(k, { width: thumbSize, height: thumbSize, objectFit: 'contain' })}
          </div>
        ))}
      </div>

      {/* Bulles : 2 points forts, puis couleurs (ou 3e point fort) */}
      <Bubble e={e} field="bubble1" colorField="bubble1Color" text={v.bubble1} color={v.bubble1Color} box={[0, 345, 253, 186]} rotation={-7.6} />
      <Bubble e={e} field="bubble2" colorField="bubble2Color" text={v.bubble2} color={v.bubble2Color} box={[118, 530, 210, 190]} rotation={6.3} />
      <Bubble e={e} field="bubble3" colorField="bubble3Color" text={v.bubble3} color={v.bubble3Color} box={[10, 737, 250, 204]} rotation={-4.3} />

      {/* Prix dans l'étoile */}
      {e.region(['starColor'], abs(725, 740, 355, 275), [
        <img key="star" src={starburst(355, 275, v.starColor)} alt="" style={abs(0, 0, 355, 275)} />,
        <div key="price" style={abs(10, 30, 335, 215, { ...center, flexDirection: 'column', transform: 'rotate(9deg)' })}>
          {v.compareAtPrice !== '' &&
            e.text('compareAtPrice', {
              fontSize: 44,
              fontWeight: 600,
              color: '#ffffff',
              textDecoration: 'line-through',
              opacity: 0.9,
            })}
          {e.text('price', { fontSize: priceSize, fontWeight: 700, color: '#ffffff', lineHeight: 0.9, textShadow: '0 3px 0 rgba(0,0,0,0.18)' })}
        </div>,
      ])}

      {/* Bandeau et pied de page */}
      {e.region(['bandColor'], abs(0, 961, 1080, 119), [
        <img key="band" src={wavyBand(1080, 119, v.bandColor)} alt="" style={abs(0, 0, 1080, 119)} />,
      ])}
      {e.text('footer', abs(110, 985, 860, 90, {
        ...center,
        fontFamily: 'Poppins',
        fontWeight: 600,
        fontSize: fitText(v.footer, { width: 860, max: 37, min: 20, lines: 2, charWidth: 0.56 }),
        lineHeight: 1.05,
        color: '#ffffff',
      }), { colors: ['bandColor'] })}
    </div>
  )
}
