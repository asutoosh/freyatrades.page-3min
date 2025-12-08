# Refactoring Plan

This document provides a detailed, prioritized plan for refactoring the codebase based on the comprehensive code review.

---

## Priority 1: Immediate (Complete Within 1 Week)

### 1.1 Fix Remaining High-Priority Security Issues ⏳

**Status:** Partially Complete  
**Remaining Tasks:**

- [ ] Add CSRF token protection for POST endpoints
- [ ] Implement proper cookie security flags in client-side code
- [ ] Add comprehensive error handling without exposing internals
- [ ] Implement request ID tracking for distributed tracing
- [ ] Add security audit logging

**Implementation:**

```typescript
// lib/csrf.ts
import { timingSafeEqual } from 'crypto'
import { randomBytes } from 'crypto'

export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex')
}

export function validateCSRFToken(provided: string, expected: string): boolean {
  if (!provided || !expected) return false
  if (provided.length !== expected.length) return false
  
  try {
    return timingSafeEqual(
      Buffer.from(provided, 'utf8'),
      Buffer.from(expected, 'utf8')
    )
  } catch {
    return false
  }
}

// middleware.ts - Add CSRF token generation
if (!request.nextUrl.pathname.startsWith('/api/')) {
  const token = generateCSRFToken()
  response.cookies.set('csrf-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
  })
}
```

---

### 1.2 Add Database Indexes for Performance 🔧

**Status:** Not Started  
**Impact:** 10x query performance improvement  
**Effort:** 2 hours

**Implementation:**

```typescript
// lib/db/mongodb.ts - Add index management

export async function ensureIndexes(): Promise<void> {
  try {
    const db = await getDatabase()
    
    // IP Access Collection Indexes
    await db.collection(COLLECTIONS.IP_ACCESS).createIndexes([
      { 
        key: { ip: 1 }, 
        unique: true,
        name: 'ip_unique'
      },
      { 
        key: { lastSeen: 1 },
        name: 'last_seen'
      },
      { 
        key: { previewUsed: 1, lastSeen: 1 },
        name: 'preview_used_last_seen'
      },
      { 
        key: { vpnWindowEnd: 1 },
        name: 'vpn_window',
        sparse: true
      }
    ])
    
    // Signals Collection Indexes
    await db.collection(COLLECTIONS.SIGNALS).createIndexes([
      { 
        key: { createdAt: -1 },
        name: 'created_at_desc'
      },
      { 
        key: { timestamp: -1 },
        name: 'timestamp_desc'
      },
      { 
        key: { script: 1, createdAt: -1 },
        name: 'script_created'
      },
      { 
        key: { type: 1, createdAt: -1 },
        name: 'type_created'
      }
    ])
    
    console.log('✅ Database indexes created successfully')
  } catch (error) {
    console.error('❌ Failed to create database indexes:', error)
    throw error
  }
}

// Call on application startup
export async function initDatabase(): Promise<void> {
  if (!isDatabaseConfigured()) {
    console.warn('⚠️  Database not configured')
    return
  }
  
  // Test connection
  await getDatabase()
  
  // Ensure indexes exist
  await ensureIndexes()
}
```

**Usage:**

```typescript
// app/api/health/route.ts or startup script
import { initDatabase } from '@/lib/db/mongodb'

// On application startup
await initDatabase()
```

---

### 1.3 Optimize Database Queries 🚀

**Status:** Not Started  
**Impact:** Reduce query time from seconds to milliseconds  
**Effort:** 3 hours

**Changes Needed:**

1. **Add projection to queries** - Only fetch needed fields
2. **Use database sorting** - Don't sort in JavaScript
3. **Implement cursor-based pagination** - Better than skip/limit

**Implementation:**

```typescript
// lib/db/signals-store-db.ts - Optimized getSignals

export async function getSignals(
  limit: number = 100,
  cursor?: string
): Promise<{ signals: StoredSignal[]; nextCursor?: string }> {
  
  if (!isDatabaseConfigured()) {
    const sorted = memoryStore
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
    return { signals: sorted }
  }

  try {
    const collection = await getCollection<StoredSignal>(COLLECTIONS.SIGNALS)
    
    // Build query with cursor
    const query: any = {}
    if (cursor) {
      query._id = { $lt: new ObjectId(cursor) }
    }
    
    // Use database sorting and projection
    const signals = await collection
      .find(query, {
        projection: {
          // Include only needed fields
          id: 1,
          type: 1,
          script: 1,
          position: 1,
          entryPrice: 1,
          tp1: 1,
          tp2: 1,
          tp3: 1,
          tp4: 1,
          stopLoss: 1,
          updateType: 1,
          tpLevel: 1,
          hitPrice: 1,
          signalDirection: 1,
          timestamp: 1,
          color: 1,
          createdAt: 1,
        }
      })
      .sort({ createdAt: -1 }) // Sort in database
      .limit(limit + 1) // Fetch one extra to check if more exist
      .toArray()
    
    // Check if there are more results
    const hasMore = signals.length > limit
    if (hasMore) {
      signals.pop() // Remove extra item
    }
    
    // Get cursor for next page
    const nextCursor = hasMore && signals.length > 0
      ? signals[signals.length - 1]._id?.toString()
      : undefined
    
    return {
      signals: signals as StoredSignal[],
      nextCursor,
    }
  } catch (error) {
    console.error('Error fetching signals:', error)
    return { signals: memoryStore.slice(0, limit) }
  }
}
```

---

## Priority 2: This Month (4 Weeks)

### 2.1 Implement Service Layer Architecture 🏗️

**Status:** Not Started  
**Effort:** 5-7 days  
**Benefit:** Better separation of concerns, easier testing

**Structure:**

```
lib/
├── services/
│   ├── ip-service.ts       # Business logic for IP management
│   ├── signal-service.ts   # Business logic for signals
│   ├── auth-service.ts     # Authentication logic
│   └── preview-service.ts  # Preview session logic
├── repositories/
│   ├── ip-repository.ts    # Data access for IP records
│   └── signal-repository.ts # Data access for signals
└── models/
    ├── ip-record.model.ts
    └── signal.model.ts
```

**Example Service:**

```typescript
// lib/services/ip-service.ts

import { IPRecord } from '@/types'
import * as ipRepo from '@/lib/repositories/ip-repository'
import { logger } from '@/lib/logger'

export class IPService {
  /**
   * Check if IP is allowed to preview
   */
  async canPreview(ip: string): Promise<{
    allowed: boolean
    reason?: string
    remainingTime?: number
  }> {
    // Get IP record
    const record = await ipRepo.getIPRecord(ip)
    
    // Check if already used
    if (record?.previewUsed) {
      logger.info('Preview blocked: already used', { ip })
      return { allowed: false, reason: 'preview_used' }
    }
    
    // Check time consumed
    if (record && record.timeConsumed >= config.preview.timeConsumedThreshold) {
      logger.info('Preview blocked: time threshold exceeded', { 
        ip, 
        timeConsumed: record.timeConsumed 
      })
      return { allowed: false, reason: 'preview_used' }
    }
    
    // Calculate remaining time
    const remainingTime = config.preview.durationSeconds - (record?.timeConsumed || 0)
    
    return {
      allowed: true,
      remainingTime: Math.max(0, remainingTime),
    }
  }
  
  /**
   * Start preview session
   */
  async startPreview(ip: string, userAgent?: string): Promise<void> {
    await ipRepo.startPreviewSession(ip)
    logger.info('Preview session started', { ip })
  }
  
  /**
   * Update time consumed
   */
  async updateTimeConsumed(ip: string, seconds: number): Promise<void> {
    await ipRepo.updateTimeConsumed(ip, seconds)
    logger.debug('Time consumed updated', { ip, seconds })
  }
}

export const ipService = new IPService()
```

---

### 2.2 Add Comprehensive Testing 🧪

**Status:** Not Started  
**Effort:** 10-12 days  
**Coverage Goal:** 80%

**Testing Strategy:**

#### Unit Tests (Jest)

```typescript
// __tests__/lib/sanitizer.test.ts

import {
  sanitizeText,
  sanitizeHTML,
  sanitizeIP,
  sanitizeURL,
  sanitizeNumber,
  sanitizeEmail,
} from '@/lib/sanitizer'

describe('Sanitizer', () => {
  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeText('<script>alert("xss")</script>Hello')).toBe('Hello')
    })
    
    it('should handle empty strings', () => {
      expect(sanitizeText('')).toBe('')
    })
    
    it('should preserve plain text', () => {
      expect(sanitizeText('Hello World')).toBe('Hello World')
    })
    
    it('should handle XSS attempts', () => {
      const malicious = '<img src=x onerror="alert(1)">'
      expect(sanitizeText(malicious)).not.toContain('onerror')
    })
  })
  
  describe('sanitizeIP', () => {
    it('should accept valid IPv4', () => {
      expect(sanitizeIP('192.168.1.1')).toBe('192.168.1.1')
    })
    
    it('should accept valid IPv6', () => {
      expect(sanitizeIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334'))
        .toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334')
    })
    
    it('should reject invalid IPs', () => {
      expect(sanitizeIP('999.999.999.999')).toBe('')
      expect(sanitizeIP('not-an-ip')).toBe('')
    })
    
    it('should remove HTML from IPs', () => {
      expect(sanitizeIP('<script>192.168.1.1</script>')).toBe('')
    })
  })
  
  describe('sanitizeURL', () => {
    it('should accept valid HTTPS URLs', () => {
      const url = 'https://example.com/path'
      expect(sanitizeURL(url)).toBe(url)
    })
    
    it('should reject javascript: URLs', () => {
      expect(sanitizeURL('javascript:alert(1)')).toBe('')
    })
    
    it('should reject data: URLs', () => {
      expect(sanitizeURL('data:text/html,<script>alert(1)</script>')).toBe('')
    })
    
    it('should validate against domain whitelist', () => {
      const url = 'https://evil.com'
      expect(sanitizeURL(url, ['trusted.com'])).toBe('')
    })
    
    it('should allow subdomains of whitelisted domains', () => {
      const url = 'https://api.trusted.com/endpoint'
      expect(sanitizeURL(url, ['trusted.com'])).toBe(url)
    })
  })
  
  describe('sanitizeNumber', () => {
    it('should parse valid numbers', () => {
      expect(sanitizeNumber('123')).toBe(123)
      expect(sanitizeNumber(456)).toBe(456)
    })
    
    it('should return default for invalid input', () => {
      expect(sanitizeNumber('abc', { defaultValue: 10 })).toBe(10)
    })
    
    it('should clamp to min value', () => {
      expect(sanitizeNumber(5, { min: 10 })).toBe(10)
    })
    
    it('should clamp to max value', () => {
      expect(sanitizeNumber(100, { max: 50 })).toBe(50)
    })
  })
  
  describe('sanitizeEmail', () => {
    it('should accept valid emails', () => {
      expect(sanitizeEmail('user@example.com')).toBe('user@example.com')
    })
    
    it('should reject invalid emails', () => {
      expect(sanitizeEmail('not-an-email')).toBe('')
      expect(sanitizeEmail('@example.com')).toBe('')
      expect(sanitizeEmail('user@')).toBe('')
    })
    
    it('should normalize to lowercase', () => {
      expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com')
    })
    
    it('should reject overly long emails', () => {
      const longEmail = 'a'.repeat(250) + '@example.com'
      expect(sanitizeEmail(longEmail)).toBe('')
    })
  })
})
```

#### Integration Tests

```typescript
// __tests__/api/signals-ingest.integration.test.ts

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/signals/ingest/route'

describe('POST /api/signals/ingest', () => {
  const validApiKey = process.env.INGEST_API_KEY || 'test-key'
  
  it('should require authentication', async () => {
    const request = new NextRequest('http://localhost:3000/api/signals/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'test' }),
    })
    
    const response = await POST(request)
    expect(response.status).toBe(401)
  })
  
  it('should accept valid signals', async () => {
    const message = `
      WAZIR FOREX ALGO
      script: TSLA
      Position: SELL
      Enter Price: 452.36
      Take Profit 1: 450.55
      Take Profit 2: 449.34
      Take Profit 3: 447.52
      Take Profit 4: 445.10
      Stoploss: 455.38
    `
    
    const request = new NextRequest('http://localhost:3000/api/signals/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validApiKey}`,
      },
      body: JSON.stringify({ message }),
    })
    
    const response = await POST(request)
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.status).toBe('success')
    expect(data.signal.type).toBe('signal')
    expect(data.signal.script).toBe('TSLA')
  })
  
  it('should reject messages over length limit', async () => {
    const message = 'A'.repeat(1001)
    
    const request = new NextRequest('http://localhost:3000/api/signals/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validApiKey}`,
      },
      body: JSON.stringify({ message }),
    })
    
    const response = await POST(request)
    expect(response.status).toBe(400)
  })
  
  it('should sanitize XSS attempts', async () => {
    const message = '<script>alert("xss")</script>test signal'
    
    const request = new NextRequest('http://localhost:3000/api/signals/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validApiKey}`,
      },
      body: JSON.stringify({ message }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    // Should not contain script tags
    expect(JSON.stringify(data)).not.toContain('<script>')
  })
})
```

#### E2E Tests (Playwright)

```typescript
// e2e/preview-flow.spec.ts

import { test, expect } from '@playwright/test'

test.describe('Preview Flow', () => {
  test('should complete full preview flow', async ({ page }) => {
    // Navigate to home
    await page.goto('/')
    
    // Should show onboarding
    await expect(page.locator('text=Premium Signals Preview')).toBeVisible()
    
    // Click through onboarding
    await page.click('text=Next')
    await page.click('text=Next')
    await page.click('text=Next')
    await page.click('text=Let\'s Go')
    
    // Should show loading screen
    await expect(page.locator('text=Initializing')).toBeVisible()
    
    // Wait for preview to load
    await page.waitForTimeout(3000)
    
    // Should show main UI with timer
    await expect(page.locator('text=Time Left')).toBeVisible()
    
    // Should show Money-Glitch section by default
    await expect(page.locator('text=Live Trading Signals')).toBeVisible()
    
    // Navigate to different sections
    await page.click('text=How It Works')
    await expect(page.locator('text=How the System Works')).toBeVisible()
    
    await page.click('text=Live Results')
    await expect(page.locator('text=Track Record')).toBeVisible()
  })
  
  test('should block VPN users', async ({ page, context }) => {
    // Mock IP2Location API to return VPN
    await page.route('**/api.ip2location.io/**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          country_code: 'US',
          proxy: { is_vpn: true },
        }),
      })
    })
    
    await page.goto('/')
    
    // Complete onboarding
    await page.click('text=Next')
    await page.click('text=Next')
    await page.click('text=Next')
    await page.click('text=Let\'s Go')
    
    // Wait for loading
    await page.waitForTimeout(3000)
    
    // Should show blocked screen
    await expect(page.locator('text=VPN Detected')).toBeVisible()
  })
  
  test('should end preview after timer expires', async ({ page }) => {
    // This test would need to mock the timer or use a shorter duration
    // Implementation depends on test environment
  })
})
```

---

### 2.3 Break Down Large Components 📦

**Status:** Not Started  
**Effort:** 3-4 days

**Target:** `app/money-glitch/page.tsx` (363 lines)

**Refactoring Strategy:**

1. Extract custom hooks
2. Break into smaller components
3. Separate concerns

**Implementation:**

```typescript
// hooks/usePreview.ts
export function usePreview() {
  const [timeLeft, setTimeLeft] = useState(180)
  const [previewStartTime, setPreviewStartTime] = useState<number | null>(null)
  const [progressSaved, setProgressSaved] = useState(false)
  
  // Timer logic
  useEffect(() => {
    // ... timer implementation
  }, [previewStartTime])
  
  // Save progress
  const saveProgress = useCallback(async (seconds: number) => {
    // ... save logic
  }, [])
  
  return { timeLeft, saveProgress, /* ... */ }
}

// hooks/usePrecheck.ts
export function usePrecheck() {
  const [result, setResult] = useState<PrecheckResponse | null>(null)
  const [loading, setLoading] = useState(false)
  
  const runPrecheck = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/precheck')
      const data = await res.json()
      setResult(data)
    } finally {
      setLoading(false)
    }
  }, [])
  
  return { result, loading, runPrecheck }
}

// components/PreviewTimer.tsx
export function PreviewTimer({ timeLeft }: { timeLeft: number }) {
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  
  return (
    <div className="text-2xl font-bold">
      {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  )
}

// Then use in main page:
export default function MoneyGlitchPage() {
  const { timeLeft, saveProgress } = usePreview()
  const { result, runPrecheck } = usePrecheck()
  
  // Much simpler component logic
}
```

---

## Priority 3: Next Quarter (3 Months)

### 3.1 Add Monitoring and Observability 📊

- [ ] Integrate error tracking (Sentry)
- [ ] Add performance monitoring (New Relic / DataDog)
- [ ] Implement custom metrics and dashboards
- [ ] Add health check endpoints with detailed status

### 3.2 Improve Documentation 📚

- [ ] Add JSDoc comments to all functions
- [ ] Create API documentation (OpenAPI/Swagger)
- [ ] Write deployment guide
- [ ] Create troubleshooting guide
- [ ] Add architecture diagrams

### 3.3 Performance Optimization 🚀

- [ ] Add response caching
- [ ] Implement code splitting
- [ ] Add image optimization
- [ ] Optimize bundle size
- [ ] Add service worker for offline support

---

## Success Metrics

- [ ] Test coverage > 80%
- [ ] No critical or high security vulnerabilities
- [ ] Page load time < 2s
- [ ] API response time < 200ms (p95)
- [ ] Error rate < 0.1%
- [ ] Memory usage stable over 24h
- [ ] Zero console.log in production

---

## Timeline Summary

| Priority | Timeline | Effort | Impact |
|----------|----------|--------|--------|
| 1 - Immediate | 1 week | 15 hours | High |
| 2 - This Month | 4 weeks | 80 hours | High |
| 3 - Next Quarter | 3 months | 160 hours | Medium |

**Total Estimated Effort:** ~255 developer hours (~32 days)

---

## Next Steps

1. Review this plan with the team
2. Assign priorities and owners
3. Create Jira/GitHub issues
4. Start with Priority 1 tasks
5. Set up CI/CD pipeline
6. Weekly progress reviews
