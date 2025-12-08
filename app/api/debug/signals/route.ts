import { NextResponse } from 'next/server'
import { getCollection, isDatabaseConfigured, COLLECTIONS } from '@/lib/db/mongodb'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Debug endpoint - shows raw signals from database
 * GET /api/debug/signals
 */
export async function GET() {
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
    
    // Raw find without any transforms
    const rawSignals = await collection.find({}).limit(10).toArray()
    
    // Find with sort
    const sortedSignals = await collection.find({}).sort({ timestamp: -1 }).limit(10).toArray()
    
    // Find with explicit projection
    const projectedSignals = await collection.find({}, { 
      projection: { id: 1, script: 1, type: 1, timestamp: 1, color: 1 } 
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

