import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // The whole stylesheet is ~5 kB, so inlining it beats a render-blocking request
    // on a cold mobile load. Revisit if the CSS grows or repeat visits dominate.
    inlineCss: true,
  },
  images: {
    // Product art is generated at 1200x1500 (4:5). These widths cover a 2-4 column
    // grid on phones through a 50vw product hero on large desktops.
    deviceSizes: [390, 640, 828, 1080, 1200],
    imageSizes: [96, 160, 256, 320],
    formats: ['image/avif', 'image/webp'],
    // Allow Shopify's CDN once the Storefront API adapter is switched on.
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.shopify.com' }],
  },
}

export default nextConfig
