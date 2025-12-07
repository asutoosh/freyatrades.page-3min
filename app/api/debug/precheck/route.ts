import { NextRequest, NextResponse } from 'next/server'

/**
 * Debug endpoint - shows exactly what precheck sees
 * GET /api/debug/precheck
 */
export async function GET(req: NextRequest) {
  // Get config
  const IP2LOCATION_API_KEY = process.env.IP2LOCATION_API_KEY || ''
  const RESTRICTED_COUNTRIES = (process.env.RESTRICTED_COUNTRIES || 'IN')
    .split(',')
    .map(c => c.trim().toUpperCase())
    .filter(Boolean)

  // Get client IP
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  
  // Call IP2Location API
  let ip2locationResponse: any = null
  let isProxy = false
  let countryCode = 'XX'
  let error: string | null = null
  
  if (IP2LOCATION_API_KEY && ip !== 'unknown') {
    try {
      const url = `https://api.ip2location.io/?key=${IP2LOCATION_API_KEY}&ip=${ip}&format=json`
      const res = await fetch(url, { cache: 'no-store' })
      
      if (res.ok) {
        ip2locationResponse = await res.json()
        isProxy = ip2locationResponse.is_proxy === true || ip2locationResponse.is_proxy === 1
        countryCode = (ip2locationResponse.country_code || 'XX').toUpperCase()
      } else {
        error = `API returned ${res.status}`
      }
    } catch (e: any) {
      error = e.message
    }
  } else if (!IP2LOCATION_API_KEY) {
    error = 'IP2LOCATION_API_KEY not configured'
  }

  // Check if would be blocked
  const wouldBeBlockedVPN = isProxy
  const wouldBeBlockedCountry = RESTRICTED_COUNTRIES.includes(countryCode)
  const wouldPass = !wouldBeBlockedVPN && !wouldBeBlockedCountry

  return NextResponse.json({
    // Your info
    yourIP: ip,
    
    // IP2Location result
    ip2location: {
      apiKeyConfigured: !!IP2LOCATION_API_KEY,
      response: ip2locationResponse,
      error: error,
    },
    
    // Detection results
    detection: {
      isProxy: isProxy,
      countryCode: countryCode,
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
        ? '❌ BLOCKED: VPN/Proxy detected' 
        : wouldBeBlockedCountry 
          ? `❌ BLOCKED: Country ${countryCode} is restricted`
          : '✅ PASSED: Would show preview'
    }
  })
}
