# Freya Trades Preview Hub - Codebase Review

> **Project**: Freya Trades Preview Hub  
> **Tech Stack**: Next.js 14, TypeScript, MongoDB/Azure Cosmos DB, TailwindCSS, Framer Motion  
> **Review Date**: December 2024

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Project Structure](#project-structure)
3. [API Endpoints](#api-endpoints)
4. [Features by Role](#features-by-role)
5. [Database & External Services](#database--external-services)
6. [Detected Issues & Security Concerns](#detected-issues--security-concerns)
7. [Suggested Fixes & Improvements](#suggested-fixes--improvements)

---

## Project Overview

**Freya Trades Preview Hub** is a Next.js web application designed to provide a time-limited preview of premium trading signals. The application implements:

- **IP-based access control**: Tracks visitor IPs to enforce a one-time 3-minute preview
- **VPN/Proxy detection**: Uses IP2Location API to block VPN users
- **Country restrictions**: Blocks visitors from configured restricted countries
- **Real-time signals feed**: Displays trading signals received from a Telegram bot
- **Conversion funnel**: Redirects users to Telegram/Whop trials after preview expires

### Key Flow
1. User visits → Onboarding slides → IP precheck
2. If allowed → 3-minute preview of live signals
3. After 3 minutes → Preview ended screen with CTA to join trial
4. Same IP cannot access again (tracked via DB + cookies)

---

## Project Structure

```
website 3/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── admin/                # Admin endpoints (auth required)
│   │   │   ├── clear-ip/         # Delete IP records
│   │   │   └── stats/            # Get statistics
│   │   ├── debug/                # Debug endpoints (env flag required)
│   │   │   ├── precheck/         # Debug precheck results
│   │   │   └── signals/           # Health check endpoint
│   │   ├── precheck/           # Debug raw signals
│   │   ├── endPreview/           # Mark preview as ended
│   │   ├── health/                # IP validation & access control
│   │   ├── saveProgress/         # Save viewing progress
│   │   └── signals/              # Get/ingest signals
│   │       └── ingest/           # Signal ingestion from bot
│   ├── money-glitch/             # Main preview page
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Redirects to /money-glitch
├── components/                   # React components
│   ├── sections/                 # Page sections
│   │   ├── FAQ.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── LiveResults.tsx
│   │   ├── MoneyGlitch.tsx       # Main signals display
│   │   ├── Reviews.tsx
│   │   ├── SneakPeek.tsx
│   │   └── Welcome.tsx
│   ├── BlockedScreen.tsx         # Blocked user UI
│   ├── LoadingScreen.tsx         # Loading animation
│   ├── MobileNav.tsx             # Mobile navigation
│   ├── Onboarding.tsx            # Onboarding slides
│   ├── PreviewEndedScreen.tsx    # Post-preview CTA
│   ├── Sidebar.tsx               # Desktop sidebar
│   └── TimerBanner.tsx           # Countdown timer
├── lib/                          # Shared utilities
│   ├── db/                       # Database modules
│   │   ├── ip-store-db.ts        # IP tracking operations
│   │   ├── mongodb.ts            # MongoDB connection
│   │   └── signals-store-db.ts   # Signals storage
│   ├── api-auth.ts               # API authentication
│   ├── constants.ts              # App constants
│   ├── rate-limiter.ts           # Rate limiting
│   └── telegram-parser.ts        # Signal parsing
├── types/                        # TypeScript types
│   └── index.ts
├── middleware.ts                 # Security headers & CORS
└── [config files]                # Next.js, TailwindCSS, TypeScript configs
```

---

## API Endpoints

### Public Endpoints

#### `GET /api/precheck`
**Purpose**: Validate visitor IP and determine access eligibility

| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| (none) | - | - | Uses request headers for IP |

**Response (Success)**:
```json
{
  "status": "ok",
  "previewDuration": 180,
  "timeConsumed": 0
}
```

**Response (Blocked)**:
```json
{
  "status": "blocked",
  "reason": "vpn_detected" | "vpn_max_retries" | "restricted_country" | "preview_used" | "error"
}
```

**Rate Limit**: 60 req/min

---

#### `GET /api/signals`
**Purpose**: Retrieve trading signals for display

| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| `limit` | number | query | Max signals to return (default: 100, max: 200) |
| `skip` | number | query | Pagination offset (default: 0) |

**Response**:
```json
{
  "signals": [...],
  "count": 10,
  "totalCount": 50,
  "hasMore": true,
  "skip": 0,
  "limit": 100,
  "lastUpdated": "2024-12-08T10:00:00Z",
  "status": {
    "databaseConnected": true,
    "hasSignals": true
  }
}
```

**Rate Limit**: 30 req/min (prevents scraping)

---

#### `POST /api/saveProgress`
**Purpose**: Save user's viewing progress (called at 30 seconds and on page unload)

| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| `secondsWatched` | number | body | Seconds of preview watched (0-300) |
| `trigger` | string | body | `threshold`, `periodic`, or `unload` |

**Response**:
```json
{
  "ok": true,
  "cookieSaved": true,
  "timeConsumed": 30
}
```

**Rate Limit**: 60 req/min

---

#### `POST /api/endPreview`
**Purpose**: Mark preview as ended for the current IP

| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| (none) | - | - | Uses request headers for IP |

**Response**:
```json
{ "ok": true }
```

**Side Effects**: Sets `ft_preview_ended` cookie (1 year expiry)

**Rate Limit**: 60 req/min

---

#### `GET /api/health`
**Purpose**: Health check endpoint

**Public Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-12-08T10:00:00Z"
}
```

**Admin Response** (with auth): Includes database status, environment configuration details

**Rate Limit**: 60 req/min

---

### Protected Endpoints (Require `INGEST_API_KEY`)

#### `POST /api/signals/ingest`
**Purpose**: Ingest trading signals from Telegram bot

| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| `message` | string | body | Raw Telegram message text (max 5000 chars) |
| `sourceMessageId` | string | body | Optional Telegram message ID |

**Headers**:
```
Authorization: Bearer <INGEST_API_KEY>
```

**Response (Success)**:
```json
{
  "status": "success",
  "signal": { ... }
}
```

**Response (Ignored)**:
```json
{
  "status": "ignored",
  "reason": "Message does not match signal format"
}
```

**Rate Limit**: 100 req/min

---

#### `GET /api/signals/ingest`
**Purpose**: Health check for ingest API

**Headers**:
```
Authorization: Bearer <INGEST_API_KEY>
```

---

### Admin Endpoints (Require `ADMIN_API_KEY`)

#### `POST /api/admin/clear-ip`
**Purpose**: Delete an IP record from database (for testing)

| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| `ip` | string | body | IP address to clear |

**Headers**:
```
Authorization: Bearer <ADMIN_API_KEY>
```

**Response**:
```json
{
  "success": true,
  "ip": "1.2.3.4",
  "message": "IP record cleared successfully"
}
```

**Rate Limit**: 10 req/min

---

#### `GET /api/admin/stats`
**Purpose**: Get statistics about IP access and signals

**Headers**:
```
Authorization: Bearer <ADMIN_API_KEY>
```

**Response**:
```json
{
  "database": { "configured": true, "type": "Azure Cosmos DB" },
  "ip": { "totalIPs": 100, "previewsUsed": 50, "vpnBlocked": 10 },
  "signals": { "totalSignals": 200, "newSignals": 150, "tpUpdates": 30, "slUpdates": 20 },
  "timestamp": "2024-12-08T10:00:00Z"
}
```

**Rate Limit**: 10 req/min

---

### Debug Endpoints (Require `DEBUG_ENDPOINTS_ENABLED=true`)

#### `GET /api/debug/precheck`
**Purpose**: Debug precheck logic (shows IP lookup results)

#### `GET /api/debug/signals`
**Purpose**: Debug raw signal data from database

---

## Features by Role

### Guest (Unauthenticated Visitor)

| Feature | Description |
|---------|-------------|
| **Onboarding Flow** | 4-step introduction slides explaining the preview |
| **Loading Screen** | 3-second loading animation while precheck runs |
| **3-Minute Preview** | Time-limited access to live trading signals |
| **Multi-Section Navigation** | Browse Welcome, Money-Glitch, How It Works, Live Results, Reviews, Sneak Peek, FAQ |
| **Real-time Signals** | View live trading signals with auto-refresh (15-second polling) |
| **Countdown Timer** | Visible timer showing remaining preview time |
| **Preview Ended CTA** | After 3 minutes, shown conversion screen with trial links |

### Blocked Visitor

| Blocked Reason | User Experience |
|----------------|-----------------|
| **VPN Detected** | Shown "Turn off VPN" message with retry button |
| **VPN Max Retries** | Shown "Try again later" message (2-hour cooldown) |
| **Restricted Country** | Shown "Region Restricted" message |
| **Preview Already Used** | Shown "Preview Already Used" with trial CTA |

### Admin (API Key Required)

| Feature | Endpoint |
|---------|----------|
| **View Statistics** | `GET /api/admin/stats` |
| **Clear IP Records** | `POST /api/admin/clear-ip` |
| **Detailed Health Check** | `GET /api/health` (with auth) |

### Bot/Ingest System (API Key Required)

| Feature | Endpoint |
|---------|----------|
| **Ingest Trading Signals** | `POST /api/signals/ingest` |
| **Signal Parsing** | Parses NEW_SIGNAL, TAKE_PROFIT, STOP_LOSS formats |

---

## Database & External Services

### MongoDB / Azure Cosmos DB

**Connection**: Configured via `AZURE_COSMOS_CONNECTION_STRING` or `MONGODB_URI`

**Collections**:

| Collection | Purpose | Document Schema |
|------------|---------|-----------------|
| `ip_access` | Track visitor IPs | `{ ip, previewUsed, timeConsumed, cookieSaved, vpnAttempts, vpnWindowEnd, firstSeen, lastSeen, userAgent, country }` |
| `signals` | Store trading signals | `{ id, type, script, position, entryPrice, tp1-4, stopLoss, updateType, tpLevel, hitPrice, timestamp, color, createdAt }` |

**Fallback**: In-memory store if database not configured (data lost on restart)

---

### IP2Location API

**Purpose**: VPN/Proxy detection and geolocation

**Configuration**: 
- `IP2LOCATION_API_KEY` (supports comma-separated fallback keys)
- Rate limit handling with automatic key rotation

**Usage**: Called in `/api/precheck` to check:
- `proxy.is_vpn` - Only VPN is blocked (proxy allowed)
- `country_code` - For geographic restrictions

---

### External Links

| Purpose | Environment Variable |
|---------|---------------------|
| Telegram Trial | `NEXT_PUBLIC_TRIAL_TELEGRAM_URL` |
| Whop Trial | `NEXT_PUBLIC_TRIAL_WHOP_URL` |
| Inner Circle | `NEXT_PUBLIC_INNER_CIRCLE_URL` |

---

## Detected Issues & Security Concerns

### 🔴 Critical Issues

#### 1. **Fail-Open on Error in Precheck**
**File**: `app/api/precheck/route.ts` (lines 276-283)

```typescript
} catch (error) {
  console.error('[Precheck] Error:', error)
  // On error, allow access (fail open) but log it
  return NextResponse.json({
    status: 'ok',
    previewDuration: PREVIEW_DURATION,
    timeConsumed: 0,
  })
}
```

**Problem**: If any error occurs during IP validation (database down, API failure), the system allows full access. This could be exploited intentionally by causing errors.

**Risk**: HIGH - Attackers could potentially bypass access control

---

#### 2. **Client-Side Only Preview Termination**
**File**: `app/money-glitch/page.tsx` (lines 240-250)

```typescript
const endPreview = async () => {
  setAppState('preview_ended')
  localStorage.setItem('ft_preview_ended', '1')
  
  try {
    await fetch('/api/endPreview', { method: 'POST' })
  } catch (error) {
    console.error('Failed to mark preview as ended:', error)
  }
}
```

**Problem**: 
- Timer countdown runs client-side and can be manipulated via DevTools
- If API call fails, only localStorage is set (easily cleared)
- User can simply open incognito window with different localStorage

**Risk**: MEDIUM - Preview time limits can be bypassed with browser manipulation

---

#### 3. **Missing CSRF Protection on State-Changing Endpoints**
**Files**: `app/api/endPreview/route.ts`, `app/api/saveProgress/route.ts`

**Problem**: POST endpoints that modify state don't verify request origin beyond CORS.

**Risk**: LOW-MEDIUM - Cross-site request could potentially be crafted

---

### 🟠 Security Concerns

#### 4. **Timing Information Leak in API Responses**
**File**: `lib/api-auth.ts` (lines 30-34)

```typescript
if (bufA.length !== bufB.length) {
  // Compare with self to maintain constant time, but return false
  timingSafeEqual(bufA, bufA)
  return false
}
```

**Issue**: While timing-safe comparison is implemented, the pattern reveals key length through response time differences.

**Recommendation**: Pad keys to fixed length before comparison.

---

#### 5. **Debug Endpoints Exposure Risk**
**Files**: `app/api/debug/*/route.ts`

**Problem**: Debug endpoints are only protected by environment flag, not API key. If accidentally enabled in production, they expose:
- IP lookup responses
- Raw database contents
- Internal configuration

---

#### 6. **Insufficient Input Validation on Signals Ingest**
**File**: `app/api/signals/ingest/route.ts` (line 28)

```typescript
const { message, sourceMessageId } = body
```

**Problem**: The `message` field is parsed but regex patterns could potentially be exploited for ReDoS attacks if malicious input is crafted.

---

### 🟡 Code Quality Issues

#### 7. **Duplicate getClientIP Function**
**Files**: 
- `lib/api-auth.ts` (lines 192-218)
- `app/api/precheck/route.ts` (lines 32-58)

**Problem**: Same function implemented twice, violating DRY principle.

---

#### 8. **Memory Leak Potential in Rate Limiter**
**File**: `lib/rate-limiter.ts` (lines 29-44)

**Problem**: Cleanup runs only every 5 minutes and only when check is called. Under low traffic, old entries may accumulate.

---

#### 9. **Hardcoded Magic Numbers**
**File**: `app/money-glitch/page.tsx`

```typescript
const ONBOARDING_COOKIE_EXPIRY_MINUTES = 10
```

**Problem**: Configuration that should be in environment or constants file is hardcoded in component.

---

#### 10. **Missing TypeScript Strict Types**
**Files**: Multiple files use `any` type

Examples:
- `lib/db/signals-store-db.ts` (line 114, 256)
- `lib/db/ip-store-db.ts` (line 77)

---

#### 11. **Console.log Statements in Production Code**
**Files**: Most API routes contain extensive console.log statements

**Problem**: Verbose logging in production can impact performance and expose information in server logs.

---

#### 12. **Missing Error Boundaries in React Components**
**File**: `app/money-glitch/page.tsx`

**Problem**: No error boundaries to catch and handle component errors gracefully.

---

## Suggested Fixes & Improvements

### 🔴 Critical Fixes

#### Fix 1: Fail-Closed on Errors

**File**: `app/api/precheck/route.ts`

```diff
} catch (error) {
  console.error('[Precheck] Error:', error)
- // On error, allow access (fail open) but log it
- return NextResponse.json({
-   status: 'ok',
-   previewDuration: PREVIEW_DURATION,
-   timeConsumed: 0,
- })
+ // On error, block access (fail closed) for security
+ return NextResponse.json({
+   status: 'blocked',
+   reason: 'error'
+ })
}
```

---

#### Fix 2: Server-Side Timer Enforcement

Add server-side validation to prevent client manipulation:

**New/Modified File**: `app/api/validatePreview/route.ts`

```typescript
export async function GET(req: NextRequest) {
  const clientIP = getClientIP(req)
  const record = await getIPRecord(clientIP)
  
  if (!record || record.previewUsed) {
    return NextResponse.json({ valid: false, reason: 'expired' })
  }
  
  // Calculate server-side time remaining
  const startTime = record.previewStartedAt?.getTime() || Date.now()
  const elapsed = (Date.now() - startTime) / 1000
  const remaining = Math.max(0, PREVIEW_DURATION - elapsed - record.timeConsumed)
  
  if (remaining <= 0) {
    await markPreviewUsed(clientIP)
    return NextResponse.json({ valid: false, reason: 'expired' })
  }
  
  return NextResponse.json({ valid: true, remaining })
}
```

---

#### Fix 3: Add CSRF Token Validation

**File**: Create `lib/csrf.ts`

```typescript
import { randomBytes, createHmac } from 'crypto'

const SECRET = process.env.CSRF_SECRET || 'fallback-secret'

export function generateCSRFToken(ip: string): string {
  const timestamp = Date.now().toString()
  const data = `${ip}:${timestamp}`
  const hmac = createHmac('sha256', SECRET).update(data).digest('hex')
  return Buffer.from(`${timestamp}:${hmac}`).toString('base64')
}

export function validateCSRFToken(token: string, ip: string, maxAgeMs = 3600000): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString()
    const [timestamp, hmac] = decoded.split(':')
    
    // Check age
    if (Date.now() - parseInt(timestamp) > maxAgeMs) return false
    
    // Verify HMAC
    const expected = createHmac('sha256', SECRET)
      .update(`${ip}:${timestamp}`)
      .digest('hex')
    
    return hmac === expected
  } catch {
    return false
  }
}
```

---

### 🟠 Security Improvements

#### Fix 4: Require Auth for Debug Endpoints

```typescript
export async function GET(req: NextRequest) {
  const debugError = requireDebugEnabled()
  if (debugError) return debugError
  
  // ADD: Require admin auth even when debug is enabled
  const authError = requireAdminAuth(req)
  if (authError) return authError
  
  // ... rest of handler
}
```

---

#### Fix 5: Add ReDoS Protection

**File**: `lib/telegram-parser.ts`

```typescript
// Add timeout wrapper for regex operations
function safeRegexTest(pattern: RegExp, text: string, timeoutMs = 100): boolean {
  // Limit input length
  if (text.length > 5000) return false
  
  return pattern.test(text)
}
```

---

### 🟡 Code Quality Improvements

#### Fix 6: Consolidate getClientIP

**File**: `lib/api-auth.ts`

Remove duplicate from `app/api/precheck/route.ts` and import from `lib/api-auth.ts`.

```diff
// app/api/precheck/route.ts
+ import { getClientIP } from '@/lib/api-auth'
- function getClientIP(req: NextRequest): string { ... }
```

---

#### Fix 7: Environment-Based Logging

**File**: Create `lib/logger.ts`

```typescript
const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  debug: (...args: any[]) => isDev && console.log('[DEBUG]', ...args),
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
}
```

---

#### Fix 8: Add Error Boundary

**File**: Create `components/ErrorBoundary.tsx`

```typescript
'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-screen bg-[#050608]">
          <div className="text-center">
            <h1 className="text-xl text-white mb-2">Something went wrong</h1>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-yellow-500 text-black rounded"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

---

#### Fix 9: Extract Configuration Constants

**File**: `lib/config.ts`

```typescript
export const CONFIG = {
  // Preview settings
  PREVIEW_DURATION_SECONDS: Number(process.env.PREVIEW_DURATION_SECONDS || 180),
  TIME_CONSUMED_THRESHOLD: Number(process.env.TIME_CONSUMED_THRESHOLD || 60),
  
  // VPN settings
  VPN_MAX_RETRIES: Number(process.env.VPN_MAX_RETRIES || 5),
  VPN_RETRY_WINDOW_HOURS: Number(process.env.VPN_RETRY_WINDOW_HOURS || 2),
  
  // Cookies
  ONBOARDING_COOKIE_EXPIRY_MINUTES: 10,
  PREVIEW_COOKIE_EXPIRY_DAYS: 365,
  
  // Rate limits
  RATE_LIMITS: {
    admin: { requests: 10, windowMs: 60000 },
    public: { requests: 60, windowMs: 60000 },
    ingest: { requests: 100, windowMs: 60000 },
    signals: { requests: 30, windowMs: 60000 },
  },
} as const
```

---

### 📋 Additional Recommendations

1. **Add Request Signing for Bot Communication**: Use HMAC signature validation for the signal ingestion endpoint

2. **Implement Database Indexes**: Add indexes on `ip_access.ip` and `signals.createdAt` for better query performance

3. **Add Health Check for External Services**: Include IP2Location API status in health check

4. **Implement Proper Session Management**: Consider using signed cookies instead of plain localStorage

5. **Add Monitoring/Alerting**: Integrate with monitoring service for production visibility

6. **Add API Documentation**: Consider adding OpenAPI/Swagger documentation

7. **Add Unit Tests**: No test files found - recommend adding tests for critical paths

---

## Summary

The Freya Trades Preview Hub is a well-structured Next.js application with reasonable security practices for its use case. The main areas requiring attention are:

| Priority | Issue | Impact |
|----------|-------|--------|
| 🔴 Critical | Fail-open on errors | Security bypass possible |
| 🔴 Critical | Client-side timer only | Preview limits bypassable |
| 🟠 High | Debug endpoints security | Information disclosure |
| 🟠 High | Missing CSRF protection | Potential CSRF attacks |
| 🟡 Medium | Code duplication | Maintainability |
| 🟡 Medium | Missing error boundaries | User experience |

The codebase demonstrates good practices including:
- ✅ Timing-safe API key comparison
- ✅ Rate limiting implementation
- ✅ Security headers in middleware
- ✅ Input validation and sanitization
- ✅ Graceful fallback to in-memory storage
- ✅ Comprehensive TypeScript usage
