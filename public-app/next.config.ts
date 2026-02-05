import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isProd ? [] : ["'unsafe-eval'"]),
  "https://js.stripe.com",
  "https://m.stripe.network",
];
const styleSrc = [
  "'self'",
  "'unsafe-inline'",
  "https://fonts.googleapis.com",
  "https://m.stripe.network",
];
const cspBase = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  `script-src ${scriptSrc.join(" ")}`,
  `style-src ${styleSrc.join(" ")}`,
  "img-src 'self' data: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https: wss:",
  "frame-src https://js.stripe.com https://m.stripe.network",
].join("; ");

const cspPlasmic = cspBase.replace(
  "frame-ancestors 'self'",
  "frame-ancestors 'self' https://studio.plasmic.app https://*.plasmic.app https://*.trycloudflare.com",
);

const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: false,
    cssChunking: "strict",
  },
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      // Plasmic CDN (commonly used for images/assets)
      { protocol: "https", hostname: "img.plasmic.app", pathname: "/**" },
      { protocol: "https", hostname: "static.plasmic.app", pathname: "/**" },
      { protocol: "https", hostname: "static1.plasmic.app", pathname: "/**" },
      { protocol: "https", hostname: "static2.plasmic.app", pathname: "/**" },
      { protocol: "https", hostname: "cdn.plasmic.app", pathname: "/**" },
    ],
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
  // Force deployment 2025-11-27 14:25 - Users API route fix deployed
  async headers() {
    return [
      // Plasmic host: allow embedding in Plasmic Studio iframe
      {
        source: "/plasmic-host",
        headers: [
          // Content-Security-Policy frame-ancestors is the modern replacement for X-Frame-Options
          {
            key: "Content-Security-Policy",
            value: cspPlasmic,
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspBase,
          },
        ],
      },
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
  // eslint configuration was removed in Next.js 16
  // Use eslint.config.mjs or biome for linting
  typescript: {
    ignoreBuildErrors: true,
  },
  // React Strict Mode στο dev μπορεί να κάνει double-mount που μπερδεύει το Plasmic host
  // (π.χ. "__plasmicData has already been declared"). Το απενεργοποιούμε μόνο όταν
  // τρέχουμε `npm run dev:plasmic` (PLASMIC_DEV=1).
  reactStrictMode: process.env.PLASMIC_DEV ? false : true,
  productionBrowserSourceMaps: false,
  trailingSlash: false,
};

export default nextConfig;
