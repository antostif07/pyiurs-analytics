import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['images.pyiurs.com', 'pyiurs.com'],
    unoptimized: true,
  },
  eslint: {
    // Désactive ESLint pendant le build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Désactive aussi les vérifications TypeScript pendant le build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
