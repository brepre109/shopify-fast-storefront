'use client'

import { useRef, type KeyboardEvent } from 'react'
import type { Product } from '@/lib/commerce/types'
import { optionValueState, type Selection } from '@/lib/variants'
import styles from './VariantSelector.module.css'

interface Props {
  product: Product
  selection: Selection
  onSelect: (optionName: string, value: string) => void
}

const STATE_TEXT = { available: '', 'sold-out': ', sold out', unavailable: ', unavailable in this combination' }

/**
 * One WAI-ARIA radio group per product option (APG "Radio Group" pattern):
 * - a single tab stop per group (roving tabindex on the checked radio),
 * - Arrow keys move focus *and* selection, wrapping at the ends; Home/End jump,
 * - Space/click selects.
 * Sold-out and non-existent combinations stay focusable and selectable (so the
 * shopper can see *why* they can't buy), but are struck through and say so in
 * their accessible name.
 */
export function VariantSelector({ product, selection, onSelect }: Props) {
  const groupRefs = useRef(new Map<string, HTMLDivElement>())

  const onKeyDown = (optionName: string, values: string[]) => (e: KeyboardEvent<HTMLDivElement>) => {
    const current = values.indexOf(selection[optionName] ?? '')
    const last = values.length - 1
    const next = (() => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          return current >= last ? 0 : current + 1
        case 'ArrowLeft':
        case 'ArrowUp':
          return current <= 0 ? last : current - 1
        case 'Home':
          return 0
        case 'End':
          return last
        default:
          return null
      }
    })()
    if (next === null) return
    e.preventDefault()
    const value = values[next]!
    onSelect(optionName, value)
    groupRefs.current
      .get(optionName)
      ?.querySelector<HTMLElement>(`[data-value="${CSS.escape(value)}"]`)
      ?.focus()
  }

  return (
    <div className={styles.root}>
      {product.options.map((option) => {
        const labelId = `option-${option.id.split('/').pop()}`
        const values = option.optionValues.map((v) => v.name)
        const isSwatch = option.optionValues.some((v) => v.swatch?.color)
        // A single-value option (e.g. "Default Title") needs no picker.
        if (values.length < 2) return null
        return (
          <div key={option.id} className={styles.option}>
            <span id={labelId} className={styles.label}>
              {option.name}: <span className={styles.current}>{selection[option.name]}</span>
            </span>
            <div
              role="radiogroup"
              aria-labelledby={labelId}
              className={styles.values}
              onKeyDown={onKeyDown(option.name, values)}
              ref={(el) => {
                if (el) groupRefs.current.set(option.name, el)
              }}
            >
              {option.optionValues.map((value) => {
                const checked = selection[option.name] === value.name
                const state = optionValueState(product, selection, option.name, value.name)
                return (
                  <button
                    key={value.id}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    tabIndex={checked ? 0 : -1}
                    // Explicit name so the state suffix isn't split by flex layout ("XS , sold out").
                    aria-label={value.name + STATE_TEXT[state]}
                    data-value={value.name}
                    data-state={state}
                    className={isSwatch ? `${styles.value} ${styles.swatchValue}` : styles.value}
                    onClick={() => onSelect(option.name, value.name)}
                  >
                    {isSwatch && (
                      <span
                        className={styles.swatch}
                        style={{ background: value.swatch?.color ?? undefined }}
                        aria-hidden="true"
                      />
                    )}
                    <span>{value.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
