#!/bin/bash

# Digital Concierge Frontend Setup Script
echo "🚀 Setting up Digital Concierge Frontend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Stripe Configuration
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# API Configuration
REACT_APP_API_BASE_URL=http://localhost:18000/api

# App Configuration
REACT_APP_APP_NAME=Digital Concierge
REACT_APP_APP_VERSION=1.0.0
EOF
    echo "⚠️  Please update the .env file with your actual Stripe publishable key"
fi

# Create public directory structure
echo "📁 Creating public directory structure..."
mkdir -p public/images
mkdir -p public/icons

# Create favicon
echo "🎨 Creating favicon..."
cat > public/favicon.ico << EOF
# This would be a binary favicon file in a real setup
EOF

# Create manifest.json
echo "📱 Creating manifest.json..."
cat > public/manifest.json << EOF
{
  "short_name": "Digital Concierge",
  "name": "Digital Concierge - Building Management",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#2563eb",
  "background_color": "#ffffff"
}
EOF

# Create robots.txt
echo "🤖 Creating robots.txt..."
cat > public/robots.txt << EOF
User-agent: *
Allow: /

Sitemap: https://digitalconcierge.com/sitemap.xml
EOF

echo "✅ Frontend setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Update .env file with your Stripe publishable key"
echo "2. Run 'npm start' to start the development server"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "📚 Available scripts:"
echo "  npm start     - Start development server"
echo "  npm build     - Build for production"
echo "  npm test      - Run tests"
echo "  npm run eject - Eject from Create React App"
echo ""
echo "🔗 Backend API should be running on http://localhost:18000"
echo "💳 Make sure to configure Stripe keys in .env file"

