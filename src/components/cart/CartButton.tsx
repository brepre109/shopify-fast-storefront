'use client'

import { useCart } from './CartProvider'
import styles from './CartButton.module.css'

export function CartButton() {
  const { count, hydrated, openCart, isOpen } = useCart()
  const label = hydrated ? `Cart, ${count} ${count === 1 ? 'item' : 'items'}` : 'Cart'
  return (
    <button
      id="cart-button"
      type="button"
      className={styles.button}
      onClick={openCart}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-label={label}
    >
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M9 10V7a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className={styles.text} aria-hidden="true">
        Cart
      </span>
      {/* Absolutely positioned so the badge never shifts layout when it appears. */}
      <span className={styles.badge} data-visible={hydrated && count > 0} aria-hidden="true" data-testid="cart-count">
        {count}
      </span>
    </button>
  )
}
