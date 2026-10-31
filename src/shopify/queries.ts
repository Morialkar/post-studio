import { z } from 'zod'

const image = z.object({
  url: z.string(),
  altText: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
})
const money = z.object({ amount: z.string(), currencyCode: z.string() })

const IMAGE = 'url altText width height'

export const SHOP_QUERY = `query Shop { shop { name primaryDomain { url } } }`
export const shopResponse = z.object({
  shop: z.object({ name: z.string(), primaryDomain: z.object({ url: z.string() }) }),
})

export const SEARCH_QUERY = `query Search($term: String, $first: Int!, $country: CountryCode, $language: LanguageCode)
@inContext(country: $country, language: $language) {
  products(first: $first, query: $term, sortKey: RELEVANCE) {
    nodes {
      id handle title availableForSale
      featuredImage { ${IMAGE} }
      priceRange { minVariantPrice { amount currencyCode } }
    }
  }
}`
export const searchHit = z.object({
  id: z.string(),
  handle: z.string(),
  title: z.string(),
  availableForSale: z.boolean(),
  featuredImage: image.nullable(),
  priceRange: z.object({ minVariantPrice: money }),
})
export type SearchHit = z.infer<typeof searchHit>
export const searchResponse = z.object({ products: z.object({ nodes: z.array(searchHit) }) })

export const PRODUCT_QUERY = `query Product($handle: String!, $country: CountryCode, $language: LanguageCode)
@inContext(country: $country, language: $language) {
  product(handle: $handle) {
    id handle title description onlineStoreUrl availableForSale
    featuredImage { ${IMAGE} }
    images(first: 20) { nodes { ${IMAGE} } }
    options { name optionValues { name } }
    variants(first: 100) {
      nodes {
        availableForSale
        selectedOptions { name value }
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
        image { ${IMAGE} }
      }
    }
  }
}`
export const rawProduct = z.object({
  id: z.string(),
  handle: z.string(),
  title: z.string(),
  description: z.string(),
  onlineStoreUrl: z.string().nullable(),
  availableForSale: z.boolean(),
  featuredImage: image.nullable(),
  images: z.object({ nodes: z.array(image) }),
  options: z.array(z.object({ name: z.string(), optionValues: z.array(z.object({ name: z.string() })) })),
  variants: z.object({
    nodes: z.array(
      z.object({
        availableForSale: z.boolean(),
        selectedOptions: z.array(z.object({ name: z.string(), value: z.string() })),
        price: money,
        compareAtPrice: money.nullable(),
        image: image.nullable(),
      }),
    ),
  }),
})
export type RawProduct = z.infer<typeof rawProduct>
export const productResponse = z.object({ product: rawProduct.nullable() })
