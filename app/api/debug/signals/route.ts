import { NextRequest, NextResponse } from 'next/server'
import { getCollection, isDatabaseConfigured, COLLECTIONS } from '@/lib/db/mongodb'
import { requireDebugEnabled, getClientIP } from '@/lib/api-auth'
import { applyRateLimit } from '@/lib/rate-limiter'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Debug endpoint - shows raw signals from database
 * GET /api/debug/signals
 * 
 * SECURITY: Only available when DEBUG_ENDPOINTS_ENABLED=true
 */
export async function GET(req: NextRequest) {
  // Check if debug endpoints are enabled
  const debugError = requireDebugEnabled()
  if (debugError) return debugError

  // Apply rate limiting
  const clientIP = getClientIP(req)
  const rateLimitError = applyRateLimit(clientIP, 'admin')
  if (rateLimitError) return rateLimitError

  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        error: 'Database not configured',
        dbConfigured: false
      })
    }

    const collection = await getCollection(COLLECTIONS.SIGNALS)
    
    // Try different queries to debug
    const countResult = await collection.countDocuments()
    
    // Raw find without any transforms (no sort - Cosmos DB needs indexes for that)
    const rawSignals = await collection.find({}).limit(20).toArray()
    
    // Sort in JavaScript instead (Cosmos DB doesn't have index for timestamp)
    const sortedSignals = [...rawSignals].sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || a.timestamp || 0)
      const dateB = new Date(b.createdAt || b.timestamp || 0)
      return dateB.getTime() - dateA.getTime()
    }).slice(0, 10)
    
    // Find with explicit projection
    const projectedSignals = await collection.find({}, { 
      projection: { id: 1, script: 1, type: 1, timestamp: 1, color: 1, createdAt: 1 } 
    }).limit(10).toArray()

    return NextResponse.json({
      dbConfigured: true,
      collectionName: COLLECTIONS.SIGNALS,
      countDocuments: countResult,
      rawSignals: {
        count: rawSignals.length,
        data: rawSignals.slice(0, 3), // First 3 only
        firstTimestamp: rawSignals[0]?.timestamp,
        timestampType: rawSignals[0]?.timestamp ? typeof rawSignals[0].timestamp : 'none'
      },
      sortedSignals: {
        count: sortedSignals.length,
        data: sortedSignals.slice(0, 3)
      },
      projectedSignals: {
        count: projectedSignals.length,
        data: projectedSignals
      }
    })
  } catch (error: any) {
    console.error('Debug signals error:', error)
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

