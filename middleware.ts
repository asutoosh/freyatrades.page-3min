/**
 * Next.js Middleware
 * 
 * Adds security headers and CORS protection to all responses
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Get allowed origins from environment (comma-separated)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

// Default to same-origin if no origins configured
const DEFAULT_ALLOW_ORIGIN = process.env.NODE_ENV === 'development' 
  ? '*' 
  : null

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true // Same-origin requests
  if (ALLOWED_ORIGINS.length === 0) return true // No restrictions configured
  return ALLOWED_ORIGINS.includes(origin)
}

/**
 * Get CORS origin header value
 */
function getCorsOrigin(origin: string | null): string | null {
  if (!origin) return null
  
  // In development, allow all origins
  if (process.env.NODE_ENV === 'development') {
    return origin
  }
  
  // Check if origin is in allowed list
  if (ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin)) {
    return origin
  }
  
  // Default: don't set CORS header (same-origin only)
  return DEFAULT_ALLOW_ORIGIN
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin')
  const response = NextResponse.next()

  // ============================================
  // Security Headers
  // ============================================

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // XSS Protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Content Security Policy (API routes don't need strict CSP, but good default)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'"
    )
  }

  // HSTS - Force HTTPS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    )
  }

  // Permissions Policy - Restrict browser features
  response.headers.set(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  )

  // ============================================
  // CORS Headers (for API routes)
  // ============================================

  if (request.nextUrl.pathname.startsWith('/api/')) {
    const corsOrigin = getCorsOrigin(origin)
    
    if (corsOrigin) {
      response.headers.set('Access-Control-Allow-Origin', corsOrigin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      response.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With'
      )
      response.headers.set('Access-Control-Max-Age', '86400') // 24 hours

      // Return early for OPTIONS requests
      return new NextResponse(null, {
        status: 204,
        headers: response.headers,
      })
    }

    // Block requests from disallowed origins (except same-origin)
    if (origin && !isOriginAllowed(origin) && process.env.NODE_ENV === 'production') {
      console.warn(`[Security] Blocked request from disallowed origin: ${origin}`)
      return new NextResponse(
        JSON.stringify({ error: 'Origin not allowed' }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(response.headers),
          },
        }
      )
    }
  }

  return response
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match main pages (for security headers)
    '/',
    '/money-glitch',
  ],
}

