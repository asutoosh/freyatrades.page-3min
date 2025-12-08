import { NextRequest, NextResponse } from 'next/server'
import { deleteIPRecord } from '@/lib/db/ip-store-db'
import { requireAdminAuth, isValidIP, getClientIP } from '@/lib/api-auth'
import { applyRateLimit } from '@/lib/rate-limiter'

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
  // Apply rate limiting
  const clientIP = getClientIP(req)
  const rateLimitError = applyRateLimit(clientIP, 'admin')
  if (rateLimitError) return rateLimitError

  // Check API key using secure comparison
  const authError = requireAdminAuth(req)
  if (authError) return authError

  try {
    const body = await req.json()
    const { ip } = body

    if (!ip || typeof ip !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "ip" field in request body' },
        { status: 400 }
      )
    }

    // Validate IP format to prevent injection attacks
    if (!isValidIP(ip) && ip !== '127.0.0.1' && ip !== '::1') {
      return NextResponse.json(
        { error: 'Invalid IP address format' },
        { status: 400 }
      )
    }

    // Delete the record (don't expose previous record data for security)
    const deleted = await deleteIPRecord(ip)

    return NextResponse.json({
      success: deleted,
      ip,
      message: deleted 
        ? `IP record cleared successfully` 
        : `No record found for IP: ${ip}`,
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
 * Shows usage instructions (requires authentication)
 */
export async function GET(req: NextRequest) {
  // Apply rate limiting
  const clientIP = getClientIP(req)
  const rateLimitError = applyRateLimit(clientIP, 'admin')
  if (rateLimitError) return rateLimitError

  // Require authentication for documentation endpoint
  const authError = requireAdminAuth(req)
  if (authError) return authError

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

