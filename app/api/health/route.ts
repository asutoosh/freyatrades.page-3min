import { NextRequest, NextResponse } from 'next/server'
import { isDatabaseConfigured } from '@/lib/db/mongodb'
import { getClientIP, validateAdminKey } from '@/lib/api-auth'
import { applyRateLimit } from '@/lib/rate-limiter'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Health check endpoint
 * GET /api/health
 * 
 * Public: Returns minimal status
 * With Admin Auth: Returns detailed status
 */
export async function GET(req: NextRequest) {
  // Apply rate limiting
  const clientIP = getClientIP(req)
  const rateLimitError = applyRateLimit(clientIP, 'public')
  if (rateLimitError) return rateLimitError

  // Check if admin authentication provided for detailed info
  const isAdmin = validateAdminKey(req)
  // Public response - minimal information
  if (!isAdmin) {
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })
  }

  // Admin response - detailed information
  const dbConfigured = isDatabaseConfigured()
  const envVars = {
    hasCosmosConnection: !!(
      process.env.AZURE_COSMOS_CONNECTION_STRING || 
      process.env.AZURE_COSMOS_CONNECTIONSTRING
    ),
    hasCosmosDbName: !!process.env.AZURE_COSMOS_DB_NAME,
    hasIp2Location: !!process.env.IP2LOCATION_API_KEY,
    hasIngestKey: !!process.env.INGEST_API_KEY,
    hasAdminKey: !!process.env.ADMIN_API_KEY,
    debugEnabled: process.env.DEBUG_ENDPOINTS_ENABLED === 'true',
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED === 'true',
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: {
      configured: dbConfigured,
      connectionString: envVars.hasCosmosConnection ? '✅ Set' : '❌ Missing',
      dbName: envVars.hasCosmosDbName ? '✅ Set' : '❌ Missing',
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      ip2Location: envVars.hasIp2Location ? '✅ Set' : '❌ Missing',
      ingestKey: envVars.hasIngestKey ? '✅ Set' : '❌ Missing',
      adminKey: envVars.hasAdminKey ? '✅ Set' : '❌ Missing',
    },
    security: {
      debugEndpoints: envVars.debugEnabled ? '⚠️ Enabled' : '✅ Disabled',
      rateLimit: envVars.rateLimitEnabled ? '✅ Enabled' : '⚠️ Disabled',
    },
  })
}

