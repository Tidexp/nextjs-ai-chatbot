import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        hostname: '0jc8kg4apuhzlwwd.public.blob.vercel-storage.com',
      },
    ],
  },
};

export default nextConfig;
