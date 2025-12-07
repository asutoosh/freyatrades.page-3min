import { NextResponse } from 'next/server'
import { isDatabaseConfigured } from '@/lib/db/mongodb'

/**
 * Health check endpoint
 * GET /api/health
 */
export async function GET() {
  const dbConfigured = isDatabaseConfigured()
  const envVars = {
    hasCosmosConnection: !!(
      process.env.AZURE_COSMOS_CONNECTION_STRING || 
      process.env.AZURE_COSMOS_CONNECTIONSTRING
    ),
    hasCosmosDbName: !!process.env.AZURE_COSMOS_DB_NAME,
    hasIp2Location: !!process.env.IP2LOCATION_API_KEY,
    hasIngestKey: !!process.env.INGEST_API_KEY,
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
    },
  })
}

