import { describe, expect, it } from 'vitest'
import { MockAdapter } from '@/lib/commerce/adapters/mock'
import { parseCollectionParams } from '@/lib/commerce/collection'

const adapter = new MockAdapter()
const titles = (r: Awaited<ReturnType<typeof adapter.getCollection>>) => r!.products.map((p) => p.title)

describe('parseCollectionParams', () => {
  it('defaults to best selling with no filters', () => {
    expect(parseCollectionParams({})).toEqual({
      sortBy: 'best-selling',
      query: { sortKey: 'BEST_SELLING', reverse: false, filters: [] },
    })
  })

  it('maps Shopify-style params to Storefront ProductFilter inputs', () => {
    const { sortBy, query } = parseCollectionParams({
      sort_by: 'price-descending',
      'filter.v.availability': '1',
      'filter.p.product_type': ['Ceramics', 'Home'],
      'filter.v.option.color': 'Sand',
    })
    expect(sortBy).toBe('price-descending')
    expect(query.sortKey).toBe('PRICE')
    expect(query.reverse).toBe(true)
    expect(query.filters).toEqual([
      { available: true },
      { productType: 'Ceramics' },
      { productType: 'Home' },
      { variantOption: { name: 'Color', value: 'Sand' } },
    ])
  })

  it('ignores unknown sort values', () => {
    expect(parseCollectionParams({ sort_by: 'bogus' }).sortBy).toBe('best-selling')
  })
})

describe('MockAdapter.getCollection', () => {
  it('returns null for an unknown collection', async () => {
    expect(await adapter.getCollection('nope')).toBeNull()
  })

  it('sorts by price ascending using the minimum variant price', async () => {
    const r = await adapter.getCollection('all', { sortKey: 'PRICE' })
    const prices = r!.products.map((p) => Number(p.priceRange.minVariantPrice.amount))
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
    expect(r!.products[0]!.title).toBe('Stoneware Bowl') // $22, the cheapest item in the seed data
  })

  it('sorts newest first with CREATED + reverse', async () => {
    const r = await adapter.getCollection('all', { sortKey: 'CREATED', reverse: true })
    expect(titles(r)[0]).toBe('Tidewater Pour-Over Set')
  })

  it('ORs values within a facet and ANDs across facets', async () => {
    const r = await adapter.getCollection('all', {
      filters: [
        { productType: 'Ceramics' },
        { productType: 'Home' },
        { variantOption: { name: 'Color', value: 'Slate' } },
      ],
    })
    // Ceramics or Home, *and* offered in Slate. The candle (Home) has no Slate.
    expect(titles(r).sort()).toEqual(['Harbor Mug', 'Stoneware Bowl', 'Tidewater Pour-Over Set'])
  })

  it('excludes sold-out products with the availability filter', async () => {
    const r = await adapter.getCollection('all', { filters: [{ available: true }] })
    expect(titles(r)).not.toContain('Merino Beanie')
    expect(r!.products).toHaveLength(8)
  })

  it('computes facet counts over the unfiltered collection', async () => {
    const r = await adapter.getCollection('ceramics', { filters: [{ variantOption: { name: 'Size', value: 'Large' } }] })
    const color = r!.filters.find((f) => f.label === 'Color')!
    expect(color.values.map((v) => [v.label, v.count])).toEqual([
      ['Sand', 3],
      ['Slate', 3],
      ['Moss', 1],
    ])
  })
})
