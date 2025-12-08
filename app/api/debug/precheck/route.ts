import { NextRequest, NextResponse } from 'next/server'
import { requireDebugEnabled, getClientIP } from '@/lib/api-auth'
import { applyRateLimit } from '@/lib/rate-limiter'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Debug endpoint - shows exactly what precheck sees
 * GET /api/debug/precheck
 * 
 * SECURITY: Only available when DEBUG_ENDPOINTS_ENABLED=true
 */
export async function GET(req: NextRequest) {
  // Check if debug endpoints are enabled
  const debugError = requireDebugEnabled()
  if (debugError) return debugError

  // Apply rate limiting
  const clientIP = getClientIP(req)
  const rateLimitError = applyRateLimit(clientIP, 'admin')
  if (rateLimitError) return rateLimitError

  // Get config
  const IP2LOCATION_API_KEYS = (process.env.IP2LOCATION_API_KEY || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean)
  
  const RESTRICTED_COUNTRIES = (process.env.RESTRICTED_COUNTRIES || 'IN')
    .split(',')
    .map(c => c.trim().toUpperCase())
    .filter(Boolean)

  // Get client IP and strip any port
  const stripPort = (raw: string | null): string | null => {
    if (!raw) return null
    const withoutPort = raw.replace(/:(\d+)$/, '')
    if (withoutPort.startsWith('[') && withoutPort.endsWith(']')) {
      return withoutPort.slice(1, -1)
    }
    return withoutPort
  }
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? (stripPort(forwarded.split(',')[0].trim()) || 'unknown') : 'unknown'
  
  // Try all API keys
  let ip2locationResponse: any = null
  let isProxy = false
  let countryCode = 'XX'
  let error: string | null = null
  let apiKeyUsed: string | null = null
  let allKeysTested: Array<{ key: string; status: string; error?: string }> = []
  
  if (IP2LOCATION_API_KEYS.length === 0) {
    error = 'No IP2LOCATION_API_KEY configured'
  } else {
    // Test all keys
    for (let i = 0; i < IP2LOCATION_API_KEYS.length; i++) {
      const apiKey = IP2LOCATION_API_KEYS[i]
      
      try {
        const url = `https://api.ip2location.io/?key=${apiKey}&ip=${ip}&format=json`
        const res = await fetch(url, { cache: 'no-store' })
        
        if (res.ok) {
          const data = await res.json()
          
          if (data.error) {
            allKeysTested.push({
              key: apiKey.substring(0, 8) + '...',
              status: 'error',
              error: data.error.error_message || 'API error'
            })
            continue
          }
          
          // Success - use this response
          ip2locationResponse = data
          apiKeyUsed = apiKey.substring(0, 8) + '...'
          
          // Check ONLY for VPN (proxy is allowed)
          // Only check proxy.is_vpn field - ignore all other proxy types
          isProxy = data.proxy?.is_vpn === true || data.proxy?.is_vpn === 1
          countryCode = (data.country_code || 'XX').toUpperCase()
          
          allKeysTested.push({
            key: apiKey.substring(0, 8) + '...',
            status: 'success'
          })
          break // Stop after first success
        } else {
          allKeysTested.push({
            key: apiKey.substring(0, 8) + '...',
            status: 'error',
            error: `HTTP ${res.status}`
          })
          
          // Continue to next key unless last one
          if (i === IP2LOCATION_API_KEYS.length - 1) {
            error = `All keys failed (last: ${res.status})`
          }
        }
      } catch (e: any) {
        allKeysTested.push({
          key: apiKey.substring(0, 8) + '...',
          status: 'error',
          error: e.message
        })
        
        if (i === IP2LOCATION_API_KEYS.length - 1) {
          error = e.message
        }
      }
    }
  }

  // Check if would be blocked
  const wouldBeBlockedVPN = isProxy
  const wouldBeBlockedCountry = RESTRICTED_COUNTRIES.includes(countryCode)
  const wouldPass = !wouldBeBlockedVPN && !wouldBeBlockedCountry

  return NextResponse.json({
    // Your info
    yourIP: ip,
    
    // API keys status
    apiKeys: {
      total: IP2LOCATION_API_KEYS.length,
      tested: allKeysTested,
      used: apiKeyUsed,
    },
    
    // IP2Location result
    ip2location: {
      response: ip2locationResponse,
      error: error,
    },
    
    // Detection results
    detection: {
      isVPN: isProxy, // Only VPN checked (proxy allowed)
      countryCode: countryCode,
      // Show proxy details for reference
      proxyDetails: ip2locationResponse?.proxy ? {
        is_vpn: ip2locationResponse.proxy.is_vpn,
        is_proxy: ip2locationResponse.is_proxy,
        proxy_type: ip2locationResponse.proxy.proxy_type,
        note: 'Only VPN is blocked - proxy is allowed',
      } : null,
    },
    
    // Config
    config: {
      restrictedCountries: RESTRICTED_COUNTRIES,
    },
    
    // What would happen
    result: {
      wouldBeBlockedForVPN: wouldBeBlockedVPN,
      wouldBeBlockedForCountry: wouldBeBlockedCountry,
      wouldPass: wouldPass,
      message: wouldBeBlockedVPN 
        ? '❌ BLOCKED: VPN detected (proxy is allowed)' 
        : wouldBeBlockedCountry 
          ? `❌ BLOCKED: Country ${countryCode} is restricted`
          : '✅ PASSED: Would show preview'
    },
    
    // Time tracking info
    note: 'Time consumed tracking: IPs are tracked for viewing time. After 60 seconds, users are blocked. Cookie is saved after 30 seconds.'
  })
}
