'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useCart } from '@/components/cart/CartProvider'
import type { Product } from '@/lib/commerce/types'
import {
  findVariant,
  formatMoney,
  resolveSelection,
  selectionOf,
  variantParam,
  type Selection,
} from '@/lib/variants'
import { VariantSelector } from './VariantSelector'
import styles from './ProductDetail.module.css'

interface Props {
  product: Product
  initialVariantId: string
}

export function ProductDetail({ product, initialVariantId }: Props) {
  const { addLine } = useCart()
  const variants = product.variants.nodes
  const [variant, setVariant] = useState(() => variants.find((v) => v.id === initialVariantId) ?? variants[0]!)
  const [selection, setSelection] = useState<Selection>(() => selectionOf(variant))
  const [imageId, setImageId] = useState<string | null>(null)

  const images = product.images.nodes
  const shownImage =
    images.find((img) => img.id === imageId) ?? variant.image ?? product.featuredImage ?? images[0] ?? null

  // `selection` can momentarily differ from the variant's options when the shopper
  // lands on a combination that doesn't exist; resolveSelection then snaps it back.
  const onSelect = (optionName: string, value: string) => {
    const exact = findVariant(product, { ...selection, [optionName]: value })
    const next = exact ?? resolveSelection(product, selection, optionName, value)
    if (!next) return
    setVariant(next)
    setSelection(selectionOf(next))
    setImageId(null)
    // Shopify-style deep link. replaceState (not push) so the back button leaves the
    // product instead of stepping through every swatch; Next.js keeps its router in sync.
    const url = new URL(window.location.href)
    url.searchParams.set('variant', variantParam(next))
    window.history.replaceState(null, '', url)
  }

  const onSale = variant.compareAtPrice && Number(variant.compareAtPrice.amount) > Number(variant.price.amount)

  return (
    <div className={`container ${styles.layout}`}>
      <section className={styles.gallery} aria-label="Product images">
        <div className={styles.hero}>
          {shownImage && (
            <Image
              src={shownImage.url}
              alt={shownImage.altText ?? product.title}
              width={shownImage.width}
              height={shownImage.height}
              sizes="(min-width: 1320px) 700px, (min-width: 900px) 55vw, 100vw"
              loading="eager"
              fetchPriority="high"
              data-testid="product-image"
            />
          )}
        </div>
        {images.length > 1 && (
          <ul className={styles.thumbs}>
            {images.map((img, i) => (
              <li key={img.id}>
                <button
                  type="button"
                  className={styles.thumb}
                  aria-current={img.id === shownImage?.id}
                  aria-label={`Show image ${i + 1} of ${images.length}: ${img.altText ?? ''}`}
                  onClick={() => setImageId(img.id)}
                >
                  <Image src={img.url} alt="" width={96} height={120} sizes="96px" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.info} aria-labelledby="product-title">
        <p className={styles.vendor}>{product.vendor}</p>
        <h1 id="product-title" className={styles.title}>
          {product.title}
        </h1>

        {/* Announces the new price when the variant changes. */}
        <div className={styles.priceRow} aria-live="polite" aria-atomic="true" data-testid="product-price">
          <span className="visually-hidden">Price</span>
          <span className={styles.price}>{formatMoney(variant.price)}</span>
          {onSale && variant.compareAtPrice && (
            <>
              <span className="visually-hidden">, regular price</span>
              <s className={styles.compare}>{formatMoney(variant.compareAtPrice)}</s>
              <span className={styles.saleTag}>Sale</span>
            </>
          )}
        </div>

        <VariantSelector product={product} selection={selection} onSelect={onSelect} />

        <p className={styles.stock} data-available={variant.availableForSale}>
          {variant.availableForSale
            ? variant.quantityAvailable !== null && variant.quantityAvailable < 15
              ? `Only ${variant.quantityAvailable} left`
              : 'In stock, ready to ship'
            : `${variant.title} is sold out`}
        </p>

        <button
          type="button"
          className="button button--block"
          disabled={!variant.availableForSale}
          onClick={() =>
            addLine({
              merchandiseId: variant.id,
              productHandle: product.handle,
              productTitle: product.title,
              variantTitle: variant.title,
              price: variant.price,
              image: variant.image ?? product.featuredImage,
            })
          }
        >
          {variant.availableForSale ? 'Add to cart' : 'Sold out'}
        </button>

        <div className={styles.description} dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
      </section>
    </div>
  )
}
