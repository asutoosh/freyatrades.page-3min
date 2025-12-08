/**
 * Rate Limiter
 * 
 * IP-based rate limiting using in-memory store
 * Limits:
 * - Admin endpoints: 10 requests/minute
 * - Public endpoints: 60 requests/minute
 * - Signal ingestion: 100 requests/minute
 */

import { NextResponse } from 'next/server'

// Rate limit configurations
export const RATE_LIMITS = {
  admin: { requests: 10, windowMs: 60 * 1000 },      // 10 req/min
  public: { requests: 60, windowMs: 60 * 1000 },    // 60 req/min
  ingest: { requests: 100, windowMs: 60 * 1000 },   // 100 req/min
  signals: { requests: 30, windowMs: 60 * 1000 },   // 30 req/min (prevent scraping)
} as const

export type RateLimitType = keyof typeof RATE_LIMITS

// In-memory store for rate limiting
interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000
let cleanupTimer: NodeJS.Timeout | null = null

/**
 * Clean up expired rate limit entries
 * Scheduled cleanup prevents memory leaks
 */
function cleanupOldEntries() {
  const now = Date.now()
  let cleaned = 0
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
      cleaned++
    }
  }
  
  if (cleaned > 0) {
    console.log(`[RateLimit] Cleaned ${cleaned} expired entries (${rateLimitStore.size} remaining)`)
  }
}

/**
 * Start scheduled cleanup timer
 * Only runs in server environment (not during SSR)
 */
function startCleanupTimer() {
  // Prevent multiple timers
  if (cleanupTimer) return
  
  // Only run in server environment
  if (typeof setInterval === 'undefined') return
  
  cleanupTimer = setInterval(() => {
    cleanupOldEntries()
  }, CLEANUP_INTERVAL)
  
  // Prevent timer from keeping Node.js process alive
  if (cleanupTimer.unref) {
    cleanupTimer.unref()
  }
  
  console.log('[RateLimit] Cleanup timer started')
}

/**
 * Stop cleanup timer (for graceful shutdown)
 */
export function stopCleanupTimer() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
    console.log('[RateLimit] Cleanup timer stopped')
  }
}

// Start cleanup timer when module loads
if (typeof setInterval !== 'undefined') {
  startCleanupTimer()
}

/**
 * Check if rate limiting is enabled
 */
export function isRateLimitEnabled(): boolean {
  return process.env.RATE_LIMIT_ENABLED === 'true'
}

/**
 * Check rate limit for an IP and endpoint type
 * Returns null if within limit, or remaining seconds until reset if exceeded
 */
export function checkRateLimit(
  ip: string,
  type: RateLimitType
): { allowed: boolean; remaining: number; resetIn: number } {
  // Skip rate limiting if disabled
  if (!isRateLimitEnabled()) {
    return { allowed: true, remaining: 999, resetIn: 0 }
  }

  // Cleanup old entries periodically
  cleanupOldEntries()

  const config = RATE_LIMITS[type]
  const key = `${type}:${ip}`
  const now = Date.now()

  let entry = rateLimitStore.get(key)

  // Create new entry if doesn't exist or window expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + config.windowMs,
    }
    rateLimitStore.set(key, entry)
    return {
      allowed: true,
      remaining: config.requests - 1,
      resetIn: Math.ceil(config.windowMs / 1000),
    }
  }

  // Increment count
  entry.count++
  
  const remaining = Math.max(0, config.requests - entry.count)
  const resetIn = Math.ceil((entry.resetAt - now) / 1000)

  // Check if over limit
  if (entry.count > config.requests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn,
    }
  }

  return {
    allowed: true,
    remaining,
    resetIn,
  }
}

/**
 * Apply rate limit check and return error response if exceeded
 * Returns null if within limit
 */
export function applyRateLimit(
  ip: string,
  type: RateLimitType
): NextResponse | null {
  const result = checkRateLimit(ip, type)

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter: result.resetIn,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.resetIn),
          'X-RateLimit-Limit': String(RATE_LIMITS[type].requests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetIn),
        },
      }
    )
  }

  return null
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  ip: string,
  type: RateLimitType
): NextResponse {
  if (!isRateLimitEnabled()) return response

  const result = checkRateLimit(ip, type)
  
  response.headers.set('X-RateLimit-Limit', String(RATE_LIMITS[type].requests))
  response.headers.set('X-RateLimit-Remaining', String(Math.max(0, result.remaining)))
  response.headers.set('X-RateLimit-Reset', String(result.resetIn))
  
  return response
}

/**
 * Get current rate limit stats (for admin/debugging)
 */
export function getRateLimitStats(): {
  totalEntries: number
  entriesByType: Record<string, number>
} {
  const entriesByType: Record<string, number> = {}
  
  for (const key of rateLimitStore.keys()) {
    const type = key.split(':')[0]
    entriesByType[type] = (entriesByType[type] || 0) + 1
  }
  
  return {
    totalEntries: rateLimitStore.size,
    entriesByType,
  }
}

/**
 * Clear rate limit for an IP (for admin use)
 */
export function clearRateLimit(ip: string, type?: RateLimitType): void {
  if (type) {
    rateLimitStore.delete(`${type}:${ip}`)
  } else {
    // Clear all rate limits for this IP
    for (const limitType of Object.keys(RATE_LIMITS)) {
      rateLimitStore.delete(`${limitType}:${ip}`)
    }
  }
}

