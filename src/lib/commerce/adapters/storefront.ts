/**
 * Shopify Storefront API adapter (reference implementation).
 *
 * Enable it with `COMMERCE_ADAPTER=storefront` plus the variables in `.env.example`.
 * The queries below request exactly the fields declared in `../types.ts`, so API
 * responses flow into the UI without a mapping layer; the only transformation is
 * unwrapping the GraphQL envelope and parsing facet `input` JSON.
 *
 * Status: the request/response plumbing is covered by unit tests with a mocked
 * `fetch` (tests/unit/storefront-adapter.test.ts). It has not been run against a live
 * store as part of this repo; see "Swapping in the Storefront API" in the README.
 *
 * Notes for a real store:
 * - `quantityAvailable` needs the `unauthenticated_read_product_inventory` scope.
 *   Drop it from VARIANT_FIELDS if your token doesn't have it.
 * - `/collections/all` is virtual in Liquid themes but not in the Storefront API.
 *   Create an automated collection with the handle `all` (condition: price > 0).
 */
import type { CommerceAdapter } from '../adapter'
import type {
  CollectionQuery,
  CollectionResult,
  FilterFacet,
  Product,
  ProductFilter,
} from '../types'

// ---------------------------------------------------------------------------
// GraphQL documents
// ---------------------------------------------------------------------------

const IMAGE_FIELDS = /* GraphQL */ `
  fragment ImageFields on Image {
    id
    url
    altText
    width
    height
  }
`

const PRODUCT_FIELDS = /* GraphQL */ `
  fragment ProductFields on Product {
    id
    handle
    title
    description
    descriptionHtml
    vendor
    productType
    tags
    availableForSale
    createdAt
    options {
      id
      name
      optionValues {
        id
        name
        swatch {
          color
        }
      }
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      ...ImageFields
    }
    images(first: 20) {
      nodes {
        ...ImageFields
      }
    }
    variants(first: 250) {
      nodes {
        id
        title
        sku
        availableForSale
        quantityAvailable
        selectedOptions {
          name
          value
        }
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        image {
          ...ImageFields
        }
      }
    }
  }
  ${IMAGE_FIELDS}
`

export const COLLECTION_QUERY = /* GraphQL */ `
  query CollectionProducts(
    $handle: String!
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $filters: [ProductFilter!]
    $first: Int = 48
  ) @inContext(country: US, language: EN) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      products(first: $first, sortKey: $sortKey, reverse: $reverse, filters: $filters) {
        filters {
          id
          label
          values {
            id
            label
            count
            input
          }
        }
        nodes {
          ...ProductFields
        }
      }
    }
  }
  ${PRODUCT_FIELDS}
`

export const PRODUCT_QUERY = /* GraphQL */ `
  query Product($handle: String!) @inContext(country: US, language: EN) {
    product(handle: $handle) {
      ...ProductFields
    }
  }
  ${PRODUCT_FIELDS}
`

export const PRODUCT_HANDLES_QUERY = /* GraphQL */ `
  query ProductHandles {
    products(first: 250) {
      nodes {
        handle
      }
    }
  }
`

export const MENU_QUERY = /* GraphQL */ `
  query Menu {
    collections(first: 10, sortKey: TITLE) {
      nodes {
        handle
        title
      }
    }
  }
`

/**
 * Not used yet: the cart lives in localStorage (see src/components/cart). To move it
 * server-side, call cartCreate once, persist the returned cart id instead of the
 * lines, and replace CartProvider's reducer with these mutations.
 */
export const CART_CREATE_MUTATION = /* GraphQL */ `
  mutation CartCreate($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) {
      cart {
        id
        checkoutUrl
        totalQuantity
      }
      userErrors {
        field
        message
      }
    }
  }
`

export const CART_LINES_ADD_MUTATION = /* GraphQL */ `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
        totalQuantity
      }
      userErrors {
        field
        message
      }
    }
  }
`

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export interface StorefrontConfig {
  storeDomain: string
  accessToken: string
  apiVersion: string
  /** Injected in tests. Defaults to the global fetch (which Next.js extends with caching). */
  fetch?: typeof fetch
  /** Seconds to cache GET-able responses in the Next.js data cache. */
  revalidate?: number
}

type Env = Record<string, string | undefined>

interface RawCollectionResponse {
  collection:
    | (CollectionResult['collection'] & {
        products: {
          filters: (Omit<FilterFacet, 'values'> & {
            values: (Omit<FilterFacet['values'][number], 'input'> & { input: string })[]
          })[]
          nodes: Product[]
        }
      })
    | null
}

export class StorefrontApiAdapter implements CommerceAdapter {
  readonly name = 'Shopify Storefront API'
  private readonly endpoint: string

  constructor(private readonly config: StorefrontConfig) {
    this.endpoint = `https://${config.storeDomain}/api/${config.apiVersion}/graphql.json`
  }

  static fromEnv(env: Env): StorefrontApiAdapter {
    const storeDomain = env.SHOPIFY_STORE_DOMAIN
    const accessToken = env.SHOPIFY_STOREFRONT_ACCESS_TOKEN
    if (!storeDomain || !accessToken) {
      throw new Error(
        'COMMERCE_ADAPTER=storefront requires SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN. ' +
          'Copy .env.example to .env.local and fill them in, or unset COMMERCE_ADAPTER to use the mock catalog.',
      )
    }
    return new StorefrontApiAdapter({
      storeDomain: storeDomain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
      accessToken,
      apiVersion: env.SHOPIFY_STOREFRONT_API_VERSION || '2025-07',
    })
  }

  private async request<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const doFetch = this.config.fetch ?? fetch
    const res = await doFetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': this.config.accessToken,
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: this.config.revalidate ?? 300, tags: ['shopify'] },
    } as RequestInit)
    if (!res.ok) throw new Error(`Storefront API responded ${res.status} ${res.statusText}`)
    const json = (await res.json()) as { data?: T; errors?: { message: string }[] }
    if (json.errors?.length) {
      throw new Error(`Storefront API error: ${json.errors.map((e) => e.message).join('; ')}`)
    }
    if (!json.data) throw new Error('Storefront API returned no data')
    return json.data
  }

  async getCollection(handle: string, query: CollectionQuery = {}): Promise<CollectionResult | null> {
    const data = await this.request<RawCollectionResponse>(COLLECTION_QUERY, {
      handle,
      sortKey: query.sortKey ?? 'MANUAL',
      reverse: query.reverse ?? false,
      filters: query.filters ?? [],
    })
    if (!data.collection) return null
    const { products, ...collection } = data.collection
    return {
      collection,
      products: products.nodes,
      filters: products.filters.map((f) => ({
        ...f,
        values: f.values.map((v) => ({ ...v, input: JSON.parse(v.input) as ProductFilter })),
      })),
    }
  }

  async getProduct(handle: string): Promise<Product | null> {
    const data = await this.request<{ product: Product | null }>(PRODUCT_QUERY, { handle })
    return data.product
  }

  async getProductHandles(): Promise<string[]> {
    const data = await this.request<{ products: { nodes: { handle: string }[] } }>(PRODUCT_HANDLES_QUERY)
    return data.products.nodes.map((n) => n.handle)
  }

  async getMenu() {
    const data = await this.request<{ collections: { nodes: { handle: string; title: string }[] } }>(MENU_QUERY)
    return data.collections.nodes
  }
}
