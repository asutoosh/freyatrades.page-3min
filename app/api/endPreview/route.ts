import { NextRequest, NextResponse } from 'next/server'
import { markPreviewUsed } from '@/lib/db/ip-store-db'

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
  
  return '127.0.0.1'
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req)
  
  // Mark preview as used for this IP in database
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
