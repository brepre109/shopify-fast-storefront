'use client'

import Form from 'next/form'
import { useEffect, useRef } from 'react'
import { SORT_OPTIONS, filterToParam, type SortValue } from '@/lib/commerce/collection'
import type { FilterFacet } from '@/lib/commerce/types'
import styles from './FilterBar.module.css'

interface Props {
  action: string
  facets: FilterFacet[]
  sortBy: SortValue
  /** URL params currently applied, e.g. { 'filter.v.option.color': ['Sand'] } */
  active: Record<string, string[]>
  resultCount: number
}

/**
 * A plain GET form (works with JavaScript disabled) that is progressively enhanced:
 * with JS, every change submits immediately through next/form's client-side
 * navigation, so only the product grid re-renders and scroll position is kept.
 * Facets are native <details> disclosures, so they're keyboard-operable for free.
 */
export function FilterBar({ action, facets, sortBy, active, resultCount }: Props) {
  const formRef = useRef<HTMLFormElement>(null)

  // Close an open facet on outside click or Escape (native <details> doesn't).
  useEffect(() => {
    const form = formRef.current
    if (!form) return
    const closeAll = (except?: Element | null) =>
      form.querySelectorAll('details[open]').forEach((d) => d !== except && d.removeAttribute('open'))
    const onClick = (e: MouseEvent) => closeAll((e.target as Element).closest('details'))
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const open = form.querySelector('details[open]')
      if (!open) return
      open.removeAttribute('open')
      open.querySelector('summary')?.focus()
    }
    document.addEventListener('click', onClick)
    form.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onClick)
      form.removeEventListener('keydown', onKey)
    }
  }, [])

  // Keep inputs in sync when the URL changes from elsewhere (e.g. removing a chip),
  // without remounting the form, which would drop keyboard focus.
  const activeKey = JSON.stringify(active)
  useEffect(() => {
    const form = formRef.current
    if (!form) return
    const current = JSON.parse(activeKey) as Record<string, string[]>
    form.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((input) => {
      input.checked = current[input.name]?.includes(input.value) ?? false
    })
    const select = form.querySelector<HTMLSelectElement>('select[name=sort_by]')
    if (select) select.value = sortBy
  }, [activeKey, sortBy])

  const submit = () => formRef.current?.requestSubmit()

  return (
    <Form ref={formRef} action={action} replace scroll={false} className={styles.bar} aria-label="Filter and sort">
      <div className={styles.facets}>
        {facets.map((facet) => {
          const selected = active[facet.id] ?? []
          return (
            <details key={facet.id} className={styles.facet}>
              <summary className={styles.summary}>
                {facet.label}
                {selected.length > 0 && <span className={styles.selectedCount}> ({selected.length})</span>}
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
                  <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </summary>
              <fieldset className={styles.panel}>
                <legend className="visually-hidden">{facet.label}</legend>
                {facet.values.map((value) => {
                  const param = filterToParam(value.input)
                  if (!param) return null
                  const [name, paramValue] = param
                  const disabled = value.count === 0
                  return (
                    <label key={value.id} className={styles.option} data-disabled={disabled}>
                      <input
                        type="checkbox"
                        name={name}
                        value={paramValue}
                        defaultChecked={selected.includes(paramValue)}
                        disabled={disabled}
                        onChange={submit}
                      />
                      <span>{value.label}</span>
                      <span className={styles.count}>({value.count})</span>
                    </label>
                  )
                })}
              </fieldset>
            </details>
          )
        })}
      </div>

      <div className={styles.end}>
        <p className={styles.results} role="status">
          {resultCount} {resultCount === 1 ? 'product' : 'products'}
        </p>
        <label className={styles.sort}>
          <span>Sort by</span>
          <select name="sort_by" defaultValue={sortBy} onChange={submit}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {/* Only rendered without JS; with JS every change submits, so there's no
            button to hide after hydration (hiding one would shift the grid). */}
        <noscript>
          <button type="submit" className="button button--ghost">
            Apply
          </button>
        </noscript>
      </div>
    </Form>
  )
}
