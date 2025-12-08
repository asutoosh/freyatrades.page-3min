import { NextRequest, NextResponse } from 'next/server'
import { deleteIPRecord, getIPRecord } from '@/lib/db/ip-store-db'

// Admin API key for authentication
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || process.env.INGEST_API_KEY || 'admin-secret-key'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/clear-ip
 * Clears an IP address from the database to allow testing
 * 
 * Body: { "ip": "YOUR_IP_ADDRESS" }
 * Headers: Authorization: Bearer YOUR_ADMIN_API_KEY
 */
export async function POST(req: NextRequest) {
  // Check API key
  const authHeader = req.headers.get('authorization')
  const apiKey = authHeader?.replace('Bearer ', '')
  
  if (apiKey !== ADMIN_API_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized - provide valid API key in Authorization header' },
      { status: 401 }
    )
  }

  try {
    const body = await req.json()
    const { ip } = body

    if (!ip || typeof ip !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "ip" field in request body' },
        { status: 400 }
      )
    }

    // Get current record first (for logging)
    const existingRecord = await getIPRecord(ip)
    
    // Delete the record
    const deleted = await deleteIPRecord(ip)

    return NextResponse.json({
      success: deleted,
      ip,
      message: deleted 
        ? `IP record cleared successfully` 
        : `No record found for IP: ${ip}`,
      previousRecord: existingRecord ? {
        previewUsed: existingRecord.previewUsed,
        timeConsumed: existingRecord.timeConsumed,
        cookieSaved: existingRecord.cookieSaved,
        firstSeen: existingRecord.firstSeen,
        lastSeen: existingRecord.lastSeen,
      } : null,
    })
  } catch (error: any) {
    console.error('[Admin] Error clearing IP:', error)
    return NextResponse.json(
      { error: 'Failed to clear IP record', details: error?.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/clear-ip
 * Shows usage instructions
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/admin/clear-ip',
    method: 'POST',
    description: 'Clears an IP address record from the database to allow testing',
    usage: {
      headers: {
        'Authorization': 'Bearer YOUR_ADMIN_API_KEY',
        'Content-Type': 'application/json',
      },
      body: {
        ip: 'IP_ADDRESS_TO_CLEAR',
      },
    },
    example: 'curl -X POST https://your-domain/api/admin/clear-ip -H "Authorization: Bearer YOUR_KEY" -H "Content-Type: application/json" -d \'{"ip":"1.2.3.4"}\'',
  })
}

