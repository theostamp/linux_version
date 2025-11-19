import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: false,
    cssChunking: "strict",
  },
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy:
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://m.stripe.network https://gc.kis.v2.scr.kaspersky-labs.com; style-src 'self' 'unsafe-inline' https://m.stripe.network https://gc.kis.v2.scr.kaspersky-labs.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://m.stripe.network wss://gc.kis.v2.scr.kaspersky-labs.com;",
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  // Removed rewrites - route handlers have priority
  // Routes without specific handlers will return 404
  // If fallback proxy is needed, it should be handled at the route handler level
  // Force deployment 2025-11-13 23:59 - CreateBuildingForm components deployed
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/kiosk",
        destination: "/kiosk-display",
        permanent: false,
      },
      {
        source: "/financial/common-expenses",
        destination: "/financial?tab=calculator",
        permanent: false,
      },
      {
        source: "/financial/reports",
        destination: "/financial?tab=history",
        permanent: false,
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  trailingSlash: false,
};

export default nextConfig;
