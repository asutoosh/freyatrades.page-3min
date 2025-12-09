# 🚀 Azure Deployment Guide

Complete guide to deploy Freya Trades Preview Hub on Microsoft Azure.

## 📋 Overview

You'll set up:
1. **Azure Cosmos DB** - Database for IP tracking & signals
2. **Azure App Service** - Hosting for the website
3. **Azure Container Instances** (optional) - For running the Telegram bot

---

## Step 1: Create Azure Cosmos DB

### 1.1 Create Cosmos DB Account

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource**
3. Search for **Azure Cosmos DB**
4. Click **Create**
5. Select **Azure Cosmos DB for MongoDB** (API)
6. Fill in:
   - **Subscription**: Your subscription
   - **Resource Group**: Create new → `freyatrades-rg`
   - **Account Name**: `freyatrades-db` (must be unique)
   - **Location**: Choose closest to your users (e.g., `West Europe`)
   - **Capacity mode**: **Serverless** (pay per use, cheapest for low traffic)
7. Click **Review + create** → **Create**
8. Wait for deployment (~5 minutes)

### 1.2 Get Connection String

1. Go to your Cosmos DB account
2. Click **Settings** → **Connection String**
3. Copy the **PRIMARY CONNECTION STRING**
4. Save it - you'll need it for the app

### 1.3 Create Database & Collections (Automatic)

The app will create these automatically on first run:
- Database: `freyatrades`
- Collections: `ip_access`, `signals`

---

## Step 2: Create Azure App Service

### 2.1 Create App Service

1. In Azure Portal, click **Create a resource**
2. Search for **Web App**
3. Click **Create**
4. Fill in:
   - **Subscription**: Your subscription
   - **Resource Group**: `freyatrades-rg` (same as DB)
   - **Name**: `freyatrades-preview` (your URL will be `freyatrades-preview.azurewebsites.net`)
   - **Publish**: **Code**
   - **Runtime stack**: **Node 20 LTS**
   - **Operating System**: **Linux**
   - **Region**: Same as your Cosmos DB
   - **Pricing plan**: 
     - For testing: **Free F1**
     - For production: **Basic B1** ($13/month) or **Standard S1**
5. Click **Review + create** → **Create**

### 2.2 Configure App Settings (Environment Variables)

1. Go to your App Service
2. Click **Settings** → **Configuration**
3. Click **+ New application setting** for each:

| Name | Value |
|------|-------|
| `AZURE_COSMOS_CONNECTION_STRING` | Your Cosmos DB connection string |
| `AZURE_COSMOS_DB_NAME` | `freyatrades` |
| `IP2LOCATION_API_KEY` | Your IP2Location API key |
| `RESTRICTED_COUNTRIES` | `IN` |
| `PREVIEW_DURATION_SECONDS` | `180` |
| `VPN_MAX_RETRIES` | `5` |
| `VPN_RETRY_WINDOW_HOURS` | `2` |
| `INGEST_API_KEY` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_TRIAL_TELEGRAM_URL` | Your Telegram invite link |
| `NEXT_PUBLIC_TRIAL_WHOP_URL` | Your Whop link |
| `NEXT_PUBLIC_INNER_CIRCLE_URL` | Your Inner Circle link |

4. Click **Save**

### 2.3 Enable Build During Deployment

1. In App Service → **Configuration**
2. Add setting:
   - Name: `SCM_DO_BUILD_DURING_DEPLOYMENT`
   - Value: `true`
3. Click **Save**

---

## Step 3: Deploy the Code

### Option A: Deploy via GitHub Actions (Recommended)

1. Push your code to GitHub
2. In App Service → **Deployment Center**
3. Select **GitHub**
4. Authorize and select your repo
5. Azure will create a workflow file automatically
6. Every push to `main` will deploy

### Option B: Deploy via Azure CLI

```bash
# Install Azure CLI
# Windows: winget install Microsoft.AzureCLI
# Mac: brew install azure-cli

# Login
az login

# Set subscription (if multiple)
az account set --subscription "Your Subscription Name"

# Deploy
cd "I:\telegram whop\website 3"
az webapp up --name freyatrades-preview --resource-group freyatrades-rg --runtime "NODE:20-lts"
```

### Option C: Deploy via VS Code

1. Install **Azure App Service** extension
2. Sign in to Azure
3. Right-click your App Service → **Deploy to Web App**
4. Select your folder

---

## Step 4: Set Up Custom Domain (Optional)

### 4.1 Add Custom Domain

1. In App Service → **Custom domains**
2. Click **+ Add custom domain**
3. Enter: `live.freyatrades.page`
4. Follow DNS configuration instructions
5. Add CNAME record pointing to `freyatrades-preview.azurewebsites.net`

### 4.2 Enable HTTPS

1. In **Custom domains** → Click your domain
2. Click **Add binding**
3. Select **App Service Managed Certificate** (free!)
4. Click **Create**

---

## Step 5: Deploy Telegram Bot

### Option A: Run on Azure Container Instances

1. Create a `Dockerfile` for the bot:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY bot/package*.json ./
RUN npm install
COPY bot/ ./
CMD ["npx", "ts-node", "telegram-bot.ts"]
```

2. Build and push to Azure Container Registry:

```bash
# Create container registry
az acr create --name freyatradesreg --resource-group freyatrades-rg --sku Basic

# Build and push
az acr build --registry freyatradesreg --image freya-bot:latest --file bot/Dockerfile .

# Create container instance
az container create \
  --resource-group freyatrades-rg \
  --name freya-bot \
  --image freyatradesreg.azurecr.io/freya-bot:latest \
  --cpu 0.5 \
  --memory 0.5 \
  --environment-variables \
    TELEGRAM_BOT_TOKEN=your_token \
    TELEGRAM_SOURCE_CHANNEL_ID=your_channel_id \
    WEBSITE_API_URL=https://freyatrades-preview.azurewebsites.net \
    INGEST_API_KEY=your_key
```

### Option B: Run on a VPS/VM (Cheaper for 24/7)

1. Create a small Azure VM (B1s - ~$4/month)
2. SSH into it
3. Clone your repo
4. Install Node.js
5. Run the bot with PM2:

```bash
npm install -g pm2
cd bot && npm install
pm2 start telegram-bot.ts --interpreter npx ts-node
pm2 save
pm2 startup
```

### Option C: Run Locally (For Testing)

```bash
cd bot
npm install
npm start
```

---

## 📊 Estimated Costs

| Service | Tier | Est. Monthly Cost |
|---------|------|-------------------|
| Cosmos DB | Serverless | $0-5 (low traffic) |
| App Service | Basic B1 | $13 |
| App Service | Free F1 | $0 (limited) |
| Container Instance | 0.5 vCPU | ~$15 |
| VM (B1s) | Basic | ~$4 |
| Custom Domain SSL | Managed | Free |

**Total for production**: ~$17-30/month

---

## 🔧 Troubleshooting

### Check Logs

```bash
# Stream live logs
az webapp log tail --name freyatrades-preview --resource-group freyatrades-rg

# Or in Azure Portal:
# App Service → Monitoring → Log stream
```

### Common Issues

**1. "Cannot find module" errors**
- Ensure `SCM_DO_BUILD_DURING_DEPLOYMENT=true`
- Redeploy

**2. Database connection fails**
- Check connection string is correct
- Ensure Cosmos DB firewall allows Azure services

**3. 502 Bad Gateway**
- Check logs for startup errors
- Ensure `npm run build` succeeds locally

**4. Slow cold starts**
- Upgrade from Free tier to Basic
- Enable "Always On" in Configuration

---

## 🔐 Security Checklist

- [ ] Cosmos DB firewall configured
- [ ] INGEST_API_KEY is a strong random string
- [ ] HTTPS enabled
- [ ] Environment variables set (not in code)
- [ ] IP2Location API key secured

---

## 📁 Project Structure for Azure

```
freyatrades/
├── app/                    # Next.js app
├── components/             # React components
├── lib/
│   ├── db/                # Database integrations
│   │   ├── mongodb.ts     # Cosmos DB connection
│   │   ├── ip-store-db.ts # IP tracking
│   │   └── signals-store-db.ts
│   └── ...
├── bot/                    # Telegram bot (deploy separately)
├── package.json
└── next.config.js
```

---

## ✅ Deployment Checklist

1. [ ] Create Cosmos DB account (Serverless)
2. [ ] Get Cosmos DB connection string
3. [ ] Create App Service (Node 20)
4. [ ] Configure environment variables
5. [ ] Deploy code (GitHub/CLI/VS Code)
6. [ ] Test the website
7. [ ] Set up custom domain (optional)
8. [ ] Deploy Telegram bot
9. [ ] Test end-to-end flow

---

Need help? Check Azure documentation or ask!

