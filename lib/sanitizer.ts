/**
 * Input Sanitization Utilities
 * 
 * Protects against XSS, HTML injection, and other malicious input
 * Uses DOMPurify for robust sanitization
 */

import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize text input - removes ALL HTML tags
 * Use for plain text inputs like messages, names, etc.
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Keep text content, just remove tags
  })
}

/**
 * Sanitize HTML content - allows safe HTML tags only
 * Use for rich text content that needs formatting
 */
export function sanitizeHTML(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  })
}

/**
 * Validate and sanitize IP address
 * Returns empty string if invalid
 */
export function sanitizeIP(ip: string): string {
  if (!ip || typeof ip !== 'string') {
    return ''
  }
  
  // Remove any HTML tags
  const cleaned = sanitizeText(ip)
  
  // IPv4 pattern
  const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  
  // IPv6 pattern (simplified)
  const ipv6Pattern = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$/
  
  // Localhost
  if (cleaned === '127.0.0.1' || cleaned === '::1') {
    return cleaned
  }
  
  // Validate format
  if (ipv4Pattern.test(cleaned) || ipv6Pattern.test(cleaned)) {
    return cleaned
  }
  
  return ''
}

/**
 * Sanitize URL - ensures it's a valid HTTP(S) URL
 * Returns empty string if invalid
 */
export function sanitizeURL(url: string, allowedDomains?: string[]): string {
  if (!url || typeof url !== 'string') {
    return ''
  }
  
  try {
    const parsed = new URL(url)
    
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return ''
    }
    
    // If domains specified, validate against whitelist
    if (allowedDomains && allowedDomains.length > 0) {
      const domainMatch = allowedDomains.some(domain => {
        return parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
      })
      
      if (!domainMatch) {
        return ''
      }
    }
    
    return parsed.toString()
  } catch {
    return ''
  }
}

/**
 * Sanitize numeric input
 * Returns 0 if invalid
 */
export function sanitizeNumber(
  input: any,
  options?: { min?: number; max?: number; defaultValue?: number }
): number {
  const num = Number(input)
  
  if (isNaN(num)) {
    return options?.defaultValue ?? 0
  }
  
  let result = num
  
  if (options?.min !== undefined && result < options.min) {
    result = options.min
  }
  
  if (options?.max !== undefined && result > options.max) {
    result = options.max
  }
  
  return result
}

/**
 * Sanitize object keys and values
 * Removes any potentially dangerous keys or values
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  allowedKeys: string[]
): Partial<T> {
  const result: Partial<T> = {}
  
  for (const key of allowedKeys) {
    if (key in obj) {
      const value = obj[key]
      
      if (typeof value === 'string') {
        result[key as keyof T] = sanitizeText(value) as any
      } else if (typeof value === 'number') {
        result[key as keyof T] = value
      } else if (typeof value === 'boolean') {
        result[key as keyof T] = value
      }
      // Skip other types (objects, arrays, functions, etc.)
    }
  }
  
  return result
}

/**
 * Sanitize user agent string
 * Limits length and removes potentially malicious content
 */
export function sanitizeUserAgent(userAgent: string): string {
  if (!userAgent || typeof userAgent !== 'string') {
    return 'Unknown'
  }
  
  // Remove HTML tags
  const cleaned = sanitizeText(userAgent)
  
  // Limit length
  const maxLength = 200
  if (cleaned.length > maxLength) {
    return cleaned.substring(0, maxLength)
  }
  
  return cleaned
}

/**
 * Sanitize email address
 * Returns empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return ''
  }
  
  // Remove HTML tags
  const cleaned = sanitizeText(email).trim().toLowerCase()
  
  // Basic email validation
  const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/
  
  if (emailPattern.test(cleaned) && cleaned.length <= 254) {
    return cleaned
  }
  
  return ''
}
