# ⚡ Quick Start - Push to GitHub & Deploy

Follow these steps to push your code and deploy to Azure.

## 📋 Step-by-Step

### 1. Initialize Git (if not done)

```powershell
# Make sure you're in the project directory
cd "I:\telegram whop\website 3"

# Initialize git
git init
git branch -M main

# Add all files
git add .

# Commit
git commit -m "Initial commit: Freya Trades Preview Hub with Azure deployment"
```

### 2. Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Repository name: `freyatrades-preview` (or any name you like)
3. Choose **Private** (recommended)
4. **Don't** check "Initialize with README"
5. Click **Create repository**

### 3. Push Code to GitHub

```powershell
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/freyatrades-preview.git

# Verify remote
git remote -v

# Push to GitHub
git push -u origin main
```

**First time?** GitHub will ask for login credentials.

### 4. Get Azure Publish Profile

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **freyatrades** App Service
3. Click **Get publish profile** (top toolbar)
4. Save file (it downloads automatically)

### 5. Add GitHub Secret

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
4. Value: Open the downloaded `.PublishSettings` file, copy **ALL** content (it's XML)
5. Click **Add secret**

### 6. Set Environment Variables in Azure

Go to Azure Portal → **freyatrades** → **Configuration** → **Application settings**

Click **+ New application setting** for each:

```
AZURE_COSMOS_CONNECTION_STRING = (your Cosmos DB connection string)
AZURE_COSMOS_DB_NAME = freyatrades
IP2LOCATION_API_KEY = (your API key)
RESTRICTED_COUNTRIES = IN
PREVIEW_DURATION_SECONDS = 180
VPN_MAX_RETRIES = 5
VPN_RETRY_WINDOW_HOURS = 2
INGEST_API_KEY = (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
WEBSITE_API_URL = https://freyatrades.azurewebsites.net
NEXT_PUBLIC_TRIAL_TELEGRAM_URL = (your Telegram link)
NEXT_PUBLIC_TRIAL_WHOP_URL = (your Whop link)
NEXT_PUBLIC_INNER_CIRCLE_URL = (your Inner Circle link)
TELEGRAM_BOT_TOKEN = (your bot token)
TELEGRAM_SOURCE_CHANNEL_ID = (your channel ID)
SCM_DO_BUILD_DURING_DEPLOYMENT = true
```

**Important:** Click **Save** after adding all settings!

### 7. Deploy!

#### Option A: Automatic (Push to main)
```powershell
# Make any change and push
git add .
git commit -m "Ready for deployment"
git push origin main
```

The GitHub Action will automatically deploy! ✅

#### Option B: Manual
1. Go to GitHub → Your repo → **Actions** tab
2. Click **Deploy to Azure App Service**
3. Click **Run workflow** → **Run workflow**

### 8. Check Deployment Status

1. Go to **Actions** tab in GitHub
2. Click on the running workflow
3. Watch the steps:
   - ✅ Checkout code
   - ✅ Set up Node.js
   - ✅ Install dependencies
   - ✅ Build Next.js app
   - ✅ Deploy to Azure Web App

### 9. Test Your App

Visit: **https://freyatrades.azurewebsites.net/money-glitch**

You should see:
- ✅ Onboarding popups
- ✅ Loading screen
- ✅ Main UI with signals

---

## 🎉 Success!

Your app is now live! 🚀

**URL:** https://freyatrades.azurewebsites.net

Every push to `main` will automatically deploy!

---

## 🆘 Troubleshooting

### Deployment fails?

1. **Check GitHub Actions logs**
   - Go to Actions tab → Click failed workflow → Check error messages

2. **Common issues:**
   - Build fails → Test locally: `npm run build`
   - Missing env vars → Check Azure App Settings
   - Database error → Verify connection string

### App shows error?

1. **Check Azure logs:**
   - Azure Portal → freyatrades → Log stream

2. **Check environment variables:**
   - All required vars are set in Azure App Settings

---

## 📚 Full Documentation

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete guide.

---

Good luck! 🎯

