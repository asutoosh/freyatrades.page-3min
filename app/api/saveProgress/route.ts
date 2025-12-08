import { NextRequest, NextResponse } from 'next/server'
import { 
  getIPRecord, 
  createIPRecord,
  saveAt30Seconds,
  updateTimeConsumed
} from '@/lib/db/ip-store-db'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

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

/**
 * POST /api/saveProgress
 * Called when user has watched for 30 seconds to save their progress
 * Also called periodically to update time consumed
 * 
 * Body: { secondsWatched: number, trigger: 'threshold' | 'periodic' | 'unload' }
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req)
    const body = await req.json()
    const { secondsWatched = 30, trigger = 'threshold' } = body
    
    console.log('[SaveProgress] IP:', ip, '| Seconds:', secondsWatched, '| Trigger:', trigger)
    
    // Get or create IP record
    let record = await getIPRecord(ip)
    if (!record) {
      record = await createIPRecord(ip, {})
    }
    
    // If this is the 30-second threshold trigger
    if (trigger === 'threshold') {
      const result = await saveAt30Seconds(ip, secondsWatched)
      
      // Create response
      const response = NextResponse.json({ 
        ok: true, 
        cookieSaved: result.shouldSetCookie,
        timeConsumed: (record.timeConsumed || 0) + secondsWatched
      })
      
      // Set cookie if this is first time saving
      if (result.shouldSetCookie) {
        console.log('[SaveProgress] Setting browser cookie for IP:', ip)
        response.cookies.set('ft_preview_started', '1', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 365, // 1 year
          path: '/',
        })
      }
      
      return response
    }
    
    // For periodic updates or unload
    await updateTimeConsumed(ip, secondsWatched)
    
    return NextResponse.json({ 
      ok: true,
      timeConsumed: (record.timeConsumed || 0) + secondsWatched
    })
    
  } catch (error) {
    console.error('[SaveProgress] Error:', error)
    return NextResponse.json({ 
      ok: false, 
      error: 'Failed to save progress' 
    }, { status: 500 })
  }
}

