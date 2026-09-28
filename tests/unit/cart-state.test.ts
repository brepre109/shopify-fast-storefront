import { describe, expect, it } from 'vitest'
import { cartReducer, parseStoredCart, subtotal, totalQuantity, type CartLine } from '@/components/cart/cart-state'

const line = (id: string, amount: string): Omit<CartLine, 'quantity'> => ({
  merchandiseId: id,
  productHandle: 'h',
  productTitle: `Product ${id}`,
  variantTitle: 'Default',
  price: { amount, currencyCode: 'USD' },
  image: null,
})

describe('cartReducer', () => {
  it('merges repeated adds of the same variant', () => {
    let s = cartReducer({ lines: [] }, { type: 'add', line: line('a', '10.00') })
    s = cartReducer(s, { type: 'add', line: line('a', '10.00'), quantity: 2 })
    expect(s.lines).toHaveLength(1)
    expect(totalQuantity(s)).toBe(3)
  })

  it('clamps quantity and removes lines set to zero', () => {
    let s = cartReducer({ lines: [] }, { type: 'add', line: line('a', '10.00'), quantity: 99 })
    expect(s.lines[0]!.quantity).toBe(20)
    s = cartReducer(s, { type: 'setQuantity', merchandiseId: 'a', quantity: 0 })
    expect(s.lines).toEqual([])
  })

  it('sums the subtotal in integer cents', () => {
    let s = cartReducer({ lines: [] }, { type: 'add', line: line('a', '0.10'), quantity: 3 })
    s = cartReducer(s, { type: 'add', line: line('b', '0.20') })
    expect(subtotal(s)).toEqual({ amount: '0.50', currencyCode: 'USD' })
  })
})

describe('parseStoredCart', () => {
  it('survives garbage in localStorage', () => {
    expect(parseStoredCart('{not json')).toEqual({ lines: [] })
    expect(parseStoredCart('{"lines":"nope"}')).toEqual({ lines: [] })
    expect(parseStoredCart(null)).toEqual({ lines: [] })
  })

  it('drops malformed lines and keeps valid ones', () => {
    const valid = { ...line('a', '5.00'), quantity: 2 }
    const raw = JSON.stringify({ lines: [valid, { merchandiseId: 1 }, { ...valid, merchandiseId: 'b', quantity: -1 }] })
    expect(parseStoredCart(raw).lines).toEqual([valid])
  })
})
