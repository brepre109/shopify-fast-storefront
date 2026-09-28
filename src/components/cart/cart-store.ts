/**
 * A tiny external store that owns the cart and mirrors it to localStorage.
 * React reads it through useSyncExternalStore, which gives correct hydration (the
 * server snapshot is an empty cart) and cross-tab sync via the `storage` event.
 */
import { STORAGE_KEY, cartReducer, parseStoredCart, type CartAction, type CartState } from './cart-state'

const EMPTY: CartState = { lines: [] }

let state: CartState | null = null
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((l) => l())

function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return
  state = parseStoredCart(e.newValue)
  emit()
}

export const cartStore = {
  getSnapshot(): CartState {
    if (state === null) {
      try {
        state = parseStoredCart(window.localStorage.getItem(STORAGE_KEY))
      } catch {
        state = EMPTY // storage disabled
      }
    }
    return state
  },

  getServerSnapshot(): CartState {
    return EMPTY
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    if (listeners.size === 1) window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) window.removeEventListener('storage', onStorage)
    }
  },

  dispatch(action: CartAction): CartState {
    state = cartReducer(cartStore.getSnapshot(), action)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Quota exceeded or storage disabled: the cart still works for this page view.
    }
    emit()
    return state
  },
}
