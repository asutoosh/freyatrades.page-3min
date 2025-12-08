import { NextRequest, NextResponse } from 'next/server'
import { 
  getIPRecord, 
  createIPRecord, 
  incrementVPNAttempts 
} from '@/lib/db/ip-store-db'

// Force dynamic rendering (needed because we access request.headers)
export const dynamic = 'force-dynamic'

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
  // Azure App Service uses x-forwarded-for
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  // Alternative headers
  const realIP = req.headers.get('x-real-ip')
  if (realIP) return realIP.trim()
  
  const azureIP = req.headers.get('x-client-ip')
  if (azureIP) return azureIP.trim()
  
  // Fallback for development
  return '127.0.0.1'
}

// Get user agent
function getUserAgent(req: NextRequest): string {
  return req.headers.get('user-agent') || 'Unknown'
}

// Call IP2Location API directly
async function lookupIP(ip: string): Promise<{
  isProxy: boolean
  countryCode: string
}> {
  // Skip for localhost
  if (ip === '127.0.0.1' || ip === '::1') {
    console.log('[Precheck] Localhost - skipping IP lookup')
    return { isProxy: false, countryCode: 'US' }
  }

  // Must have API key
  if (!IP2LOCATION_API_KEY) {
    console.error('[Precheck] IP2LOCATION_API_KEY not configured!')
    return { isProxy: false, countryCode: 'XX' }
  }

  try {
    const url = `https://api.ip2location.io/?key=${IP2LOCATION_API_KEY}&ip=${ip}&format=json`
    console.log('[Precheck] Calling IP2Location for IP:', ip)
    
    const res = await fetch(url, { 
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    })
    
    if (!res.ok) {
      console.error('[Precheck] IP2Location API error:', res.status, res.statusText)
      return { isProxy: false, countryCode: 'XX' }
    }
    
    const data = await res.json()
    console.log('[Precheck] IP2Location response:', JSON.stringify(data))
    
    // Check proxy/VPN detection using ALL available fields
    // Top-level check
    const topLevelProxy = data.is_proxy === true || data.is_proxy === 1
    
    // Nested proxy object check (more detailed)
    let proxyDetails = {
      isVPN: false,
      isTor: false,
      isResidentialProxy: false,
      isDataCenter: false,
      isPublicProxy: false,
      isWebProxy: false,
      proxyType: null,
    }
    
    if (data.proxy) {
      proxyDetails = {
        isVPN: data.proxy.is_vpn === true || data.proxy.is_vpn === 1,
        isTor: data.proxy.is_tor === true || data.proxy.is_tor === 1,
        isResidentialProxy: data.proxy.is_residential_proxy === true || data.proxy.is_residential_proxy === 1,
        isDataCenter: data.proxy.is_data_center === true || data.proxy.is_data_center === 1,
        isPublicProxy: data.proxy.is_public_proxy === true || data.proxy.is_public_proxy === 1,
        isWebProxy: data.proxy.is_web_proxy === true || data.proxy.is_web_proxy === 1,
        proxyType: data.proxy.proxy_type || null,
      }
    }
    
    // Consider it a proxy if:
    // 1. Top-level is_proxy is true, OR
    // 2. Any of the proxy details indicate proxy/VPN
    const isProxy = topLevelProxy || 
                    proxyDetails.isVPN || 
                    proxyDetails.isTor || 
                    proxyDetails.isResidentialProxy ||
                    proxyDetails.isDataCenter ||
                    proxyDetails.isPublicProxy ||
                    proxyDetails.isWebProxy ||
                    (proxyDetails.proxyType && proxyDetails.proxyType !== '-')
    
    const countryCode = (data.country_code || 'XX').toUpperCase()
    
    console.log('[Precheck] Proxy detection:')
    console.log('  - is_proxy (top-level):', topLevelProxy)
    console.log('  - proxy.is_vpn:', proxyDetails.isVPN)
    console.log('  - proxy.is_residential_proxy:', proxyDetails.isResidentialProxy)
    console.log('  - proxy.proxy_type:', proxyDetails.proxyType)
    console.log('  - Final isProxy:', isProxy)
    console.log('  - Country:', countryCode)
    
    return { isProxy, countryCode }
  } catch (error) {
    console.error('[Precheck] IP2Location lookup failed:', error)
    return { isProxy: false, countryCode: 'XX' }
  }
}

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIP(req)
    const userAgent = getUserAgent(req)
    
    console.log('[Precheck] === START === IP:', ip)
    console.log('[Precheck] Restricted countries:', RESTRICTED_COUNTRIES)
    
    // Step 1: Check for preview-ended cookie
    const previewEndedCookie = req.cookies.get('ft_preview_ended')
    if (previewEndedCookie?.value === '1') {
      console.log('[Precheck] Blocked: preview_used (cookie)')
      return NextResponse.json({ status: 'blocked', reason: 'preview_used' })
    }

    // Step 2: Get or create IP record
    let record = await getIPRecord(ip)
    
    // Step 3: Check if preview already used for this IP
    if (record?.previewUsed) {
      console.log('[Precheck] Blocked: preview_used (IP record)')
      return NextResponse.json({ status: 'blocked', reason: 'preview_used' })
    }

    // Step 4: Check VPN rate limit
    const now = new Date()
    if (record?.vpnWindowEnd && record.vpnWindowEnd > now && record.vpnAttempts >= VPN_MAX_RETRIES) {
      console.log('[Precheck] Blocked: vpn_max_retries')
      return NextResponse.json({ status: 'blocked', reason: 'vpn_max_retries' })
    }

    // Step 5: Lookup IP with IP2Location
    const ipInfo = await lookupIP(ip)
    
    // Step 6: Check for VPN/Proxy FIRST
    if (ipInfo.isProxy) {
      console.log('[Precheck] VPN/Proxy DETECTED!')
      
      // Create record if doesn't exist
      if (!record) {
        record = await createIPRecord(ip, { userAgent, country: ipInfo.countryCode })
      }
      
      // Increment VPN attempts
      const { attempts } = await incrementVPNAttempts(ip, VPN_RETRY_WINDOW_HOURS)
      
      if (attempts > VPN_MAX_RETRIES) {
        console.log('[Precheck] Blocked: vpn_max_retries (exceeded)')
        return NextResponse.json({ status: 'blocked', reason: 'vpn_max_retries' })
      }
      
      console.log('[Precheck] Blocked: vpn_detected (attempt', attempts, ')')
      return NextResponse.json({ status: 'blocked', reason: 'vpn_detected' })
    }

    // Step 7: Check restricted country
    if (RESTRICTED_COUNTRIES.includes(ipInfo.countryCode)) {
      console.log('[Precheck] Blocked: restricted_country -', ipInfo.countryCode)
      return NextResponse.json({ status: 'blocked', reason: 'restricted_country' })
    }

    // Step 8: Create IP record if doesn't exist
    if (!record) {
      await createIPRecord(ip, { userAgent, country: ipInfo.countryCode })
    }

    // All checks passed!
    console.log('[Precheck] === PASSED === Allowing preview')
    return NextResponse.json({
      status: 'ok',
      previewDuration: PREVIEW_DURATION,
    })
    
  } catch (error) {
    console.error('[Precheck] Error:', error)
    // On error, allow access (fail open) but log it
    return NextResponse.json({
      status: 'ok',
      previewDuration: PREVIEW_DURATION,
    })
  }
}
