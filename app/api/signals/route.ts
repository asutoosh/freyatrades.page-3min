import { NextRequest, NextResponse } from 'next/server'
import { getSignals, getSignalCount } from '@/lib/db/signals-store-db'
import { isDatabaseConfigured } from '@/lib/db/mongodb'
import { getClientIP } from '@/lib/api-auth'
import { applyRateLimit } from '@/lib/rate-limiter'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Apply rate limiting (prevent scraping)
  const clientIP = getClientIP(req)
  const rateLimitError = applyRateLimit(clientIP, 'signals')
  if (rateLimitError) return rateLimitError

  try {
    const { searchParams } = new URL(req.url)
    
    // Pagination params
    const limit = Math.min(Number(searchParams.get('limit') || '100'), 200) // Max 200
    const skip = Number(searchParams.get('skip') || '0')
    
    const dbConfigured = isDatabaseConfigured()
    const signals = await getSignals(limit, skip)
    const totalCount = await getSignalCount()

    // Format timestamps as ISO strings for JSON
    const formattedSignals = signals.map(signal => ({
      ...signal,
      timestamp: signal.timestamp instanceof Date 
        ? signal.timestamp.toISOString() 
        : signal.timestamp,
    }))

    // Calculate if there are more signals to load
    const hasMore = skip + formattedSignals.length < totalCount

    return NextResponse.json({
      signals: formattedSignals,
      count: formattedSignals.length,
      totalCount,
      hasMore,
      skip,
      limit,
      lastUpdated: new Date().toISOString(),
      status: {
        databaseConnected: dbConfigured,
        hasSignals: formattedSignals.length > 0,
      }
    })
  } catch (error) {
    return NextResponse.json({
      signals: [],
      count: 0,
      totalCount: 0,
      hasMore: false,
      skip: 0,
      limit: 100,
      lastUpdated: new Date().toISOString(),
      error: 'Failed to fetch signals from database',
      status: {
        databaseConnected: false,
        hasSignals: false,
      }
    }, { status: 500 })
  }
}
