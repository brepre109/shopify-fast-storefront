import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductDetail } from '@/components/product/ProductDetail'
import { getCommerce } from '@/lib/commerce'
import { defaultVariant } from '@/lib/variants'

interface Props {
  params: Promise<{ handle: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  const product = await getCommerce().getProduct(handle)
  if (!product) return {}
  return {
    title: product.title,
    description: product.description.split('\n')[0],
    openGraph: product.featuredImage ? { images: [{ url: product.featuredImage.url }] } : undefined,
  }
}

export default async function ProductPage({ params, searchParams }: Props) {
  const [{ handle }, sp] = await Promise.all([params, searchParams])
  const product = await getCommerce().getProduct(handle)
  if (!product) notFound()

  // Honour ?variant= on the server so shared links render the right price and image
  // in the initial HTML, with no client-side flash.
  const param = typeof sp.variant === 'string' ? sp.variant : null
  const variant = defaultVariant(product, param)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProductGroup',
    name: product.title,
    description: product.description,
    brand: { '@type': 'Brand', name: product.vendor },
    productGroupID: product.id.split('/').pop(),
    variesBy: product.options.map((o) => o.name),
    hasVariant: product.variants.nodes.map((v) => ({
      '@type': 'Product',
      sku: v.sku,
      name: `${product.title} – ${v.title}`,
      image: v.image?.url,
      offers: {
        '@type': 'Offer',
        price: v.price.amount,
        priceCurrency: v.price.currencyCode,
        availability: v.availableForSale ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <ProductDetail key={product.id} product={product} initialVariantId={variant.id} />
    </>
  )
}
