import { NextRequest, NextResponse } from 'next/server'
import { getIPStats } from '@/lib/db/ip-store-db'
import { getSignalStats } from '@/lib/db/signals-store-db'
import { isDatabaseConfigured } from '@/lib/db/mongodb'

// Admin API key for authentication
const ADMIN_API_KEY = process.env.INGEST_API_KEY || 'your-secret-key'

/**
 * GET /api/admin/stats
 * Returns statistics about IP access and signals
 */
export async function GET(req: NextRequest) {
  // Check API key
  const authHeader = req.headers.get('authorization')
  const apiKey = authHeader?.replace('Bearer ', '')
  
  if (apiKey !== ADMIN_API_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const [ipStats, signalStats] = await Promise.all([
      getIPStats(),
      getSignalStats(),
    ])

    return NextResponse.json({
      database: {
        configured: isDatabaseConfigured(),
        type: isDatabaseConfigured() ? 'Azure Cosmos DB' : 'In-Memory',
      },
      ip: ipStats,
      signals: signalStats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error getting stats:', error)
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    )
  }
}

