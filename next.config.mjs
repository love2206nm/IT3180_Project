import { SECURITY_HEADERS } from './src/infrastructure/config/security.config.ts';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [...SECURITY_HEADERS],
      },
    ];
  },
};

export default nextConfig;
