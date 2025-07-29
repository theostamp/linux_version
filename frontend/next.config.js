/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // ΔΕΝ θα εκτελεστεί στον browser
    const apiBase = process.env.BACKEND_INTERNAL_URL || 'http://demo.localhost:8000';
    return [
      { source: '/api/:path*', destination: `${apiBase}/api/:path*` },
    ];
  },
};
module.exports = nextConfig;
