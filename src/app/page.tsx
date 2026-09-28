import { notFound } from 'next/navigation'
import { CollectionView } from '@/components/collection/CollectionView'
import { getCommerce } from '@/lib/commerce'
import { parseCollectionParams } from '@/lib/commerce/collection'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const result = await getCommerce().getCollection('all', parseCollectionParams(sp).query)
  if (!result) notFound()
  return <CollectionView result={result} searchParams={sp} path="/" />
}
