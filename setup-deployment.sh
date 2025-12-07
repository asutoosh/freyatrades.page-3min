#!/bin/bash
# Quick setup script for Azure deployment

echo "🚀 Freya Trades - Azure Deployment Setup"
echo "========================================"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
    git branch -M main
    echo "✅ Git initialized"
else
    echo "✅ Git already initialized"
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found"
    echo "   Copy env.local.template to .env.local and fill in your values"
else
    echo "✅ .env.local found"
fi

# Check node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Test build
echo ""
echo "🔨 Testing production build..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🎉 Setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Copy env.local.template to .env.local"
    echo "2. Fill in your environment variables"
    echo "3. Create GitHub repository"
    echo "4. Push code: git push -u origin main"
    echo "5. Set up GitHub secrets (see DEPLOYMENT_GUIDE.md)"
else
    echo "❌ Build failed - fix errors before deploying"
    exit 1
fi

