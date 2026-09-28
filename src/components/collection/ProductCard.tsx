import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@/lib/commerce/types'
import { formatMoney } from '@/lib/variants'
import styles from './ProductCard.module.css'

interface Props {
  product: Product
  /** Cards in the first row are likely LCP candidates: load them eagerly. */
  eager?: boolean
}

export function ProductCard({ product, eager = false }: Props) {
  const { minVariantPrice, maxVariantPrice } = product.priceRange
  const hasRange = minVariantPrice.amount !== maxVariantPrice.amount
  const onSale = product.variants.nodes.some((v) => v.compareAtPrice)
  const swatches = product.options[0]?.optionValues.filter((v) => v.swatch?.color) ?? []
  const image = product.featuredImage

  return (
    <li className={styles.card}>
      <Link href={`/products/${product.handle}`} className={styles.link}>
        <div className={styles.media}>
          {image && (
            <Image
              src={image.url}
              alt={image.altText ?? product.title}
              width={image.width}
              height={image.height}
              sizes="(min-width: 1320px) 310px, (min-width: 900px) 25vw, (min-width: 600px) 33vw, 50vw"
              loading={eager ? 'eager' : 'lazy'}
              fetchPriority={eager ? 'high' : 'auto'}
            />
          )}
          {!product.availableForSale ? (
            <span className={styles.badge}>Sold out</span>
          ) : onSale ? (
            <span className={`${styles.badge} ${styles.sale}`}>Sale</span>
          ) : null}
        </div>
        <h3 className={styles.title}>{product.title}</h3>
      </Link>
      <p className={styles.price}>
        {hasRange && <span className={styles.from}>From </span>}
        {formatMoney(minVariantPrice)}
      </p>
      {swatches.length > 1 && (
        <p className={styles.swatches}>
          <span className="visually-hidden">
            {swatches.length} {product.options[0]?.name.toLowerCase()}s: {swatches.map((s) => s.name).join(', ')}
          </span>
          {swatches.map((s) => (
            <span key={s.id} className={styles.swatch} style={{ background: s.swatch?.color ?? undefined }} aria-hidden="true" />
          ))}
        </p>
      )}
    </li>
  )
}
