/**
 * API Authentication Utilities
 * 
 * Centralized authentication module for API security:
 * - Timing-safe string comparison to prevent timing attacks
 * - Admin and Ingest API key validation
 * - Debug mode checks
 */

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

// Environment variable keys
const ADMIN_API_KEY = process.env.ADMIN_API_KEY
const INGEST_API_KEY = process.env.INGEST_API_KEY
const DEBUG_ENDPOINTS_ENABLED = process.env.DEBUG_ENDPOINTS_ENABLED

/**
 * Timing-safe string comparison to prevent timing attacks
 * Returns false if strings have different lengths (but still takes constant time)
 */
function secureCompare(a: string, b: string): boolean {
  if (!a || !b) return false
  
  // Convert to buffers for timing-safe comparison
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  
  // If lengths differ, still do comparison with padded buffer to prevent timing leak
  if (bufA.length !== bufB.length) {
    // Compare with self to maintain constant time, but return false
    timingSafeEqual(bufA, bufA)
    return false
  }
  
  return timingSafeEqual(bufA, bufB)
}

/**
 * Extract API key from Authorization header
 * Supports: "Bearer <key>" format
 */
function extractApiKey(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null
  
  // Support "Bearer <key>" format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  
  return authHeader
}

/**
 * Validate Admin API key
 * Returns true if valid, false otherwise
 */
export function validateAdminKey(req: NextRequest): boolean {
  if (!ADMIN_API_KEY) {
    console.error('[Auth] ADMIN_API_KEY environment variable is not set!')
    return false
  }
  
  const providedKey = extractApiKey(req)
  if (!providedKey) return false
  
  return secureCompare(providedKey, ADMIN_API_KEY)
}

/**
 * Validate Ingest API key
 * Returns true if valid, false otherwise
 */
export function validateIngestKey(req: NextRequest): boolean {
  if (!INGEST_API_KEY) {
    console.error('[Auth] INGEST_API_KEY environment variable is not set!')
    return false
  }
  
  const providedKey = extractApiKey(req)
  if (!providedKey) return false
  
  return secureCompare(providedKey, INGEST_API_KEY)
}

/**
 * Validate either Admin or Ingest key (for endpoints that accept both)
 */
export function validateAdminOrIngestKey(req: NextRequest): boolean {
  const providedKey = extractApiKey(req)
  if (!providedKey) return false
  
  // Check admin key first
  if (ADMIN_API_KEY && secureCompare(providedKey, ADMIN_API_KEY)) {
    return true
  }
  
  // Then check ingest key
  if (INGEST_API_KEY && secureCompare(providedKey, INGEST_API_KEY)) {
    return true
  }
  
  return false
}

/**
 * Check if debug endpoints are enabled
 * Only enabled when explicitly set to 'true'
 */
export function isDebugEnabled(): boolean {
  return DEBUG_ENDPOINTS_ENABLED === 'true'
}

/**
 * Check if API keys are properly configured
 */
export function areApiKeysConfigured(): { admin: boolean; ingest: boolean } {
  return {
    admin: !!ADMIN_API_KEY && ADMIN_API_KEY.length >= 32,
    ingest: !!INGEST_API_KEY && INGEST_API_KEY.length >= 32,
  }
}

/**
 * Standard unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  )
}

/**
 * Standard forbidden response (for disabled features)
 */
export function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  )
}

/**
 * Standard not found response (for hidden endpoints)
 */
export function notFoundResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Not Found' },
    { status: 404 }
  )
}

/**
 * Middleware helper: Require admin authentication
 * Use at the start of admin route handlers
 */
export function requireAdminAuth(req: NextRequest): NextResponse | null {
  if (!validateAdminKey(req)) {
    return unauthorizedResponse('Invalid or missing admin API key')
  }
  return null // null means auth passed
}

/**
 * Middleware helper: Require ingest authentication
 * Use at the start of ingest route handlers
 */
export function requireIngestAuth(req: NextRequest): NextResponse | null {
  if (!validateIngestKey(req)) {
    return unauthorizedResponse('Invalid or missing ingest API key')
  }
  return null // null means auth passed
}

/**
 * Middleware helper: Require debug mode enabled
 * Use at the start of debug route handlers
 */
export function requireDebugEnabled(): NextResponse | null {
  if (!isDebugEnabled()) {
    return notFoundResponse()
  }
  return null // null means debug is enabled
}

/**
 * Get client IP from request headers
 * Handles various proxy headers safely
 */
export function getClientIP(req: NextRequest): string {
  const stripPort = (raw: string | null): string | null => {
    if (!raw) return null
    const withoutPort = raw.replace(/:(\d+)$/, '')
    if (withoutPort.startsWith('[') && withoutPort.endsWith(']')) {
      return withoutPort.slice(1, -1)
    }
    return withoutPort
  }

  // Trust only the first IP in x-forwarded-for (closest to client)
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0].trim()
    const ip = stripPort(first)
    if (ip) return ip
  }
  
  const realIP = stripPort(req.headers.get('x-real-ip'))
  if (realIP) return realIP
  
  // Azure specific header
  const azureIP = stripPort(req.headers.get('x-client-ip'))
  if (azureIP) return azureIP
  
  return '127.0.0.1'
}

/**
 * Validate IP address format (IPv4 or IPv6)
 */
export function isValidIP(ip: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  
  // IPv6 pattern (simplified - accepts most valid IPv6)
  const ipv6Pattern = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){0,6}::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$/
  
  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip) || ip === '127.0.0.1' || ip === '::1'
}

