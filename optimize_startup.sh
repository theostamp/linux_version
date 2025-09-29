#!/bin/bash

# Script to optimize Next.js startup time in development
# This script pre-warms the Next.js compilation cache

set -e

echo "🚀 Optimizing Next.js startup..."

cd frontend

# Create necessary cache directories
mkdir -p node_modules/.cache/next
mkdir -p .next/cache

echo "📦 Pre-warming Next.js cache..."

# Set environment variables for faster startup
export NEXT_TELEMETRY_DISABLED=1
export NODE_ENV=development

# Pre-compile key pages to warm up the cache
echo "🔥 Pre-compiling critical pages..."

# Create a temporary server to trigger compilation
npm run dev &
DEV_PID=$!

echo "⏳ Waiting for Next.js to start..."
sleep 10

# Make requests to trigger page compilation
echo "📄 Triggering page compilation..."
curl -s http://localhost:3000/ > /dev/null || true
curl -s http://localhost:3000/login > /dev/null || true
curl -s http://localhost:3000/dashboard > /dev/null || true

echo "⏹️  Stopping development server..."
kill $DEV_PID 2>/dev/null || true
wait $DEV_PID 2>/dev/null || true

echo "✅ Startup optimization complete!"
echo "💡 Next startup should be significantly faster."

cd ..