import type { CommerceAdapter } from '../adapter'
import { applyCollectionQuery, facetsFor } from '../collection'
import { MOCK_PRODUCTS, SALES_RANK } from '../mock/build'
import { SEED_COLLECTIONS } from '../mock/seed'
import type { CollectionQuery, CollectionResult, Product } from '../types'

/**
 * In-memory adapter over the synthetic catalog. Zero configuration, no network.
 * Filtering and sorting follow Storefront API semantics (see `collection.ts`) so the
 * UI behaves the same when the real API is plugged in.
 */
export class MockAdapter implements CommerceAdapter {
  readonly name = 'Mock catalog'

  constructor(private readonly products: Product[] = MOCK_PRODUCTS) {}

  async getCollection(handle: string, query: CollectionQuery = {}): Promise<CollectionResult | null> {
    const seed = SEED_COLLECTIONS.find((c) => c.handle === handle)
    if (!seed) return null
    const types: readonly string[] | null = seed.productTypes
    const inCollection = this.products.filter((p) => !types || types.includes(p.productType))
    return {
      collection: {
        id: `gid://shopify/Collection/${SEED_COLLECTIONS.indexOf(seed) + 1}`,
        handle: seed.handle,
        title: seed.title,
        description: seed.description,
      },
      products: applyCollectionQuery(inCollection, query, SALES_RANK),
      filters: facetsFor(inCollection),
    }
  }

  async getProduct(handle: string): Promise<Product | null> {
    return this.products.find((p) => p.handle === handle) ?? null
  }

  async getProductHandles(): Promise<string[]> {
    return this.products.map((p) => p.handle)
  }

  async getMenu() {
    return SEED_COLLECTIONS.map(({ handle, title }) => ({ handle, title }))
  }
}
