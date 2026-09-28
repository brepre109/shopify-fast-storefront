import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { CartProvider } from '@/components/cart/CartProvider'
import { Header } from '@/components/layout/Header'
import { getCommerce } from '@/lib/commerce'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Fernwick Goods', template: '%s · Fernwick Goods' },
  description: 'A fast, accessible headless storefront demo for a fictional homewares brand.',
}

export const viewport: Viewport = {
  themeColor: '#f6f2ea',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <div id="page">
            <a href="#main" className="skip-link">
              Skip to content
            </a>
            <Header />
            <main id="main" tabIndex={-1}>
              {children}
            </main>
            <footer className="container" style={{ padding: '3rem var(--gutter)', color: 'var(--muted)' }}>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                Fernwick Goods is a fictional brand. Data source: {getCommerce().name}.
              </p>
            </footer>
          </div>
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  )
}
