// PWA configuration (disabled in development to avoid errors)
let withPWA;
try {
  withPWA = require('@ducanh2912/next-pwa').default({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
    skipWaiting: true,
  });
} catch (error) {
  // Fallback if PWA package not installed
  console.log('PWA package not found, running without PWA support');
  withPWA = (config) => config;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
  },

  // Turbopack configuration (moved from experimental.turbo)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://m.stripe.network https://gc.kis.v2.scr.kaspersky-labs.com; style-src 'self' 'unsafe-inline' https://m.stripe.network https://gc.kis.v2.scr.kaspersky-labs.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://m.stripe.network wss://gc.kis.v2.scr.kaspersky-labs.com;",
  },

  // Compression
  compress: true,

  // Performance optimizations
  poweredByHeader: false,
  generateEtags: false,

  // Rewrites to proxy API calls to backend (for Vercel deployment)
  async rewrites() {
    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';
    
    // Only configure rewrites if we have a backend URL
    if (backendUrl && !backendUrl.includes('localhost')) {
      // Remove trailing slash from backendUrl if present
      const cleanBackendUrl = backendUrl.replace(/\/+$/, '');
      console.log('Configuring API rewrites to:', cleanBackendUrl);
      return [
        {
          source: '/api/:path*',
          destination: `${cleanBackendUrl}/:path*`,
        },
      ];
    }
    
    // No rewrites for localhost (direct connection)
    return [];
  },
  
  // Bundle analyzer (enable with ANALYZE=true)
  webpack: (config, { dev, isServer }) => {
    // Bundle analyzer
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          analyzerPort: isServer ? 8888 : 8889,
          openAnalyzer: true,
        })
      );
    }

    // Optimize imports
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          kiosk: {
            test: /[\\/]components[\\/]kiosk[\\/]/,
            name: 'kiosk',
            chunks: 'all',
          },
          widgets: {
            test: /[\\/]components[\\/]kiosk[\\/]widgets[\\/]/,
            name: 'widgets',
            chunks: 'all',
          },
        },
      };
    }

    // SVG handling
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Headers for better caching
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Redirects for better SEO
  async redirects() {
    return [
      {
        source: '/kiosk',
        destination: '/kiosk/1',
        permanent: false,
      },
    ];
  },

  // Output configuration
  output: 'standalone',
  
  // Fix workspace root detection
  outputFileTracingRoot: __dirname,
  
  // Trailing slash - keep trailing slashes for API compatibility
  trailingSlash: true,
};

module.exports = withPWA(nextConfig);