'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRef } from 'react'
import { formatMoney } from '@/lib/variants'
import { MAX_LINE_QUANTITY, subtotal } from './cart-state'
import { useCart } from './CartProvider'
import { useFocusTrap } from './useFocusTrap'
import styles from './CartDrawer.module.css'

export function CartDrawer() {
  const { state, count, isOpen, closeCart, setQuantity, removeLine } = useCart()
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, isOpen, { onEscape: closeCart, backgroundId: 'page', fallbackFocusId: 'cart-button' })

  return (
    <div className={styles.root} data-open={isOpen} inert={!isOpen}>
      <div className={styles.backdrop} onClick={closeCart} aria-hidden="true" />
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        data-testid="cart-drawer"
      >
        <header className={styles.header}>
          <h2 id="cart-title" className={styles.title}>
            Your cart <span className={styles.titleCount}>({count})</span>
          </h2>
          <button type="button" className={styles.close} onClick={closeCart} aria-label="Close cart" data-autofocus>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {state.lines.length === 0 ? (
          <div className={styles.empty}>
            <p>Your cart is empty.</p>
            <button type="button" className="button button--ghost" onClick={closeCart}>
              Continue shopping
            </button>
          </div>
        ) : (
          <>
            <ul className={styles.lines} aria-label="Cart items">
              {state.lines.map((line) => {
                const label = `${line.productTitle}, ${line.variantTitle}`
                return (
                  <li key={line.merchandiseId} className={styles.line}>
                    {line.image ? (
                      <Image
                        className={styles.thumb}
                        src={line.image.url}
                        alt=""
                        width={80}
                        height={100}
                        sizes="80px"
                      />
                    ) : (
                      <span className={styles.thumb} />
                    )}
                    <div className={styles.lineBody}>
                      <Link href={`/products/${line.productHandle}`} className={styles.lineTitle} onClick={closeCart}>
                        {line.productTitle}
                      </Link>
                      <span className={styles.variant}>{line.variantTitle}</span>
                      <div className={styles.lineActions}>
                        <div className={styles.stepper} role="group" aria-label={`Quantity, ${label}`}>
                          <button
                            type="button"
                            onClick={() => setQuantity(line.merchandiseId, line.quantity - 1)}
                            aria-label={`Decrease quantity of ${label}`}
                          >
                            −
                          </button>
                          <output aria-live="off">{line.quantity}</output>
                          <button
                            type="button"
                            onClick={() => setQuantity(line.merchandiseId, line.quantity + 1)}
                            aria-label={`Increase quantity of ${label}`}
                            disabled={line.quantity >= MAX_LINE_QUANTITY}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className={styles.remove}
                          onClick={() => removeLine(line.merchandiseId)}
                          aria-label={`Remove ${label}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <span className={styles.linePrice}>
                      {formatMoney({
                        amount: (Number(line.price.amount) * line.quantity).toFixed(2),
                        currencyCode: line.price.currencyCode,
                      })}
                    </span>
                  </li>
                )
              })}
            </ul>
            <footer className={styles.footer}>
              <p className={styles.subtotal}>
                <span>Subtotal</span>
                <span data-testid="cart-subtotal">{formatMoney(subtotal(state))}</span>
              </p>
              <p className={styles.note}>Shipping and taxes are calculated at checkout.</p>
              <button type="button" className="button button--block" aria-describedby="checkout-note" disabled>
                Checkout
              </button>
              <p id="checkout-note" className={styles.note}>
                Demo store: checkout is disabled.
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
