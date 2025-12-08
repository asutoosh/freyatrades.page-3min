import { NextRequest, NextResponse } from 'next/server'
import { markPreviewUsed, getIPRecord } from '@/lib/db/ip-store-db'

// Get client IP from headers (strip port if present)
function getClientIP(req: NextRequest): string {
  const stripPort = (raw: string | null): string | null => {
    if (!raw) return null
    const withoutPort = raw.replace(/:(\d+)$/, '')
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
  
  // Azure specific headers
  const azureIP = stripPort(req.headers.get('x-client-ip'))
  if (azureIP) return azureIP
  
  return '127.0.0.1'
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req)
  
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
