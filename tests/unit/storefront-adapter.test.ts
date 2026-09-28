import { describe, expect, it, vi } from 'vitest'
import { COLLECTION_QUERY, PRODUCT_QUERY, StorefrontApiAdapter } from '@/lib/commerce/adapters/storefront'
import { MOCK_PRODUCTS } from '@/lib/commerce/mock/build'

function adapterReturning(data: unknown, init: ResponseInit = { status: 200 }) {
  const fetch = vi.fn(async () => new Response(JSON.stringify(data), init))
  const adapter = new StorefrontApiAdapter({
    storeDomain: 'shop.example.com',
    accessToken: 'test-token',
    apiVersion: '2025-07',
    fetch: fetch as unknown as typeof globalThis.fetch,
  })
  return { adapter, fetch }
}

describe('StorefrontApiAdapter', () => {
  it('requires store domain and token from env', () => {
    expect(() => StorefrontApiAdapter.fromEnv({})).toThrow(/SHOPIFY_STORE_DOMAIN/)
    expect(StorefrontApiAdapter.fromEnv({ SHOPIFY_STORE_DOMAIN: 'x', SHOPIFY_STOREFRONT_ACCESS_TOKEN: 'y' }).name).toBe(
      'Shopify Storefront API',
    )
  })

  it('POSTs the product query to the versioned endpoint with the storefront token', async () => {
    const product = MOCK_PRODUCTS[0]!
    const { adapter, fetch } = adapterReturning({ data: { product } })
    expect(await adapter.getProduct(product.handle)).toEqual(product)

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://shop.example.com/api/2025-07/graphql.json')
    expect((init.headers as Record<string, string>)['X-Shopify-Storefront-Access-Token']).toBe('test-token')
    expect(JSON.parse(init.body as string)).toEqual({ query: PRODUCT_QUERY, variables: { handle: product.handle } })
  })

  it('passes sort and filters through and parses facet input JSON', async () => {
    const { adapter, fetch } = adapterReturning({
      data: {
        collection: {
          id: 'gid://shopify/Collection/1',
          handle: 'all',
          title: 'All',
          description: '',
          products: {
            nodes: MOCK_PRODUCTS.slice(0, 2),
            filters: [
              {
                id: 'filter.v.availability',
                label: 'Availability',
                values: [{ id: 'filter.v.availability.1', label: 'In stock', count: 2, input: '{"available":true}' }],
              },
            ],
          },
        },
      },
    })
    const result = await adapter.getCollection('all', { sortKey: 'PRICE', reverse: true, filters: [{ available: true }] })
    expect(result?.products).toHaveLength(2)
    expect(result?.filters[0]?.values[0]?.input).toEqual({ available: true })

    const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body.query).toBe(COLLECTION_QUERY)
    expect(body.variables).toEqual({ handle: 'all', sortKey: 'PRICE', reverse: true, filters: [{ available: true }] })
  })

  it('surfaces GraphQL errors and HTTP failures', async () => {
    await expect(adapterReturning({ errors: [{ message: 'Throttled' }] }).adapter.getProduct('x')).rejects.toThrow(
      'Throttled',
    )
    await expect(adapterReturning({}, { status: 401 }).adapter.getProduct('x')).rejects.toThrow('401')
  })
})
