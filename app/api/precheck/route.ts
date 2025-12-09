import { NextRequest, NextResponse } from 'next/server'
import { 
  getIPRecord, 
  createIPRecord, 
  incrementVPNAttempts,
  startPreviewSession,
  isFingerprintUsed,
  saveFingerprint
} from '@/lib/db/ip-store-db'
import { applyRateLimit } from '@/lib/rate-limiter'

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
const TIME_CONSUMED_THRESHOLD = Number(process.env.TIME_CONSUMED_THRESHOLD || '60') // Block if >60 seconds already consumed

// Get multiple IP2Location API keys (comma-separated for fallback)
// Format: KEY1,KEY2,KEY3
const IP2LOCATION_API_KEYS = (process.env.IP2LOCATION_API_KEY || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean)

// Get client IP from headers and strip any port suffix
function getClientIP(req: NextRequest): string {
  const stripPort = (raw: string | null): string | null => {
    if (!raw) return null
    // Remove trailing :port for IPv4 (e.g., 1.2.3.4:5678)
    const withoutPort = raw.replace(/:(\d+)$/, '')
    // Remove brackets for IPv6 with brackets
    if (withoutPort.startsWith('[') && withoutPort.endsWith(']')) {
      return withoutPort.slice(1, -1)
    }
    return withoutPort
  }

  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0].trim()
    const ip = stripPort(first)
    if (ip) return ip
  }
  
  const realIP = stripPort(req.headers.get('x-real-ip'))
  if (realIP) return realIP
  
  const azureIP = stripPort(req.headers.get('x-client-ip'))
  if (azureIP) return azureIP
  
  return '127.0.0.1'
}

// Get user agent
function getUserAgent(req: NextRequest): string {
  return req.headers.get('user-agent') || 'Unknown'
}

// Call IP2Location API with fallback to multiple keys
// Returns isProxy=true ONLY if VPN detected (proxy is allowed)
async function lookupIP(ip: string): Promise<{
  isProxy: boolean
  countryCode: string
  apiKeyUsed?: string
  error?: string
}> {
  // Skip for localhost
  if (ip === '127.0.0.1' || ip === '::1') {
    console.log('[Precheck] Localhost - skipping IP lookup')
    return { isProxy: false, countryCode: 'US' }
  }

  // Must have at least one API key
  if (IP2LOCATION_API_KEYS.length === 0) {
    console.error('[Precheck] IP2LOCATION_API_KEY not configured!')
    return { isProxy: false, countryCode: 'XX', error: 'No API keys configured' }
  }

  // Try each API key until one works
  let lastError: Error | null = null
  
  for (let i = 0; i < IP2LOCATION_API_KEYS.length; i++) {
    const apiKey = IP2LOCATION_API_KEYS[i]
    const isLastKey = i === IP2LOCATION_API_KEYS.length - 1
    
    try {
      const url = `https://api.ip2location.io/?key=${apiKey}&ip=${ip}&format=json`
      console.log(`[Precheck] Calling IP2Location (key ${i + 1}/${IP2LOCATION_API_KEYS.length}) for IP:`, ip)
      
      const res = await fetch(url, { 
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      })
      
      // Check for rate limiting (429) or quota exceeded
      if (res.status === 429 || res.status === 402 || res.status === 403) {
        console.warn(`[Precheck] API key ${i + 1} rate limited/quota exceeded (${res.status}), trying next key...`)
        if (!isLastKey) continue // Try next key
        // If last key, return error
        return { 
          isProxy: false, 
          countryCode: 'XX', 
          error: `All API keys rate limited (last: ${res.status})`,
          apiKeyUsed: apiKey.substring(0, 8) + '...'
        }
      }
      
      if (!res.ok) {
        console.error(`[Precheck] IP2Location API error with key ${i + 1}:`, res.status, res.statusText)
        if (!isLastKey) continue // Try next key
        // If last key, return error
        lastError = new Error(`API returned ${res.status}`)
        continue
      }
      
      const data = await res.json()
      
      // Check for API error in response
      if (data.error) {
        console.error(`[Precheck] IP2Location API error in response (key ${i + 1}):`, data.error.error_message)
        if (!isLastKey) continue // Try next key
        return { 
          isProxy: false, 
          countryCode: 'XX', 
          error: data.error.error_message || 'API error',
          apiKeyUsed: apiKey.substring(0, 8) + '...'
        }
      }
      
      console.log(`[Precheck] IP2Location response (key ${i + 1}):`, JSON.stringify(data))
      
      // Check ONLY for VPN (not proxy)
      // Only check proxy.is_vpn field - ignore all other proxy types
      const isVPN = data.proxy?.is_vpn === true || data.proxy?.is_vpn === 1
      
      // Get country code (required for location blocking)
      const countryCode = (data.country_code || 'XX').toUpperCase()
      
      console.log('[Precheck] VPN detection:')
      console.log(`  - API key used: ${i + 1}/${IP2LOCATION_API_KEYS.length} (${apiKey.substring(0, 8)}...)`)
      console.log('  - proxy.is_vpn:', isVPN)
      console.log('  - Country:', countryCode)
      console.log('  - Note: Proxy detection disabled - only VPN blocked')
      
      return { 
        isProxy: isVPN, // Keep isProxy name for compatibility
        countryCode,
        apiKeyUsed: apiKey.substring(0, 8) + '...'
      }
      
    } catch (error) {
      console.error(`[Precheck] IP2Location lookup failed with key ${i + 1}:`, error)
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // If not last key, try next one
      if (!isLastKey) continue
    }
  }
  
  // All keys failed
  console.error('[Precheck] All IP2Location API keys failed!', lastError?.message)
  return { 
    isProxy: false, 
    countryCode: 'XX', 
    error: lastError?.message || 'All API keys failed'
  }
}

export async function GET(req: NextRequest) {
  // Apply rate limiting
  const clientIP = getClientIP(req)
  const rateLimitError = applyRateLimit(clientIP, 'public')
  if (rateLimitError) return rateLimitError

  try {
    const ip = clientIP
    const userAgent = getUserAgent(req)
    
    // Get fingerprint from query string (sent by client)
    const fingerprint = req.nextUrl.searchParams.get('fp') || ''
    
    console.log('[Precheck] === START === IP:', ip)
    console.log('[Precheck] Fingerprint:', fingerprint ? fingerprint.substring(0, 8) + '...' : 'none')
    console.log('[Precheck] Restricted countries:', RESTRICTED_COUNTRIES)
    
    // ========================================
    // STEP 1: Check for preview-ended cookie (fastest check)
    // ========================================
    const previewEndedCookie = req.cookies.get('ft_preview_ended')
    if (previewEndedCookie?.value === '1') {
      console.log('[Precheck] Blocked: preview_used (cookie)')
      return NextResponse.json({ status: 'blocked', reason: 'preview_used' })
    }

    // ========================================
    // STEP 2: Get fingerprint record (if fingerprint provided)
    // ========================================
    let fpRecord = null
    let fpTimeConsumed = 0
    if (fingerprint) {
      const fpCheck = await isFingerprintUsed(fingerprint)
      if (fpCheck.used) {
        console.log('[Precheck] Blocked: fingerprint already used preview')
        return NextResponse.json({ status: 'blocked', reason: 'preview_used' })
      }
      fpTimeConsumed = fpCheck.timeConsumed
      console.log('[Precheck] Fingerprint timeConsumed:', fpTimeConsumed)
    }

    // ========================================
    // STEP 3: Get or create IP record
    // ========================================
    let record = await getIPRecord(ip)
    
    // Check if preview already used for this IP
    if (record?.previewUsed) {
      console.log('[Precheck] Blocked: preview_used (IP record)')
      return NextResponse.json({ status: 'blocked', reason: 'preview_used' })
    }
    
    const ipTimeConsumed = record?.timeConsumed || 0

    // ========================================
    // STEP 4: Use MAX timeConsumed from IP AND fingerprint
    // This catches users who switch IP but same device
    // ========================================
    const maxTimeConsumed = Math.max(ipTimeConsumed, fpTimeConsumed)
    console.log('[Precheck] IP timeConsumed:', ipTimeConsumed, '| FP timeConsumed:', fpTimeConsumed, '| MAX:', maxTimeConsumed)
    
    if (maxTimeConsumed >= TIME_CONSUMED_THRESHOLD) {
      console.log('[Precheck] Blocked: time_consumed exceeds threshold -', maxTimeConsumed, 'seconds')
      return NextResponse.json({ status: 'blocked', reason: 'preview_used' })
    }

    // ========================================
    // STEP 5: Check VPN rate limit
    // ========================================
    const now = new Date()
    if (record?.vpnWindowEnd && record.vpnWindowEnd > now && record.vpnAttempts >= VPN_MAX_RETRIES) {
      console.log('[Precheck] Blocked: vpn_max_retries')
      return NextResponse.json({ status: 'blocked', reason: 'vpn_max_retries' })
    }

    // ========================================
    // STEP 6: Lookup IP with IP2Location
    // ========================================
    const ipInfo = await lookupIP(ip)
    
    if (ipInfo.error) {
      console.warn('[Precheck] IP lookup had error:', ipInfo.error, 'but continuing')
    }
    
    // ========================================
    // STEP 7: Check for VPN
    // ========================================
    if (ipInfo.isProxy) {
      console.log('[Precheck] VPN DETECTED!')
      
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

    // ========================================
    // STEP 8: Check restricted country
    // ========================================
    if (RESTRICTED_COUNTRIES.includes(ipInfo.countryCode)) {
      console.log('[Precheck] Blocked: restricted_country -', ipInfo.countryCode)
      return NextResponse.json({ status: 'blocked', reason: 'restricted_country' })
    }

    // ========================================
    // STEP 9: Create IP record if doesn't exist
    // ========================================
    if (!record) {
      record = await createIPRecord(ip, { userAgent, country: ipInfo.countryCode })
    }

    // ========================================
    // STEP 10: Start preview session and link fingerprint
    // ========================================
    await startPreviewSession(ip)
    
    // Save fingerprint to link device to this IP record
    if (fingerprint) {
      await saveFingerprint(ip, fingerprint)
      console.log('[Precheck] Linked fingerprint to IP:', ip)
    }

    // ========================================
    // STEP 11: Calculate remaining time (use MAX consumed)
    // ========================================
    const remainingDuration = Math.max(PREVIEW_DURATION - maxTimeConsumed, 0)
    
    // All checks passed!
    console.log('[Precheck] === PASSED === Allowing preview')
    console.log('[Precheck] Max time consumed:', maxTimeConsumed, 'seconds')
    console.log('[Precheck] Remaining duration:', remainingDuration, 'seconds')
    
    return NextResponse.json({
      status: 'ok',
      previewDuration: remainingDuration,
      timeConsumed: maxTimeConsumed,
    })
    
  } catch (error) {
    console.error('[Precheck] Error:', error)
    // On error, allow access (fail open) but log it
    return NextResponse.json({
      status: 'ok',
      previewDuration: PREVIEW_DURATION,
      timeConsumed: 0,
    })
  }
}
