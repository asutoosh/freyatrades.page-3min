import { NextRequest, NextResponse } from 'next/server'
import { getIPStats } from '@/lib/db/ip-store-db'
import { getSignalStats } from '@/lib/db/signals-store-db'
import { isDatabaseConfigured } from '@/lib/db/mongodb'
import { requireAdminAuth, getClientIP } from '@/lib/api-auth'
import { applyRateLimit } from '@/lib/rate-limiter'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/stats
 * Returns statistics about IP access and signals
 */
export async function GET(req: NextRequest) {
  // Apply rate limiting
  const clientIP = getClientIP(req)
  const rateLimitError = applyRateLimit(clientIP, 'admin')
  if (rateLimitError) return rateLimitError

  // Check API key using secure comparison
  const authError = requireAdminAuth(req)
  if (authError) return authError

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

