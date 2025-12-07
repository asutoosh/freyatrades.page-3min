# Quick setup script for Azure deployment (PowerShell)
Write-Host "🚀 Freya Trades - Azure Deployment Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "📦 Initializing Git repository..." -ForegroundColor Yellow
    git init
    git branch -M main
    Write-Host "✅ Git initialized" -ForegroundColor Green
} else {
    Write-Host "✅ Git already initialized" -ForegroundColor Green
}

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  Warning: .env.local not found" -ForegroundColor Yellow
    Write-Host "   Copy env.local.template to .env.local and fill in your values" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env.local found" -ForegroundColor Green
}

# Check node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Dependencies already installed" -ForegroundColor Green
}

# Test build
Write-Host ""
Write-Host "🔨 Testing production build..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Copy env.local.template to .env.local" -ForegroundColor White
    Write-Host "2. Fill in your environment variables" -ForegroundColor White
    Write-Host "3. Create GitHub repository" -ForegroundColor White
    Write-Host "4. Push code: git push -u origin main" -ForegroundColor White
    Write-Host "5. Set up GitHub secrets (see DEPLOYMENT_GUIDE.md)" -ForegroundColor White
} else {
    Write-Host "❌ Build failed - fix errors before deploying" -ForegroundColor Red
    exit 1
}

