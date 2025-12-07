import { NextRequest, NextResponse } from 'next/server'

/**
 * Debug endpoint to see what's happening with precheck
 * GET /api/debug/precheck
 */
export async function GET(req: NextRequest) {
  const RESTRICTED_COUNTRIES = (process.env.RESTRICTED_COUNTRIES || 'IN')
    .split(',')
    .map(c => c.trim().toUpperCase())
    .filter(Boolean)

  // Get client IP
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  
  // Get IP2Location API key
  const IP2LOCATION_API_KEY = process.env.IP2LOCATION_API_KEY || ''
  
  // Lookup IP - get FULL response to debug
  let ipInfo: any = { countryCode: 'UNKNOWN', isProxy: false, error: null, rawResponse: null }
  
  if (IP2LOCATION_API_KEY && ip !== 'unknown') {
    try {
      const url = `https://api.ip2location.io/?key=${IP2LOCATION_API_KEY}&ip=${ip}&format=json`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        
        // Check all possible proxy indicators
        const isProxy = Boolean(
          data.is_proxy === true ||
          data.is_proxy === 1 ||
          data.proxy_type === 'VPN' ||
          data.proxy_type === 'TOR' ||
          data.proxy_type === 'DCH' ||
          data.proxy_type === 'PUB' ||
          data.proxy_type === 'WEB' ||
          (data.usage_type && data.usage_type.includes('VPN')) ||
          (data.usage_type && data.usage_type.includes('DCH'))
        )
        
        ipInfo = {
          countryCode: (data.country_code || 'XX').toUpperCase(),
          isProxy: isProxy,
          error: null,
          rawResponse: data, // Include full response for debugging
        }
      } else {
        ipInfo.error = `API returned ${res.status}`
      }
    } catch (error: any) {
      ipInfo.error = error.message
    }
  }

  return NextResponse.json({
    debug: {
      yourIP: ip,
      detectedCountry: ipInfo.countryCode,
      isProxy: ipInfo.isProxy,
      restrictedCountries: RESTRICTED_COUNTRIES,
      isRestricted: RESTRICTED_COUNTRIES.includes(ipInfo.countryCode),
      ip2LocationKey: IP2LOCATION_API_KEY ? '✅ Set' : '❌ Missing',
      error: ipInfo.error,
      // Show raw IP2Location response to understand what fields are available
      ip2LocationRawResponse: ipInfo.rawResponse,
    },
  })
}

