import fredoka600 from '@fontsource/fredoka/files/fredoka-latin-600-normal.woff?url'
import fredoka700 from '@fontsource/fredoka/files/fredoka-latin-700-normal.woff?url'
import poppins600 from '@fontsource/poppins/files/poppins-latin-600-normal.woff?url'
import { z } from 'zod'
import { color, image, text } from '../fields.ts'
import { colorsSentence, formatPrice, host, thumbnails } from '../shared/format.ts'
import type { TemplateDefinition } from '../types.ts'
import { Template } from './Template.tsx'

// Reproduit le design Canva « Publication Instagram Crunchie Funny Bottle » (1080×1080).
// Polices : Fredoka et Poppins (libres, OFL) à la place des polices Canva.
export const fields = z.object({
  background: image('Fond de boutique', { scope: 'template' }),
  url: text('Adresse du site (haut)', 'lecoffreauxjouetsettresors.com', { scope: 'template' }),
  title: text('Titre', 'Nom du produit'),
  titleColor1: color('Titre : 1er mot', '#ff3bbc'),
  titleColor2: color('Titre : mots pairs', '#079cf8'),
  titleColor3: color('Titre : mots impairs', '#9d39cc'),
  photo: image('Photo principale', { cutout: true }),
  thumb1: image('Vignette 1', { cutout: true }),
  thumb2: image('Vignette 2', { cutout: true }),
  thumb3: image('Vignette 3', { cutout: true }),
  thumb4: image('Vignette 4', { cutout: true }),
  bubble1: text('Point fort 1', '', { multiline: true }),
  bubble1Color: color('Bulle 1', '#f82da1'),
  bubble2: text('Point fort 2', '', { multiline: true }),
  bubble2Color: color('Bulle 2', '#079cf8'),
  bubble3: text('Couleurs ou point fort 3', '', { multiline: true }),
  bubble3Color: color('Bulle 3', '#9d39cc'),
  price: text('Prix', '0.00$'),
  compareAtPrice: text('Prix barré', ''),
  starColor: color('Étoile du prix', '#5fd43a'),
  footer: text('Pied de page', 'lecoffreauxjouetsettresors.com | 761 Blvd. Sir-Wilfrid-Laurier, McMasterville, Quebec J3G 0K5', {
    scope: 'template',
    multiline: true,
  }),
  bandColor: color('Bandeau', '#ff4f9a', { scope: 'template' }),
})

export type CrunchieFields = z.infer<typeof fields>

export const crunchieFunnyBottle: TemplateDefinition<typeof fields> = {
  id: 'crunchie-funny-bottle',
  name: 'Crunchie Funny Bottle',
  source: 'https://www.canva.com/d/atWU7EQj7GMuM4A',
  size: { width: 1080, height: 1080 },
  fonts: [
    { name: 'Fredoka', url: fredoka600, weight: 600 },
    { name: 'Fredoka', url: fredoka700, weight: 700 },
    { name: 'Poppins', url: poppins600, weight: 600 },
  ],
  products: { min: 1, max: 1 },
  fields,
  async fromProducts([product], { shop, ai }) {
    if (product === undefined) return {}
    const colors = colorsSentence(product)
    // Sans option couleur, la 3e bulle prend un 3e point fort.
    const wanted = colors === '' ? 3 : 2
    const highlights = ai ? await ai.highlights(product, wanted).catch(() => []) : []
    const [t1, t2, t3, t4] = thumbnails(product, 4)
    return {
      url: host(shop.url),
      title: product.title,
      photo: product.featuredImage?.url ?? product.images[0]?.url ?? '',
      thumb1: t1 ?? '',
      thumb2: t2 ?? '',
      thumb3: t3 ?? '',
      thumb4: t4 ?? '',
      bubble1: highlights[0] ?? '',
      bubble2: highlights[1] ?? '',
      bubble3: colors !== '' ? colors : (highlights[2] ?? ''),
      price: formatPrice(product.price),
      compareAtPrice: product.compareAtPrice ? formatPrice(product.compareAtPrice) : '',
    }
  },
  render: (values, e) => <Template values={values} e={e} />,
}
