import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/billing/invoices/*': ['./lib/billing/fonts/*'],
  },
  /* config options here */
  experimental: {
    viewTransition: true,
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
}

export default nextConfig
