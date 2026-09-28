import 'server-only'
import type { CommerceAdapter } from './adapter'
import { MockAdapter } from './adapters/mock'
import { StorefrontApiAdapter } from './adapters/storefront'

let adapter: CommerceAdapter | undefined

/**
 * Returns the configured adapter. `COMMERCE_ADAPTER=storefront` switches to the
 * Storefront API; anything else (including unset) uses the zero-config mock catalog.
 */
export function getCommerce(): CommerceAdapter {
  if (!adapter) {
    adapter =
      process.env.COMMERCE_ADAPTER === 'storefront'
        ? StorefrontApiAdapter.fromEnv(process.env)
        : new MockAdapter()
  }
  return adapter
}

export type { CommerceAdapter } from './adapter'
export * from './types'
