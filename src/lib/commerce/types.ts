/**
 * Storefront API–shaped types.
 *
 * These mirror the subset of the Shopify Storefront GraphQL schema this app reads
 * (field names, nesting and scalar encodings are kept identical, e.g. MoneyV2.amount
 * is a decimal *string*). Connections are flattened to `{ nodes }`, which is what the
 * queries in `adapters/storefront.ts` request, so a real API response can be passed
 * straight through without a mapping layer.
 */

export type CurrencyCode = 'USD'

/** https://shopify.dev/docs/api/storefront/latest/objects/MoneyV2 */
export interface MoneyV2 {
  amount: string
  currencyCode: CurrencyCode
}

/** https://shopify.dev/docs/api/storefront/latest/objects/Image */
export interface Image {
  id: string
  url: string
  altText: string | null
  width: number
  height: number
}

/** https://shopify.dev/docs/api/storefront/latest/objects/SelectedOption */
export interface SelectedOption {
  name: string
  value: string
}

/** https://shopify.dev/docs/api/storefront/latest/objects/ProductOptionValue */
export interface ProductOptionValue {
  id: string
  name: string
  swatch: { color: string | null } | null
}

/** https://shopify.dev/docs/api/storefront/latest/objects/ProductOption */
export interface ProductOption {
  id: string
  name: string
  optionValues: ProductOptionValue[]
}

/** https://shopify.dev/docs/api/storefront/latest/objects/ProductVariant */
export interface ProductVariant {
  id: string
  title: string
  sku: string | null
  availableForSale: boolean
  quantityAvailable: number | null
  selectedOptions: SelectedOption[]
  price: MoneyV2
  compareAtPrice: MoneyV2 | null
  image: Image | null
}

/** https://shopify.dev/docs/api/storefront/latest/objects/Product */
export interface Product {
  id: string
  handle: string
  title: string
  description: string
  descriptionHtml: string
  vendor: string
  productType: string
  tags: string[]
  availableForSale: boolean
  createdAt: string
  options: ProductOption[]
  priceRange: { minVariantPrice: MoneyV2; maxVariantPrice: MoneyV2 }
  featuredImage: Image | null
  images: { nodes: Image[] }
  variants: { nodes: ProductVariant[] }
}

/** https://shopify.dev/docs/api/storefront/latest/objects/Collection */
export interface Collection {
  id: string
  handle: string
  title: string
  description: string
}

/** https://shopify.dev/docs/api/storefront/latest/enums/ProductCollectionSortKeys */
export type ProductCollectionSortKey = 'MANUAL' | 'BEST_SELLING' | 'TITLE' | 'PRICE' | 'CREATED'

/**
 * https://shopify.dev/docs/api/storefront/latest/input-objects/ProductFilter
 * Multiple filters are ANDed across keys and ORed within the same key, which is how
 * Shopify's Search & Discovery filters behave.
 */
export type ProductFilter =
  | { available: boolean }
  | { productType: string }
  | { variantOption: { name: string; value: string } }
  | { price: { min?: number; max?: number } }

/** https://shopify.dev/docs/api/storefront/latest/objects/Filter (trimmed) */
export interface FilterFacet {
  id: string
  label: string
  values: { id: string; label: string; count: number; input: ProductFilter }[]
}

export interface CollectionQuery {
  sortKey?: ProductCollectionSortKey
  reverse?: boolean
  filters?: ProductFilter[]
}

export interface CollectionResult {
  collection: Collection
  products: Product[]
  /** Facets computed over the *unfiltered* collection, like Shopify's `products.filters`. */
  filters: FilterFacet[]
}
