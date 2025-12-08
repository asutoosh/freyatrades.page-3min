import { NextRequest, NextResponse } from 'next/server'
import { 
  getIPRecord, 
  createIPRecord,
  saveAt30Seconds,
  updateTimeConsumed
} from '@/lib/db/ip-store-db'
import { getClientIP } from '@/lib/api-auth'
import { applyRateLimit } from '@/lib/rate-limiter'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * POST /api/saveProgress
 * Called when user has watched for 30 seconds to save their progress
 * Also called periodically to update time consumed
 * 
 * Body: { secondsWatched: number, trigger: 'threshold' | 'periodic' | 'unload' }
 */
export async function POST(req: NextRequest) {
  // Apply rate limiting
  const clientIP = getClientIP(req)
  const rateLimitError = applyRateLimit(clientIP, 'public')
  if (rateLimitError) return rateLimitError

  try {
    const ip = clientIP
    const body = await req.json()
    let { secondsWatched = 30, trigger = 'threshold' } = body
    
    // Input validation: secondsWatched must be a positive number within bounds
    if (typeof secondsWatched !== 'number' || isNaN(secondsWatched)) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Invalid secondsWatched value' 
      }, { status: 400 })
    }
    
    // Clamp to reasonable bounds (0-300 seconds = 0-5 minutes max per call)
    secondsWatched = Math.max(0, Math.min(300, Math.floor(secondsWatched)))
    
    // Validate trigger value
    const validTriggers = ['threshold', 'periodic', 'unload']
    if (!validTriggers.includes(trigger)) {
      trigger = 'threshold'
    }
    
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

