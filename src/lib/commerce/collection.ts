/**
 * Collection filtering, sorting and URL state. Pure functions, no framework imports,
 * so they're shared by the mock adapter, the collection page and the unit tests.
 *
 * URL parameters follow Shopify Online Store conventions (`sort_by=price-ascending`,
 * `filter.v.option.color=Sand`, `filter.p.product_type=Ceramics`,
 * `filter.v.availability=1`), which keeps links meaningful to anyone who has worked
 * on a Liquid theme and makes a later migration of saved links painless.
 */
import type {
  CollectionQuery,
  FilterFacet,
  Product,
  ProductCollectionSortKey,
  ProductFilter,
} from './types'

export const SORT_OPTIONS = [
  { value: 'best-selling', label: 'Best selling', sortKey: 'BEST_SELLING', reverse: false },
  { value: 'created-descending', label: 'Newest', sortKey: 'CREATED', reverse: true },
  { value: 'price-ascending', label: 'Price, low to high', sortKey: 'PRICE', reverse: false },
  { value: 'price-descending', label: 'Price, high to low', sortKey: 'PRICE', reverse: true },
  { value: 'title-ascending', label: 'Alphabetically, A–Z', sortKey: 'TITLE', reverse: false },
] as const satisfies readonly {
  value: string
  label: string
  sortKey: ProductCollectionSortKey
  reverse: boolean
}[]

export type SortValue = (typeof SORT_OPTIONS)[number]['value']
export const DEFAULT_SORT: SortValue = 'best-selling'

/** Option names exposed as facets, in display order. */
const FACET_OPTIONS = ['Color', 'Size']

const AVAILABILITY_PARAM = 'filter.v.availability'
const TYPE_PARAM = 'filter.p.product_type'
const OPTION_PARAM_PREFIX = 'filter.v.option.'

type SearchParams = Record<string, string | string[] | undefined>

const asArray = (v: string | string[] | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v]

/** Maps a ProductFilter to the URL parameter that represents it. */
export function filterToParam(filter: ProductFilter): [string, string] | null {
  if ('available' in filter) return filter.available ? [AVAILABILITY_PARAM, '1'] : null
  if ('productType' in filter) return [TYPE_PARAM, filter.productType]
  if ('variantOption' in filter) {
    return [OPTION_PARAM_PREFIX + filter.variantOption.name.toLowerCase(), filter.variantOption.value]
  }
  return null
}

/** Parses `searchParams` into a Storefront-style query. Unknown values are ignored. */
export function parseCollectionParams(params: SearchParams): {
  sortBy: SortValue
  query: CollectionQuery
} {
  const requested = asArray(params.sort_by)[0]
  const sort = SORT_OPTIONS.find((o) => o.value === requested) ?? SORT_OPTIONS[0]
  const filters: ProductFilter[] = []

  if (asArray(params[AVAILABILITY_PARAM]).includes('1')) filters.push({ available: true })
  for (const t of asArray(params[TYPE_PARAM])) filters.push({ productType: t })
  for (const name of FACET_OPTIONS) {
    for (const value of asArray(params[OPTION_PARAM_PREFIX + name.toLowerCase()])) {
      filters.push({ variantOption: { name, value } })
    }
  }
  return { sortBy: sort.value, query: { sortKey: sort.sortKey, reverse: sort.reverse, filters } }
}

const minPrice = (p: Product) => Number(p.priceRange.minVariantPrice.amount)

function matches(product: Product, filter: ProductFilter): boolean {
  if ('available' in filter) return product.availableForSale === filter.available
  if ('productType' in filter) return product.productType === filter.productType
  if ('variantOption' in filter) {
    const { name, value } = filter.variantOption
    return product.variants.nodes.some((v) =>
      v.selectedOptions.some((o) => o.name === name && o.value === value),
    )
  }
  const price = minPrice(product)
  return price >= (filter.price.min ?? 0) && price <= (filter.price.max ?? Infinity)
}

const filterGroup = (f: ProductFilter): string =>
  'variantOption' in f ? `option:${f.variantOption.name}` : Object.keys(f)[0]!

/**
 * Applies filters (OR within a facet, AND across facets, as Shopify does) and sorting.
 * Ties fall back to the original (manual) order so results are stable.
 */
export function applyCollectionQuery(
  products: Product[],
  { sortKey = 'MANUAL', reverse = false, filters = [] }: CollectionQuery,
  salesRank: ReadonlyMap<string, number> = new Map(),
): Product[] {
  const groups = new Map<string, ProductFilter[]>()
  for (const f of filters) groups.set(filterGroup(f), [...(groups.get(filterGroup(f)) ?? []), f])

  const filtered = products.filter((p) =>
    [...groups.values()].every((group) => group.some((f) => matches(p, f))),
  )

  const compare: Record<ProductCollectionSortKey, (a: Product, b: Product) => number> = {
    MANUAL: () => 0,
    BEST_SELLING: (a, b) => (salesRank.get(a.handle) ?? 1e9) - (salesRank.get(b.handle) ?? 1e9),
    TITLE: (a, b) => a.title.localeCompare(b.title),
    PRICE: (a, b) => minPrice(a) - minPrice(b),
    CREATED: (a, b) => a.createdAt.localeCompare(b.createdAt),
  }
  const direction = reverse ? -1 : 1
  return filtered
    .map((p, i) => ({ p, i }))
    .sort((a, b) => direction * compare[sortKey](a.p, b.p) || a.i - b.i)
    .map(({ p }) => p)
}

/** Facet counts over the unfiltered collection, shaped like the Storefront `Filter` object. */
export function facetsFor(products: Product[]): FilterFacet[] {
  const facets: FilterFacet[] = []

  const inStock = products.filter((p) => p.availableForSale).length
  facets.push({
    id: AVAILABILITY_PARAM,
    label: 'Availability',
    values: [{ id: `${AVAILABILITY_PARAM}.1`, label: 'In stock', count: inStock, input: { available: true } }],
  })

  const types = countBy(products.map((p) => [p.productType]))
  if (types.size > 1) {
    facets.push({
      id: TYPE_PARAM,
      label: 'Product type',
      values: [...types].map(([label, count]) => ({
        id: `${TYPE_PARAM}.${label.toLowerCase()}`,
        label,
        count,
        input: { productType: label },
      })),
    })
  }

  for (const name of FACET_OPTIONS) {
    // Count products (not variants) offering each value, preserving option order.
    const counts = countBy(
      products.map((p) => [
        ...new Set(p.variants.nodes.flatMap((v) => v.selectedOptions.filter((o) => o.name === name).map((o) => o.value))),
      ]),
    )
    if (counts.size === 0) continue
    const id = OPTION_PARAM_PREFIX + name.toLowerCase()
    facets.push({
      id,
      label: name,
      values: [...counts].map(([label, count]) => ({
        id: `${id}.${label.toLowerCase().replace(/\s+/g, '-')}`,
        label,
        count,
        input: { variantOption: { name, value: label } },
      })),
    })
  }
  return facets
}

function countBy(lists: string[][]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const list of lists) for (const v of list) counts.set(v, (counts.get(v) ?? 0) + 1)
  return counts
}
