import type { MetadataRoute } from 'next'
import { getCommerce } from '@/lib/commerce'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const commerce = getCommerce()
  const [handles, menu] = await Promise.all([commerce.getProductHandles(), commerce.getMenu()])
  return [
    ...menu.map((c) => ({ url: c.handle === 'all' ? BASE_URL : `${BASE_URL}/collections/${c.handle}` })),
    ...handles.map((h) => ({ url: `${BASE_URL}/products/${h}` })),
  ]
}
