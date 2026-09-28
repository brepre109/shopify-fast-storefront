/**
 * Variant selection logic, independent of React so it can be unit tested.
 */
import type { MoneyV2, Product, ProductVariant } from './commerce/types'

export type Selection = Record<string, string>

/** Availability of an option value *given the other currently selected options*. */
export type OptionValueState = 'available' | 'sold-out' | 'unavailable'

export const selectionOf = (variant: ProductVariant): Selection =>
  Object.fromEntries(variant.selectedOptions.map((o) => [o.name, o.value]))

const matchesSelection = (variant: ProductVariant, selection: Selection) =>
  variant.selectedOptions.every((o) => selection[o.name] === o.value)

export function findVariant(product: Product, selection: Selection): ProductVariant | undefined {
  return product.variants.nodes.find((v) => matchesSelection(v, selection))
}

/** "gid://shopify/ProductVariant/123" -> "123" (the form Shopify uses in `?variant=`). */
export const variantParam = (variant: ProductVariant): string => variant.id.split('/').pop() ?? variant.id

export function defaultVariant(product: Product, param?: string | null): ProductVariant {
  const variants = product.variants.nodes
  const fromParam = param ? variants.find((v) => variantParam(v) === param || v.id === param) : undefined
  const first = fromParam ?? variants.find((v) => v.availableForSale) ?? variants[0]
  if (!first) throw new Error(`Product ${product.handle} has no variants`)
  return first
}

/**
 * The variant to switch to when the shopper picks `value` for `optionName`.
 * Keeps the other selections when that combination exists; otherwise falls back to
 * the first *available* variant with the new value (then any variant with it), which
 * is how Shopify's reference themes behave.
 */
export function resolveSelection(
  product: Product,
  current: Selection,
  optionName: string,
  value: string,
): ProductVariant | undefined {
  const exact = findVariant(product, { ...current, [optionName]: value })
  if (exact) return exact
  const withValue = product.variants.nodes.filter((v) =>
    v.selectedOptions.some((o) => o.name === optionName && o.value === value),
  )
  return withValue.find((v) => v.availableForSale) ?? withValue[0]
}

export function optionValueState(
  product: Product,
  current: Selection,
  optionName: string,
  value: string,
): OptionValueState {
  const variant = findVariant(product, { ...current, [optionName]: value })
  if (!variant) return 'unavailable'
  return variant.availableForSale ? 'available' : 'sold-out'
}

const formatters = new Map<string, Intl.NumberFormat>()

export function formatMoney({ amount, currencyCode }: MoneyV2): string {
  let f = formatters.get(currencyCode)
  if (!f) {
    f = new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode })
    formatters.set(currencyCode, f)
  }
  return f.format(Number(amount))
}
