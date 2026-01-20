import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb', // Allow up to 5MB for file uploads (matches our validation limit)
    },
  },
};

export default nextConfig;
