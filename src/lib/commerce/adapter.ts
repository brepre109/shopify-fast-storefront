import type { CollectionQuery, CollectionResult, Product } from './types'

/**
 * Everything the UI knows about the commerce backend.
 *
 * Pages and components only ever talk to this interface (via `getCommerce()`), never
 * to a concrete backend, so the synthetic catalog can be swapped for the real
 * Storefront API, or for a test double, without touching a component.
 */
export interface CommerceAdapter {
  /** Human-readable name, surfaced in the footer so it is obvious which backend is live. */
  readonly name: string
  getCollection(handle: string, query?: CollectionQuery): Promise<CollectionResult | null>
  getProduct(handle: string): Promise<Product | null>
  /** Handles to pre-render at build time. */
  getProductHandles(): Promise<string[]>
  /** Collections to show in the primary navigation. */
  getMenu(): Promise<{ handle: string; title: string }[]>
}
