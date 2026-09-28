'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useHydrated } from '@/lib/use-hydrated'
import { totalQuantity, type CartLine, type CartState } from './cart-state'
import { cartStore } from './cart-store'

interface CartContextValue {
  state: CartState
  count: number
  /** False during SSR/hydration, before localStorage has been read; avoids flashing "0". */
  hydrated: boolean
  isOpen: boolean
  addLine: (line: Omit<CartLine, 'quantity'>, quantity?: number) => void
  setQuantity: (merchandiseId: string, quantity: number) => void
  removeLine: (merchandiseId: string) => void
  openCart: () => void
  closeCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}

const itemsLabel = (n: number) => `${n} ${n === 1 ? 'item' : 'items'}`

export function CartProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot)
  const hydrated = useHydrated()
  const [isOpen, setIsOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  const addLine = useCallback<CartContextValue['addLine']>((line, quantity = 1) => {
    const next = cartStore.dispatch({ type: 'add', line, quantity })
    setAnnouncement(
      `Added ${line.productTitle}, ${line.variantTitle}, to your cart. Cart has ${itemsLabel(totalQuantity(next))}.`,
    )
    setIsOpen(true)
  }, [])

  const setQuantity = useCallback<CartContextValue['setQuantity']>((merchandiseId, quantity) => {
    const line = cartStore.getSnapshot().lines.find((l) => l.merchandiseId === merchandiseId)
    if (!line) return
    const next = cartStore.dispatch({ type: 'setQuantity', merchandiseId, quantity })
    const kept = next.lines.find((l) => l.merchandiseId === merchandiseId)
    setAnnouncement(
      kept
        ? `${line.productTitle} quantity ${kept.quantity}. Cart has ${itemsLabel(totalQuantity(next))}.`
        : `Removed ${line.productTitle} from your cart. Cart has ${itemsLabel(totalQuantity(next))}.`,
    )
  }, [])

  const removeLine = useCallback((merchandiseId: string) => setQuantity(merchandiseId, 0), [setQuantity])
  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])
  const count = totalQuantity(state)

  const value = useMemo(
    () => ({ state, count, hydrated, isOpen, addLine, setQuantity, removeLine, openCart, closeCart }),
    [state, count, hydrated, isOpen, addLine, setQuantity, removeLine, openCart, closeCart],
  )

  return (
    <CartContext.Provider value={value}>
      {children}
      {/* Polite live region: announces cart changes and the new count without moving focus. */}
      <p role="status" aria-live="polite" aria-atomic="true" className="visually-hidden" data-testid="cart-status">
        {announcement}
      </p>
    </CartContext.Provider>
  )
}
