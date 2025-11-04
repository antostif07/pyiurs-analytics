import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['images.pyiurs.com', 'pyiurs.com'],
    unoptimized: true,
  },
};

export default nextConfig;
