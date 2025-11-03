#!/bin/bash
# frontend/entrypoint.sh

echo "📦 Installing dependencies..."
npm install

echo "🚀 Starting Next.js dev server..."
npm run dev
