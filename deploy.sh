#!/bin/bash

# Deployment script for Vercel frontend deployment

echo "🚀 Preparing project for Vercel deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the client
echo "🔨 Building client..."
npm run build:client

# Check if build was successful
if [ ! -d "dist/public" ]; then
    echo "❌ Error: Build failed. dist/public directory not found."
    exit 1
fi

echo "✅ Build completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Push your code to GitHub/GitLab/Bitbucket"
echo "2. Go to https://vercel.com/new"
echo "3. Import your repository"
echo "4. Set environment variable: VITE_API_URL=https://your-backend-domain.com"
echo "5. Deploy!"
echo ""
echo "📁 Build output: dist/public/"
echo "📖 See DEPLOYMENT.md for detailed instructions"
