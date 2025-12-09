# 🎯 Freya Trades Preview Hub

Premium trading signals preview platform with 3-minute trial access.

## ✨ Features

- 🎨 Beautiful dark-themed UI (Telegram-style)
- 🔒 Advanced security (VPN/proxy detection, IP tracking, country restrictions)
- 📱 Fully responsive (mobile + desktop)
- ⏱️ 3-minute preview timer with countdown
- 📊 Live signals feed from Telegram
- 🎯 Color-coded signals (Green TP, Red SL)
- 🔐 One preview per IP/browser
- 📈 Real-time signal updates

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp env.local.template .env.local

# Fill in your .env.local values
# - IP2LOCATION_API_KEY
# - TELEGRAM_BOT_TOKEN
# - etc.

# Run development server
npm run dev

# Visit http://localhost:3000/money-glitch
```

### Deploy to Azure

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete instructions.

**Quick steps:**
1. Set up Azure Cosmos DB
2. Create App Service
3. Push to GitHub
4. Configure GitHub Actions
5. Deploy!

## 📁 Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── precheck/      # Security checks
│   │   ├── signals/       # Signal endpoints
│   │   └── admin/         # Admin stats
│   └── money-glitch/      # Main page
├── components/            # React components
│   ├── sections/          # Content sections
│   └── ...
├── lib/                   # Utilities
│   ├── db/               # Database integrations
│   └── ...
├── bot/                   # Telegram bot
└── .github/workflows/     # GitHub Actions
```

## 🔧 Configuration

### Environment Variables

See `env.local.template` for all required variables.

**Required:**
- `AZURE_COSMOS_CONNECTION_STRING` - Cosmos DB connection
- `IP2LOCATION_API_KEY` - For VPN detection
- `INGEST_API_KEY` - Secret for bot API
- `TELEGRAM_BOT_TOKEN` - Bot token
- External links (Telegram, Whop, Inner Circle)

### Database

The app uses **Azure Cosmos DB** (MongoDB API) for:
- IP access tracking
- Signal storage

Collections created automatically:
- `ip_access` - IP tracking & security
- `signals` - Trading signals

## 📱 Sections

1. **Welcome** - Introduction
2. **Money-Glitch** - Live signals feed ⭐
3. **How It Works** - System explanation
4. **Live Results** - Performance stats
5. **Reviews** - Member testimonials
6. **Sneak Peek** - Trade breakdowns
7. **FAQ** - Common questions

## 🔐 Security Features

- ✅ VPN/Proxy detection (IP2Location API)
- ✅ Country restrictions (configurable)
- ✅ One preview per IP + browser cookie
- ✅ VPN rate limiting (5 attempts / 2 hours)
- ✅ IP tracking with Cosmos DB

## 🤖 Telegram Bot

The bot watches your source channel and forwards signals to the website.

**Setup:**
```bash
cd bot
npm install
npm start
```

See `bot/README.md` for details.

## 📊 API Endpoints

- `GET /api/precheck` - Security checks
- `POST /api/endPreview` - Mark preview used
- `GET /api/signals` - Get signals
- `POST /api/signals/ingest` - Receive from bot
- `GET /api/admin/stats` - Statistics

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Database:** Azure Cosmos DB (MongoDB API)
- **Deployment:** Azure App Service
- **CI/CD:** GitHub Actions

## 📝 License

Private - All rights reserved

## 🆘 Support

For deployment issues, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

Built with ❤️ for Freya Trades

