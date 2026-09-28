import type { Image, MoneyV2, Product, ProductVariant } from '../types'
import {
  BRAND,
  IMAGE_HEIGHT,
  IMAGE_WIDTH,
  SEED_PRODUCTS,
  imagePath,
  type SeedProduct,
} from './seed'

const money = (n: number): MoneyV2 => ({ amount: n.toFixed(2), currencyCode: 'USD' })

/** Cartesian product of option values, in Shopify's variant order. */
function combinations(options: SeedProduct['options']): string[][] {
  return options.reduce<string[][]>(
    (acc, opt) => acc.flatMap((prefix) => opt.values.map((v) => [...prefix, v.name])),
    [[]],
  )
}

function buildProduct(seed: SeedProduct, index: number): Product {
  const productNum = 8_210_000_000 + index * 1_000
  const [primary] = seed.options
  if (!primary) throw new Error(`${seed.handle} has no options`)

  const images: Image[] = primary.values.map((v, i) => ({
    id: `gid://shopify/ProductImage/${productNum + 100 + i}`,
    url: imagePath(seed.handle, v.name),
    altText: `${seed.title} in ${v.name}`,
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
  }))
  const firstValue = primary.values[0]!.name
  images.push({
    id: `gid://shopify/ProductImage/${productNum + 199}`,
    url: imagePath(seed.handle, firstValue, true),
    altText: `Close-up detail of the ${seed.title}`,
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
  })
  const imageFor = (value: string) => images.find((img) => img.altText?.endsWith(` in ${value}`)) ?? null

  const variants: ProductVariant[] = combinations(seed.options)
    .map((values) => ({ values, title: values.join(' / ') }))
    .filter(({ title }) => !seed.missing?.includes(title))
    .map(({ values, title }, i) => {
      const delta = values.reduce((sum, v) => sum + (seed.priceDelta?.[v] ?? 0), 0)
      const compare = seed.compareAt?.[values[0]!]
      const soldOut = seed.allSoldOut || seed.soldOut?.includes(title) === true
      return {
        id: `gid://shopify/ProductVariant/${productNum * 10 + i + 1}`,
        title,
        sku: `FW-${seed.handle.split('-').map((w) => w.slice(0, 3).toUpperCase()).join('')}-${values
          .map((v) => v.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase())
          .join('-')}`,
        availableForSale: !soldOut,
        quantityAvailable: soldOut ? 0 : 12 + ((i * 7) % 20),
        selectedOptions: values.map((value, j) => ({ name: seed.options[j]!.name, value })),
        price: money(seed.price + delta),
        compareAtPrice: compare ? money(compare + delta) : null,
        image: imageFor(values[0]!),
      }
    })

  const amounts = variants.map((v) => Number(v.price.amount))
  return {
    id: `gid://shopify/Product/${productNum}`,
    handle: seed.handle,
    title: seed.title,
    description: seed.description.join('\n\n'),
    descriptionHtml: seed.description.map((p) => `<p>${p}</p>`).join(''),
    vendor: BRAND,
    productType: seed.productType,
    tags: seed.tags,
    availableForSale: variants.some((v) => v.availableForSale),
    createdAt: seed.createdAt,
    options: seed.options.map((opt, oi) => ({
      id: `gid://shopify/ProductOption/${productNum + oi + 1}`,
      name: opt.name,
      optionValues: opt.values.map((v, vi) => ({
        id: `gid://shopify/ProductOptionValue/${(productNum + oi + 1) * 10 + vi}`,
        name: v.name,
        swatch: v.swatch ? { color: v.swatch } : null,
      })),
    })),
    priceRange: {
      minVariantPrice: money(Math.min(...amounts)),
      maxVariantPrice: money(Math.max(...amounts)),
    },
    featuredImage: images[0] ?? null,
    images: { nodes: images },
    variants: { nodes: variants },
  }
}

export const MOCK_PRODUCTS: Product[] = SEED_PRODUCTS.map(buildProduct)

export const SALES_RANK: ReadonlyMap<string, number> = new Map(
  SEED_PRODUCTS.map((p) => [p.handle, p.salesRank]),
)
