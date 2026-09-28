import Link from 'next/link'
import { filterToParam, parseCollectionParams, DEFAULT_SORT } from '@/lib/commerce/collection'
import type { CollectionResult } from '@/lib/commerce/types'
import { FilterBar } from './FilterBar'
import { ProductCard } from './ProductCard'
import styles from './CollectionView.module.css'

type SearchParams = Record<string, string | string[] | undefined>

interface Props {
  result: CollectionResult
  searchParams: SearchParams
  /** Path the filter form submits to. */
  path: string
}

export function CollectionView({ result, searchParams, path }: Props) {
  const { sortBy, query } = parseCollectionParams(searchParams)
  const { collection, products, filters: facets } = result

  // Applied filters as URL params, for the form state and the removable chips.
  const active: Record<string, string[]> = {}
  const chips: { key: string; label: string; href: string }[] = []
  for (const filter of query.filters ?? []) {
    const param = filterToParam(filter)
    if (!param) continue
    const [name, value] = param
    active[name] = [...(active[name] ?? []), value]
  }
  const hrefWithout = (name: string, value: string) => {
    const qs = new URLSearchParams()
    if (sortBy !== DEFAULT_SORT) qs.set('sort_by', sortBy)
    for (const [n, values] of Object.entries(active)) {
      for (const v of values) if (!(n === name && v === value)) qs.append(n, v)
    }
    const s = qs.toString()
    return s ? `${path}?${s}` : path
  }
  for (const facet of facets) {
    for (const value of facet.values) {
      const param = filterToParam(value.input)
      if (param && active[param[0]]?.includes(param[1])) {
        chips.push({ key: value.id, label: `${facet.label}: ${value.label}`, href: hrefWithout(...param) })
      }
    }
  }
  const clearHref = sortBy === DEFAULT_SORT ? path : `${path}?sort_by=${sortBy}`

  return (
    <div className="container">
      <header className={styles.intro}>
        <h1 className={styles.title}>{collection.title}</h1>
        {collection.description && <p className={styles.description}>{collection.description}</p>}
      </header>

      <FilterBar action={path} facets={facets} sortBy={sortBy} active={active} resultCount={products.length} />

      {chips.length > 0 && (
        <ul className={styles.chips} aria-label="Active filters">
          {chips.map((chip) => (
            <li key={chip.key}>
              <Link href={chip.href} scroll={false} replace className={styles.chip} aria-label={`Remove filter ${chip.label}`}>
                {chip.label}
                <span aria-hidden="true">×</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href={clearHref} scroll={false} replace className={styles.clear}>
              Clear all
            </Link>
          </li>
        </ul>
      )}

      <h2 className="visually-hidden">Products</h2>
      {products.length > 0 ? (
        <ul className={styles.grid} data-testid="product-grid">
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} eager={i < 4} />
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          <p>No products match these filters.</p>
          <Link href={clearHref} className="button button--ghost" scroll={false} replace>
            Clear filters
          </Link>
        </div>
      )}
    </div>
  )
}
