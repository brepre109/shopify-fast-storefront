/**
 * Cart state as a pure reducer. The line shape mirrors the Storefront API's
 * `CartLine` (merchandise id + quantity) plus a denormalised snapshot of what the
 * drawer needs to render, so the cart can paint instantly from localStorage without
 * refetching products.
 */
import type { Image, MoneyV2 } from '@/lib/commerce/types'

export interface CartLine {
  /** ProductVariant GID, i.e. CartLineInput.merchandiseId */
  merchandiseId: string
  quantity: number
  productHandle: string
  productTitle: string
  variantTitle: string
  price: MoneyV2
  image: Image | null
}

export interface CartState {
  lines: CartLine[]
}

export type CartAction =
  | { type: 'add'; line: Omit<CartLine, 'quantity'>; quantity?: number }
  | { type: 'setQuantity'; merchandiseId: string; quantity: number }
  | { type: 'remove'; merchandiseId: string }
  | { type: 'replace'; state: CartState }

export const MAX_LINE_QUANTITY = 20
export const STORAGE_KEY = 'fsf.cart.v1'

const clampQty = (n: number) => Math.max(0, Math.min(MAX_LINE_QUANTITY, Math.floor(n)))

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const qty = action.quantity ?? 1
      const existing = state.lines.find((l) => l.merchandiseId === action.line.merchandiseId)
      if (existing) {
        return cartReducer(state, {
          type: 'setQuantity',
          merchandiseId: existing.merchandiseId,
          quantity: existing.quantity + qty,
        })
      }
      return { lines: [...state.lines, { ...action.line, quantity: clampQty(qty) }] }
    }
    case 'setQuantity': {
      const quantity = clampQty(action.quantity)
      return {
        lines:
          quantity === 0
            ? state.lines.filter((l) => l.merchandiseId !== action.merchandiseId)
            : state.lines.map((l) => (l.merchandiseId === action.merchandiseId ? { ...l, quantity } : l)),
      }
    }
    case 'remove':
      return { lines: state.lines.filter((l) => l.merchandiseId !== action.merchandiseId) }
    case 'replace':
      return action.state
  }
}

export const totalQuantity = (state: CartState) => state.lines.reduce((n, l) => n + l.quantity, 0)

export function subtotal(state: CartState): MoneyV2 {
  const cents = state.lines.reduce((sum, l) => sum + Math.round(Number(l.price.amount) * 100) * l.quantity, 0)
  return { amount: (cents / 100).toFixed(2), currencyCode: state.lines[0]?.price.currencyCode ?? 'USD' }
}

/** Parses persisted state defensively: storage is user-controlled input. */
export function parseStoredCart(raw: string | null): CartState {
  if (!raw) return { lines: [] }
  try {
    const data = JSON.parse(raw) as unknown
    if (!data || typeof data !== 'object' || !Array.isArray((data as CartState).lines)) return { lines: [] }
    const lines = (data as CartState).lines.filter(
      (l): l is CartLine =>
        typeof l?.merchandiseId === 'string' &&
        typeof l.productTitle === 'string' &&
        typeof l.quantity === 'number' &&
        l.quantity > 0 &&
        typeof l.price?.amount === 'string',
    )
    return { lines: lines.map((l) => ({ ...l, quantity: clampQty(l.quantity) })) }
  } catch {
    return { lines: [] }
  }
}
