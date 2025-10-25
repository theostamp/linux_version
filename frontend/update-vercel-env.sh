#!/bin/bash

# Script to update Vercel environment variables from env.production file
# Usage: ./update-vercel-env.sh

echo "🚀 Updating Vercel Environment Variables..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel. Please login first:"
    echo "   vercel login"
    exit 1
fi

# Read environment variables from env.production and update Vercel
echo "📝 Reading environment variables from env.production..."

while IFS='=' read -r key value; do
    # Skip comments and empty lines
    if [[ $key =~ ^[[:space:]]*# ]] || [[ -z $key ]]; then
        continue
    fi
    
    # Remove quotes from value if present
    value=$(echo "$value" | sed 's/^"//;s/"$//')
    
    echo "🔧 Setting $key=$value"
    
    # Set environment variable in Vercel
    vercel env add "$key" production <<< "$value"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully set $key"
    else
        echo "❌ Failed to set $key"
    fi
    
done < env.production

echo "🎉 Environment variables update completed!"
echo "🔄 Redeploying Vercel app..."

# Trigger a new deployment
vercel --prod

echo "✅ Done! Check your Vercel dashboard for the new deployment."

