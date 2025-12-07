import { NextRequest, NextResponse } from 'next/server'
import { 
  getIPRecord, 
  createIPRecord, 
  incrementVPNAttempts 
} from '@/lib/db/ip-store-db'

// Config from env
const RESTRICTED_COUNTRIES = (process.env.RESTRICTED_COUNTRIES || 'IN')
  .split(',')
  .map(c => c.trim().toUpperCase())
  .filter(Boolean)

const PREVIEW_DURATION = Number(process.env.PREVIEW_DURATION_SECONDS || '180')
const VPN_MAX_RETRIES = Number(process.env.VPN_MAX_RETRIES || '5')
const VPN_RETRY_WINDOW_HOURS = Number(process.env.VPN_RETRY_WINDOW_HOURS || '2')
const IP2LOCATION_API_KEY = process.env.IP2LOCATION_API_KEY || ''

// Get client IP from headers
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  const realIP = req.headers.get('x-real-ip')
  if (realIP) {
    return realIP.trim()
  }
  
  // Azure specific headers
  const azureIP = req.headers.get('x-client-ip')
  if (azureIP) {
    return azureIP.trim()
  }
  
  // Fallback for development
  return '127.0.0.1'
}

// Get user agent
function getUserAgent(req: NextRequest): string {
  return req.headers.get('user-agent') || 'Unknown'
}

// Call IP2Location API
async function lookupIP(ip: string): Promise<{
  isProxy: boolean
  countryCode: string
  error?: string
}> {
  // Skip API call in development or if no key
  if (!IP2LOCATION_API_KEY || ip === '127.0.0.1' || ip === '::1') {
    console.log('[Precheck] Skipping IP lookup - no API key or localhost')
    return {
      isProxy: false,
      countryCode: 'US', // Default for dev
    }
  }

  try {
    const url = `https://api.ip2location.io/?key=${IP2LOCATION_API_KEY}&ip=${ip}&format=json`
    const res = await fetch(url, { 
      cache: 'no-store' // Don't cache to ensure fresh results
    })
    
    if (!res.ok) {
      console.error('[Precheck] IP2Location API error:', res.status)
      return { isProxy: false, countryCode: 'XX', error: 'API error' }
    }
    
    const data = await res.json()
    
    // Log full response for debugging
    console.log('[Precheck] IP2Location response for', ip, ':', JSON.stringify(data))
    
    // Check various proxy/VPN indicators from IP2Location
    // Note: Free tier may not include is_proxy or proxy_type fields!
    const isProxy = 
      data.is_proxy === true ||
      data.is_proxy === 1 ||
      data.proxy_type === 'VPN' ||
      data.proxy_type === 'TOR' ||
      data.proxy_type === 'DCH' ||
      data.proxy_type === 'PUB' ||
      data.proxy_type === 'WEB' ||
      (data.usage_type && data.usage_type.includes('VPN')) ||
      (data.usage_type && data.usage_type.includes('DCH')) ||
      (data.usage_type && data.usage_type.includes('SES'))
    
    console.log('[Precheck] VPN detected:', isProxy, 'Country:', data.country_code)
    
    return {
      isProxy: Boolean(isProxy),
      countryCode: (data.country_code || 'XX').toUpperCase(),
    }
  } catch (error) {
    console.error('[Precheck] IP2Location lookup failed:', error)
    return { isProxy: false, countryCode: 'XX', error: 'Lookup failed' }
  }
}

export async function GET(req: NextRequest) {
  const ip = getClientIP(req)
  const userAgent = getUserAgent(req)
  
  // Check for preview-ended cookie
  const previewEndedCookie = req.cookies.get('ft_preview_ended')
  if (previewEndedCookie?.value === '1') {
    return NextResponse.json({
      status: 'blocked',
      reason: 'preview_used',
    })
  }

  // Get or create IP record from database
  let record = await getIPRecord(ip)
  if (!record) {
    // Lookup IP info first
    const ipInfo = await lookupIP(ip)
    record = await createIPRecord(ip, {
      userAgent,
      country: ipInfo.countryCode,
    })
  }

  // Check if preview already used for this IP
  if (record.previewUsed) {
    return NextResponse.json({
      status: 'blocked',
      reason: 'preview_used',
    })
  }

  // Check VPN rate limit (if they've hit it before within window)
  const now = new Date()
  if (
    record.vpnWindowEnd &&
    record.vpnWindowEnd > now &&
    record.vpnAttempts >= VPN_MAX_RETRIES
  ) {
    return NextResponse.json({
      status: 'blocked',
      reason: 'vpn_max_retries',
    })
  }

  // Lookup IP info
  const ipInfo = await lookupIP(ip)

  // Check for VPN/Proxy
  if (ipInfo.isProxy) {
    const { attempts } = await incrementVPNAttempts(ip, VPN_RETRY_WINDOW_HOURS)
    
    if (attempts > VPN_MAX_RETRIES) {
      return NextResponse.json({
        status: 'blocked',
        reason: 'vpn_max_retries',
      })
    }
    
    return NextResponse.json({
      status: 'blocked',
      reason: 'vpn_detected',
    })
  }

  // Check restricted country
  if (RESTRICTED_COUNTRIES.includes(ipInfo.countryCode)) {
    return NextResponse.json({
      status: 'blocked',
      reason: 'restricted_country',
    })
  }

  // All checks passed!
  return NextResponse.json({
    status: 'ok',
    previewDuration: PREVIEW_DURATION,
  })
}
