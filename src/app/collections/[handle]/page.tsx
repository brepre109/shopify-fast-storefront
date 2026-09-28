import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CollectionView } from '@/components/collection/CollectionView'
import { getCommerce } from '@/lib/commerce'
import { parseCollectionParams } from '@/lib/commerce/collection'

interface Props {
  params: Promise<{ handle: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  const result = await getCommerce().getCollection(handle)
  return result ? { title: result.collection.title, description: result.collection.description } : {}
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const [{ handle }, sp] = await Promise.all([params, searchParams])
  const result = await getCommerce().getCollection(handle, parseCollectionParams(sp).query)
  if (!result) notFound()
  return <CollectionView result={result} searchParams={sp} path={`/collections/${handle}`} />
}
