# 🚀 Azure Deployment Guide for Freya Trades

Complete step-by-step guide to deploy your app to Azure using GitHub Actions.

## 📋 Prerequisites

✅ **Already Completed:**
- Azure subscription: `191e39b8-461a-487b-987f-dbddc639dc72`
- App Service: `freyatrades`
- Resource Group: `freya_group`
- Location: Central India
- Cosmos DB: `freya-database` (MongoDB API)
- Node 20 LTS configured
- Basic B1 SKU

---

## Step 1: Get Azure App Service Publish Profile

### 1.1 Download Publish Profile

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your App Service: **freyatrades**
3. Click **Get publish profile** button (top toolbar)
4. Save the file as `freyatrades.PublishSettings`

**⚠️ Important:** This file contains credentials - keep it secret!

### 1.2 Save as GitHub Secret

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
5. Value: Open `freyatrades.PublishSettings` file, copy **ALL** contents (it's XML)
6. Click **Add secret**

---

## Step 2: Get Cosmos DB Connection String

### 2.1 Get Connection String

1. Go to Azure Portal
2. Navigate to **freya-database** (Cosmos DB account)
3. Click **Connection strings** in left menu
4. Copy the **PRIMARY CONNECTION STRING**
5. It should look like:
   ```
   mongodb://freya-server:password@freya-server.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@freya-server@
   ```

### 2.2 Save as GitHub Secret

1. In GitHub → **Settings** → **Secrets** → **Actions**
2. Click **New repository secret**
3. Name: `AZURE_COSMOS_CONNECTION_STRING`
4. Value: Paste your connection string
5. Click **Add secret**

---

## Step 3: Set All Environment Variables in Azure

### 3.1 Configure App Service Settings

1. Go to Azure Portal → **freyatrades** App Service
2. Click **Configuration** → **Application settings**
3. Click **+ New application setting** for each:

| Name | Value | Notes |
|------|-------|-------|
| `AZURE_COSMOS_CONNECTION_STRING` | Your connection string | From Step 2 |
| `AZURE_COSMOS_DB_NAME` | `freyatrades` | Database name |
| `IP2LOCATION_API_KEY` | Your API key | Get from ip2location.io |
| `RESTRICTED_COUNTRIES` | `IN` | Comma-separated country codes |
| `PREVIEW_DURATION_SECONDS` | `180` | 3 minutes |
| `VPN_MAX_RETRIES` | `5` | Max VPN attempts |
| `VPN_RETRY_WINDOW_HOURS` | `2` | VPN window |
| `INGEST_API_KEY` | Generate random string | See below |
| `WEBSITE_API_URL` | `https://freyatrades.azurewebsites.net` | Your app URL |
| `NEXT_PUBLIC_TRIAL_TELEGRAM_URL` | Your Telegram link | |
| `NEXT_PUBLIC_TRIAL_WHOP_URL` | Your Whop link | |
| `NEXT_PUBLIC_INNER_CIRCLE_URL` | Your Inner Circle link | |
| `TELEGRAM_BOT_TOKEN` | Your bot token | From @BotFather |
| `TELEGRAM_SOURCE_CHANNEL_ID` | `-100xxxxx` | Your channel ID |

### 3.2 Generate INGEST_API_KEY

Run this command (or use online generator):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it for `INGEST_API_KEY`

### 3.3 Enable Build During Deployment

1. Still in **Configuration**
2. Add setting:
   - Name: `SCM_DO_BUILD_DURING_DEPLOYMENT`
   - Value: `true`
3. Click **Save**

---

## Step 4: Push Code to GitHub

### 4.1 Initialize Git (if not done)

```bash
cd "I:\telegram whop\website 3"

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Freya Trades Preview Hub"
```

### 4.2 Create GitHub Repository

1. Go to [GitHub](https://github.com)
2. Click **New repository**
3. Name: `freyatrades-preview` (or any name)
4. Choose **Private** (recommended for security)
5. **Don't** initialize with README
6. Click **Create repository**

### 4.3 Push Code

```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/freyatrades-preview.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Step 5: Configure GitHub Actions

### 5.1 The workflow file is already created!

The file `.github/workflows/azure-deploy.yml` is already in your repo.

### 5.2 Ensure Secrets are Set

Double-check these secrets exist in GitHub:
- ✅ `AZURE_WEBAPP_PUBLISH_PROFILE`
- ✅ `AZURE_COSMOS_CONNECTION_STRING` (if you want it in GitHub secrets too, but it's better in Azure App Settings)

---

## Step 6: Deploy!

### 6.1 Automatic Deployment

Every push to `main` branch will trigger deployment automatically!

```bash
# Make any change and push
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 6.2 Manual Deployment

1. Go to GitHub → Your repo → **Actions** tab
2. Click **Deploy to Azure App Service**
3. Click **Run workflow** → **Run workflow**

### 6.3 Monitor Deployment

1. Click on the workflow run
2. Watch the progress:
   - ✅ Checkout code
   - ✅ Set up Node.js
   - ✅ Install dependencies
   - ✅ Build Next.js app
   - ✅ Deploy to Azure Web App

---

## Step 7: Verify Deployment

### 7.1 Check App is Running

Visit: **https://freyatrades.azurewebsites.net/money-glitch**

### 7.2 Test Features

1. **Onboarding popups** should show
2. **3-second loading** should work
3. **Security checks** should run
4. **Signals** should display

### 7.3 Check Logs

In Azure Portal:
1. Go to **freyatrades** App Service
2. Click **Log stream** or **Logs**
3. Check for errors

Or use Azure CLI:
```bash
az webapp log tail --name freyatrades --resource-group freya_group
```

---

## Step 8: Configure Custom Domain (Optional)

### 8.1 Add Domain

1. Azure Portal → **freyatrades** → **Custom domains**
2. Click **+ Add custom domain**
3. Enter: `live.freyatrades.page`
4. Follow DNS setup instructions

### 8.2 Enable HTTPS

1. In **Custom domains**
2. Click on your domain
3. **Add binding** → **App Service Managed Certificate** (Free!)
4. Click **Create**

---

## Step 9: Deploy Telegram Bot

### Option A: Azure Container Instances (Recommended)

```bash
# Create container registry
az acr create --name freyaregistry --resource-group freya_group --sku Basic

# Create Dockerfile for bot
# (I'll create this file next)

# Build and deploy
az acr build --registry freyaregistry --image freya-bot:latest .
az container create \
  --resource-group freya_group \
  --name freya-bot \
  --image freyaregistry.azurecr.io/freya-bot:latest \
  --environment-variables \
    TELEGRAM_BOT_TOKEN=your_token \
    WEBSITE_API_URL=https://freyatrades.azurewebsites.net \
    INGEST_API_KEY=your_key
```

### Option B: Small VM

1. Create VM (B1s - ~$4/month)
2. SSH into it
3. Clone repo
4. Run bot with PM2

---

## 🔧 Troubleshooting

### Issue: Deployment fails with "Build failed"

**Solution:**
1. Check logs in GitHub Actions
2. Ensure `SCM_DO_BUILD_DURING_DEPLOYMENT=true` in Azure
3. Test build locally: `npm run build`

### Issue: "Cannot find module 'mongodb'"

**Solution:**
- Check `package.json` has `mongodb` dependency
- Run `npm install` locally to verify

### Issue: Database connection fails

**Solution:**
1. Check connection string is correct
2. Ensure Cosmos DB firewall allows Azure services
3. Check virtual network settings (you have VNet configured)

### Issue: App shows 502 Bad Gateway

**Solution:**
1. Check App Service logs
2. Verify Node.js version is 20
3. Check environment variables are set

### Issue: Signals not showing

**Solution:**
1. Verify `/api/signals` endpoint works
2. Check Cosmos DB has `signals` collection
3. Check browser console for errors

---

## 📊 Monitoring & Stats

### Check App Status

```bash
az webapp show --name freyatrades --resource-group freya_group --query state
```

### View Admin Stats

```bash
curl -H "Authorization: Bearer YOUR_INGEST_API_KEY" \
  https://freyatrades.azurewebsites.net/api/admin/stats
```

---

## 🔐 Security Checklist

- [ ] `.gitignore` includes `.env*` files
- [ ] No secrets committed to GitHub
- [ ] Publish profile stored as GitHub secret
- [ ] Connection string in Azure App Settings
- [ ] INGEST_API_KEY is strong random string
- [ ] HTTPS enabled on custom domain
- [ ] Cosmos DB firewall configured

---

## 📁 Repository Structure

```
freyatrades-preview/
├── .github/
│   └── workflows/
│       └── azure-deploy.yml    # GitHub Actions workflow
├── app/                         # Next.js app
├── bot/                         # Telegram bot
├── lib/
│   └── db/                      # Database integrations
├── .gitignore                   # Git ignore rules
├── package.json
└── DEPLOYMENT_GUIDE.md          # This file
```

---

## ✅ Deployment Checklist

1. [ ] Publish profile saved as GitHub secret
2. [ ] Cosmos DB connection string added to Azure App Settings
3. [ ] All environment variables configured in Azure
4. [ ] Code pushed to GitHub
5. [ ] GitHub Actions workflow runs successfully
6. [ ] App accessible at `https://freyatrades.azurewebsites.net`
7. [ ] Test onboarding flow works
8. [ ] Test signals display correctly
9. [ ] Custom domain configured (optional)
10. [ ] Telegram bot deployed (optional)

---

## 🎉 Success!

Once deployed, your app will be live at:
**https://freyatrades.azurewebsites.net**

Every push to `main` will automatically deploy! 🚀

---

## 📞 Need Help?

- Check Azure App Service logs
- Check GitHub Actions logs
- Verify environment variables
- Test locally first: `npm run build`

Good luck! 🎯

