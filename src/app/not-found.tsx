import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="container" style={{ padding: '4rem var(--gutter)', display: 'grid', gap: '1rem', justifyItems: 'start' }}>
      <h1>Page not found</h1>
      <p>That product or collection doesn&rsquo;t exist.</p>
      <Link href="/" className="button">
        Back to the shop
      </Link>
    </div>
  )
}
