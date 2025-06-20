import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // your existing config
  },
  images: {
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
  },
}

export default nextConfig;
