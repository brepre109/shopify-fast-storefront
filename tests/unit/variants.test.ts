import { describe, expect, it } from 'vitest'
import { MockAdapter } from '@/lib/commerce/adapters/mock'
import {
  defaultVariant,
  formatMoney,
  optionValueState,
  resolveSelection,
  selectionOf,
  variantParam,
} from '@/lib/variants'

const tee = (await new MockAdapter().getProduct('loom-cotton-tee'))!

describe('variant selection', () => {
  it('defaults to the first available variant (Chalk / XS is sold out)', () => {
    expect(defaultVariant(tee).title).toBe('Chalk / S')
  })

  it('honours a numeric ?variant= param, including sold-out variants', () => {
    const inkL = tee.variants.nodes.find((v) => v.title === 'Ink / L')!
    expect(variantParam(inkL)).toMatch(/^\d+$/)
    expect(defaultVariant(tee, variantParam(inkL)).title).toBe('Ink / L')
    expect(defaultVariant(tee, 'not-a-variant').title).toBe('Chalk / S')
  })

  it('classifies option values against the current selection', () => {
    const chalkS = { Color: 'Chalk', Size: 'S' }
    expect(optionValueState(tee, chalkS, 'Size', 'M')).toBe('available')
    expect(optionValueState(tee, chalkS, 'Size', 'XS')).toBe('sold-out')
    expect(optionValueState(tee, { Color: 'Clay', Size: 'S' }, 'Size', 'XS')).toBe('unavailable')
  })

  it('keeps other options when the combination exists', () => {
    expect(resolveSelection(tee, { Color: 'Chalk', Size: 'M' }, 'Color', 'Ink')?.title).toBe('Ink / M')
  })

  it('falls back to the first available variant with the new value when the combination does not exist', () => {
    // Clay has no XS, so switching Chalk / XS -> Clay lands on the first available Clay size.
    expect(resolveSelection(tee, { Color: 'Chalk', Size: 'XS' }, 'Color', 'Clay')?.title).toBe('Clay / S')
  })

  it('round-trips selectedOptions', () => {
    const v = tee.variants.nodes[0]!
    expect(selectionOf(v)).toEqual({ Color: 'Chalk', Size: 'XS' })
  })

  it('formats MoneyV2 decimal strings', () => {
    expect(formatMoney({ amount: '1234.5', currencyCode: 'USD' })).toBe('$1,234.50')
  })
})
