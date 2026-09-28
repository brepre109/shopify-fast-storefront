/**
 * Synthetic catalog for "Fernwick Goods", a fictional homewares brand.
 *
 * This file is deliberately compact and dependency-free (type-only imports) so it can
 * be read both by the app (via `build.ts`, which expands it into Storefront API
 * shapes) and by `scripts/generate-images.mjs`, which draws the product art.
 */

export type ArtKind =
  | 'mug'
  | 'dripper'
  | 'throw'
  | 'tee'
  | 'tote'
  | 'candle'
  | 'napkins'
  | 'bowl'
  | 'beanie'

export interface SeedOptionValue {
  name: string
  /** Hex swatch. Present on the first option of every product; drives the art colour. */
  swatch?: string
}

export interface SeedProduct {
  handle: string
  title: string
  productType: 'Ceramics' | 'Textiles' | 'Apparel' | 'Accessories' | 'Home'
  art: ArtKind
  tags: string[]
  createdAt: string
  /** Lower is better. Stands in for Shopify's BEST_SELLING sort. */
  salesRank: number
  description: string[]
  options: { name: string; values: SeedOptionValue[] }[]
  /** Base price in USD. */
  price: number
  /** Price deltas keyed by option value, e.g. { '12 oz': 4 }. */
  priceDelta?: Record<string, number>
  /** Compare-at price keyed by the first option value (sale pricing). */
  compareAt?: Record<string, number>
  /** Variant titles ("Slate / 12 oz") that exist but are sold out. */
  soldOut?: string[]
  /** Variant titles that are never offered (the combination doesn't exist). */
  missing?: string[]
  /** Every variant is sold out. */
  allSoldOut?: boolean
}

export const BRAND = 'Fernwick Goods'

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    handle: 'harbor-mug',
    title: 'Harbor Mug',
    productType: 'Ceramics',
    art: 'mug',
    tags: ['kitchen', 'stoneware'],
    createdAt: '2026-08-02T09:00:00Z',
    salesRank: 1,
    description: [
      'A thick-walled stoneware mug thrown for slow mornings. The unglazed foot keeps it steady on any surface, and the wide handle fits three fingers.',
      'Dishwasher and microwave safe. Each glaze pools a little differently, so no two are identical.',
    ],
    options: [
      {
        name: 'Color',
        values: [
          { name: 'Sand', swatch: '#d8c3a5' },
          { name: 'Slate', swatch: '#5b6770' },
          { name: 'Moss', swatch: '#7d8a5a' },
        ],
      },
      { name: 'Size', values: [{ name: '8 oz' }, { name: '12 oz' }] },
    ],
    price: 28,
    priceDelta: { '12 oz': 4 },
    soldOut: ['Slate / 12 oz'],
  },
  {
    handle: 'loom-cotton-tee',
    title: 'Loom Cotton Tee',
    productType: 'Apparel',
    art: 'tee',
    tags: ['organic cotton', 'unisex'],
    createdAt: '2026-07-18T09:00:00Z',
    salesRank: 2,
    description: [
      'A heavyweight organic cotton tee with a relaxed shoulder and a collar that holds its shape wash after wash.',
      'Garment-dyed in small batches. Unisex fit; size down for a closer cut.',
    ],
    options: [
      {
        name: 'Color',
        values: [
          { name: 'Chalk', swatch: '#ece6da' },
          { name: 'Ink', swatch: '#2f3a4a' },
          { name: 'Clay', swatch: '#b8735a' },
        ],
      },
      { name: 'Size', values: [{ name: 'XS' }, { name: 'S' }, { name: 'M' }, { name: 'L' }, { name: 'XL' }] },
    ],
    price: 42,
    soldOut: ['Ink / L', 'Chalk / XS'],
    missing: ['Clay / XS', 'Clay / XL'],
  },
  {
    handle: 'ridge-wool-throw',
    title: 'Ridge Wool Throw',
    productType: 'Textiles',
    art: 'throw',
    tags: ['wool', 'living room'],
    createdAt: '2026-06-05T09:00:00Z',
    salesRank: 4,
    description: [
      'A lambswool throw woven on a narrow loom, with a single contrast ridge and hand-knotted fringe.',
      '130 × 170 cm. Dry clean or cold hand wash.',
    ],
    options: [
      {
        name: 'Color',
        values: [
          { name: 'Oat', swatch: '#cdbb9b' },
          { name: 'Rust', swatch: '#a8553a' },
          { name: 'Ink', swatch: '#2f3a4a' },
        ],
      },
    ],
    price: 148,
    compareAt: { Rust: 180 },
  },
  {
    handle: 'ember-soy-candle',
    title: 'Ember Soy Candle',
    productType: 'Home',
    art: 'candle',
    tags: ['fragrance', 'soy wax'],
    createdAt: '2026-08-20T09:00:00Z',
    salesRank: 3,
    description: [
      'Hand-poured soy wax in a reusable glass tumbler, with a cotton wick that burns clean and even.',
      'Small burns for about 30 hours; Large for about 60.',
    ],
    options: [
      {
        name: 'Scent',
        values: [
          { name: 'Cedar', swatch: '#8a6f55' },
          { name: 'Fig', swatch: '#7a5068' },
          { name: 'Salt', swatch: '#b9c8cc' },
        ],
      },
      { name: 'Size', values: [{ name: 'Small' }, { name: 'Large' }] },
    ],
    price: 24,
    priceDelta: { Large: 14 },
    soldOut: ['Fig / Large'],
  },
  {
    handle: 'field-canvas-tote',
    title: 'Field Canvas Tote',
    productType: 'Accessories',
    art: 'tote',
    tags: ['canvas', 'everyday'],
    createdAt: '2026-05-11T09:00:00Z',
    salesRank: 6,
    description: [
      'A 16 oz waxed canvas tote with an interior slip pocket and handles long enough to wear on the shoulder.',
    ],
    options: [
      {
        name: 'Color',
        values: [
          { name: 'Natural', swatch: '#e2d6bf' },
          { name: 'Olive', swatch: '#6b6b3f' },
        ],
      },
    ],
    price: 54,
  },
  {
    handle: 'linen-napkin-set',
    title: 'Linen Napkin Set',
    productType: 'Textiles',
    art: 'napkins',
    tags: ['linen', 'table'],
    createdAt: '2026-04-28T09:00:00Z',
    salesRank: 7,
    description: [
      'Stonewashed European linen napkins with mitred corners. Softer with every wash.',
      '45 × 45 cm each.',
    ],
    options: [
      {
        name: 'Color',
        values: [
          { name: 'Oat', swatch: '#cdbb9b' },
          { name: 'Moss', swatch: '#7d8a5a' },
        ],
      },
      { name: 'Pack', values: [{ name: '4-pack' }, { name: '8-pack' }] },
    ],
    price: 36,
    priceDelta: { '8-pack': 28 },
  },
  {
    handle: 'tidewater-pour-over-set',
    title: 'Tidewater Pour-Over Set',
    productType: 'Ceramics',
    art: 'dripper',
    tags: ['kitchen', 'coffee', 'stoneware'],
    createdAt: '2026-09-01T09:00:00Z',
    salesRank: 5,
    description: [
      'A ceramic cone dripper paired with a 600 ml carafe. Fits standard #2 filters and brews two generous cups.',
    ],
    options: [
      {
        name: 'Color',
        values: [
          { name: 'Sand', swatch: '#d8c3a5' },
          { name: 'Slate', swatch: '#5b6770' },
        ],
      },
    ],
    price: 64,
    soldOut: ['Slate'],
  },
  {
    handle: 'stoneware-bowl',
    title: 'Stoneware Bowl',
    productType: 'Ceramics',
    art: 'bowl',
    tags: ['kitchen', 'stoneware'],
    createdAt: '2026-03-14T09:00:00Z',
    salesRank: 8,
    description: [
      'An everyday bowl with a gently flared lip, for cereal, noodles or a salad for one.',
    ],
    options: [
      {
        name: 'Color',
        values: [
          { name: 'Sand', swatch: '#d8c3a5' },
          { name: 'Slate', swatch: '#5b6770' },
        ],
      },
      { name: 'Size', values: [{ name: 'Small' }, { name: 'Medium' }, { name: 'Large' }] },
    ],
    price: 22,
    priceDelta: { Medium: 6, Large: 12 },
    missing: ['Slate / Large'],
  },
  {
    handle: 'merino-beanie',
    title: 'Merino Beanie',
    productType: 'Apparel',
    art: 'beanie',
    tags: ['merino', 'winter'],
    createdAt: '2026-02-02T09:00:00Z',
    salesRank: 9,
    description: [
      'A ribbed merino beanie with a fold-over cuff. Back in stock for the colder months.',
    ],
    options: [
      {
        name: 'Color',
        values: [
          { name: 'Rust', swatch: '#a8553a' },
          { name: 'Ink', swatch: '#2f3a4a' },
          { name: 'Oat', swatch: '#cdbb9b' },
        ],
      },
    ],
    price: 38,
    allSoldOut: true,
  },
]

export const SEED_COLLECTIONS = [
  {
    handle: 'all',
    title: 'Shop all',
    description: 'Stoneware, textiles and small-batch goods for the home.',
    productTypes: null,
  },
  {
    handle: 'ceramics',
    title: 'Ceramics',
    description: 'Wheel-thrown stoneware for the table and the morning routine.',
    productTypes: ['Ceramics'],
  },
  {
    handle: 'textiles',
    title: 'Textiles & apparel',
    description: 'Wool, linen and organic cotton, woven and dyed in small runs.',
    productTypes: ['Textiles', 'Apparel', 'Accessories'],
  },
] as const

export const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Public path of the generated artwork for a product/first-option value. */
export const imagePath = (handle: string, value: string, detail = false): string =>
  `/products/${handle}-${slug(value)}${detail ? '-detail' : ''}.webp`

export const IMAGE_WIDTH = 1200
export const IMAGE_HEIGHT = 1500
