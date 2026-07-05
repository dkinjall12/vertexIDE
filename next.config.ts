import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The /api/template route reads starter templates from the vibecode-starters
  // directory at runtime via fs. Next.js file tracing only bundles files that
  // are statically imported, so we must explicitly include this directory or the
  // files won't exist in the serverless function (ENOENT on Vercel).
  outputFileTracingIncludes: {
    "/api/template/[id]": ["./vibecode-starters/**/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/playground/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
        ],
      },
    ];
  },
  reactStrictMode:false
};

export default nextConfig;