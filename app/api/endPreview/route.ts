import { NextRequest, NextResponse } from 'next/server'
import { markPreviewUsed, getIPRecord, markFingerprintUsed } from '@/lib/db/ip-store-db'
import { getClientIP } from '@/lib/api-auth'
import { applyRateLimit } from '@/lib/rate-limiter'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Apply rate limiting
  const clientIP = getClientIP(req)
  const rateLimitError = applyRateLimit(clientIP, 'public')
  if (rateLimitError) return rateLimitError

  const ip = clientIP
  
  // Get fingerprint from request body if available
  let fingerprint = ''
  try {
    const body = await req.json().catch(() => ({}))
    fingerprint = body.fingerprint || ''
  } catch {
    // Ignore body parsing errors
  }
  
  console.log('[EndPreview] Marking preview as ended for IP:', ip)
  console.log('[EndPreview] Fingerprint:', fingerprint ? fingerprint.substring(0, 8) + '...' : 'none')
  
  // Get current record for logging
  const record = await getIPRecord(ip)
  console.log('[EndPreview] Time consumed before end:', record?.timeConsumed || 0, 'seconds')
  
  // Use fingerprint from record if not provided in request
  const fpToMark = fingerprint || record?.fingerprint || ''
  
  // Mark preview as used for this IP in database (sets timeConsumed to 180)
  await markPreviewUsed(ip)
  
  // Also mark fingerprint as used (blocks all IPs with same fingerprint)
  if (fpToMark) {
    await markFingerprintUsed(fpToMark)
    console.log('[EndPreview] Marked fingerprint as used')
  }
  
  // Create response with cookie
  const response = NextResponse.json({ ok: true })
  
  // Set cookie to block same browser (1 year expiry)
  response.cookies.set('ft_preview_ended', '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  })
  
  return response
}
