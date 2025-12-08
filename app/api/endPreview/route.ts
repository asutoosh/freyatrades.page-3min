import { NextRequest, NextResponse } from 'next/server'
import { markPreviewUsed, getIPRecord } from '@/lib/db/ip-store-db'
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
  
  console.log('[EndPreview] Marking preview as ended for IP:', ip)
  
  // Get current record for logging
  const record = await getIPRecord(ip)
  console.log('[EndPreview] Time consumed before end:', record?.timeConsumed || 0, 'seconds')
  
  // Mark preview as used for this IP in database (sets timeConsumed to 180)
  await markPreviewUsed(ip)
  
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
