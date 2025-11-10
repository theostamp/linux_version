// PWA configuration (disabled - package not installed)
const withPWA = (config) => config;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable experimental features that cause CSS to be loaded as scripts
  experimental: {
    // Disable CSS optimization that causes CSS to be loaded as scripts
    optimizeCss: false,
    // Disable CSS chunking that causes CSS to be loaded as scripts
    cssChunking: 'strict',
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
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://m.stripe.network https://gc.kis.v2.scr.kaspersky-labs.com; style-src 'self' 'unsafe-inline' https://m.stripe.network https://gc.kis.v2.scr.kaspersky-labs.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://m.stripe.network wss://gc.kis.v2.scr.kaspersky-labs.com;",
  },

  // Compression
  compress: true,

  // Performance optimizations
  poweredByHeader: false,
  generateEtags: false,

  // Rewrites to proxy API calls to backend (for Vercel deployment)
  async rewrites() {
    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'https://linuxversion-production.up.railway.app';
    
    // Only configure rewrites if we have a backend URL
    if (backendUrl && !backendUrl.includes('localhost')) {
      console.log('Configuring API rewrites to proxy routes');
      
      // Use beforeFiles and afterFiles to ensure Next.js API routes have priority
      return {
        beforeFiles: [
          // Explicit routes for Next.js API route handlers
          // These must be processed BEFORE the catch-all proxy rewrite
          {
            source: '/api/projects/offers/:path*',
            destination: '/api/projects/offers/:path*',
          },
          {
            source: '/api/projects/projects/:path*',
            destination: '/api/projects/projects/:path*',
          },
          {
            source: '/api/projects/contracts/:path*',
            destination: '/api/projects/contracts/:path*',
          },
          {
            source: '/api/projects/rfqs/:path*',
            destination: '/api/projects/rfqs/:path*',
          },
          {
            source: '/api/projects/dashboard/:path*',
            destination: '/api/projects/dashboard/:path*',
          },
          {
            source: '/api/maintenance/contractors/:path*',
            destination: '/api/maintenance/contractors/:path*',
          },
          {
            source: '/api/financial/:type(common-expenses|previous-balance)/:path*',
            destination: '/api/financial/:type/:path*',
          },
        ],
        afterFiles: [
          // All other API routes go through proxy
          // This is processed AFTER Next.js checks for matching route files
          {
            source: '/api/:path*',
            destination: '/api/proxy/:path*',
          },
        ],
      };
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

    // Optimize imports and CSS handling
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // CSS chunks should be loaded as link tags, not scripts
          styles: {
            name: 'styles',
            test: /\.(css|scss|sass)$/,
            chunks: 'all',
            enforce: true,
            priority: 30, // Higher priority than vendor
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          kiosk: {
            test: /[\\/]components[\\/]kiosk[\\/]/,
            name: 'kiosk',
            chunks: 'all',
            priority: 5,
          },
          widgets: {
            test: /[\\/]components[\\/]kiosk[\\/]widgets[\\/]/,
            name: 'widgets',
            chunks: 'all',
            priority: 5,
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
        destination: '/kiosk-display',
        permanent: false,
      },
    ];
  },

  // Output configuration
  output: 'standalone',
  
  // Fix workspace root detection
  outputFileTracingRoot: __dirname,
  
  // Trailing slash - disabled to prevent redirect loops with API rewrites
  trailingSlash: false,

  // Build optimizations for faster builds
  swcMinify: true,
  
  // Reduce build time by skipping type checking during build
  typescript: {
    // Type checking is done separately, skip during build
    ignoreBuildErrors: false, // Keep false for production, but can be set to true if needed
  },
  
  // Skip ESLint during build for faster builds (linting should be done in CI)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Optimize production builds
  productionBrowserSourceMaps: false,
  
  // Reduce memory usage during build
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);