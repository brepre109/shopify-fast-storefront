'use client'

import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusables(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.closest('[inert]') && el.getClientRects().length > 0,
  )
}

interface Options {
  onEscape: () => void
  /** Element made `inert` while the trap is active (everything behind the dialog). */
  backgroundId: string
  /** Where focus goes if the element that opened the dialog has since disappeared. */
  fallbackFocusId?: string
}

/**
 * Modal focus management per the WAI-ARIA APG dialog pattern:
 * - moves focus into the dialog (to `[data-autofocus]` or the first focusable),
 * - wraps Tab / Shift+Tab inside it,
 * - closes on Escape,
 * - marks the page behind it `inert` so screen-reader virtual cursors can't wander out,
 * - returns focus to the opener on close.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  { onEscape, backgroundId, fallbackFocusId }: Options,
) {
  const onEscapeRef = useRef(onEscape)
  useEffect(() => {
    onEscapeRef.current = onEscape
  })

  useEffect(() => {
    const container = ref.current
    if (!active || !container) return

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const background = document.getElementById(backgroundId)
    background?.setAttribute('inert', '')
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const initial = container.querySelector<HTMLElement>('[data-autofocus]') ?? focusables(container)[0]
    // Wait a frame so the element is visible (it animates in from visibility: hidden).
    const raf = requestAnimationFrame(() => initial?.focus())

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onEscapeRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables(container)
      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) {
        e.preventDefault()
        return
      }
      const current = document.activeElement
      if (e.shiftKey && (current === first || !container.contains(current))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (current === last || !container.contains(current))) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKeyDown)
      background?.removeAttribute('inert')
      document.body.style.overflow = previousOverflow
      const target =
        opener && opener.isConnected ? opener : fallbackFocusId ? document.getElementById(fallbackFocusId) : null
      target?.focus()
    }
  }, [active, ref, backgroundId, fallbackFocusId])
}
