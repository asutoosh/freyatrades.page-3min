/**
 * IP Utilities
 * 
 * Centralized IP extraction and validation logic
 * Prevents code duplication across API routes
 */

import { NextRequest } from 'next/server'

/**
 * Strip port number from IP address string
 * Handles both IPv4 and IPv6 formats
 */
function stripPort(raw: string | null): string | null {
  if (!raw) return null
  
  // Remove trailing :port for IPv4 (e.g., 1.2.3.4:5678)
  const withoutPort = raw.replace(/:(\d+)$/, '')
  
  // Remove brackets for IPv6 with brackets [::1]:port
  if (withoutPort.startsWith('[') && withoutPort.endsWith(']')) {
    return withoutPort.slice(1, -1)
  }
  
  return withoutPort
}

/**
 * Extract client IP address from request headers
 * Tries multiple headers in order of reliability:
 * 1. x-forwarded-for (first IP in list, closest to client)
 * 2. x-real-ip
 * 3. x-client-ip (Azure specific)
 * 4. Falls back to localhost
 * 
 * @param req - Next.js request object
 * @returns Client IP address
 */
export function getClientIP(req: NextRequest): string {
  // Trust only the first IP in x-forwarded-for (closest to client)
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0].trim()
    const ip = stripPort(first)
    if (ip) return ip
  }
  
  // Try x-real-ip header
  const realIP = stripPort(req.headers.get('x-real-ip'))
  if (realIP) return realIP
  
  // Azure specific header
  const azureIP = stripPort(req.headers.get('x-client-ip'))
  if (azureIP) return azureIP
  
  // Fallback to localhost (development)
  return '127.0.0.1'
}

/**
 * Validate IP address format (IPv4 or IPv6)
 * @param ip - IP address string
 * @returns true if valid IP format
 */
export function isValidIP(ip: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  
  // IPv6 pattern (simplified - covers most valid cases)
  const ipv6Pattern = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){0,6}::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$/
  
  // Localhost
  if (ip === '127.0.0.1' || ip === '::1') return true
  
  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip)
}

/**
 * Check if IP is localhost
 * @param ip - IP address string
 * @returns true if localhost
 */
export function isLocalhost(ip: string): boolean {
  return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost'
}

/**
 * Get user agent from request
 * @param req - Next.js request object
 * @returns User agent string
 */
export function getUserAgent(req: NextRequest): string {
  return req.headers.get('user-agent') || 'Unknown'
}
