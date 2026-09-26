import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    viewTransition: true,
    serverActions: {
      bodySizeLimit: '6mb',
    }
  }
};

export default nextConfig;
