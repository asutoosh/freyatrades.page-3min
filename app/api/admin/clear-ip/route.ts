import { NextRequest, NextResponse } from 'next/server'
import { deleteIPRecord, getIPRecord, clearFingerprint } from '@/lib/db/ip-store-db'
import { requireAdminAuth, isValidIP, getClientIP } from '@/lib/api-auth'
import { applyRateLimit } from '@/lib/rate-limiter'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/clear-ip
 * Clears an IP address and/or fingerprint from the database to allow testing
 * 
 * Body: { "ip": "YOUR_IP_ADDRESS", "fingerprint": "OPTIONAL_FINGERPRINT" }
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
    const { ip, fingerprint } = body

    if (!ip && !fingerprint) {
      return NextResponse.json(
        { error: 'Missing "ip" or "fingerprint" field in request body. At least one is required.' },
        { status: 400 }
      )
    }

    const results: any = {}

    // Clear IP record if provided
    if (ip) {
      if (typeof ip !== 'string') {
        return NextResponse.json(
          { error: 'Invalid "ip" field type' },
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

      // Get the record first to find associated fingerprint
      const record = await getIPRecord(ip)
      const associatedFingerprint = record?.fingerprint
      
      // Delete the IP record
      const deleted = await deleteIPRecord(ip)
      results.ip = {
        cleared: deleted,
        message: deleted ? `IP record cleared: ${ip}` : `No record found for IP: ${ip}`
      }
      
      // Also clear the associated fingerprint if exists
      if (associatedFingerprint && !fingerprint) {
        const fpResult = await clearFingerprint(associatedFingerprint)
        results.fingerprint = {
          cleared: fpResult.cleared,
          recordsUpdated: fpResult.recordsUpdated,
          message: `Also cleared associated fingerprint: ${associatedFingerprint.substring(0, 8)}...`
        }
      }
    }

    // Clear fingerprint if provided explicitly
    if (fingerprint) {
      if (typeof fingerprint !== 'string' || fingerprint.length < 8) {
        return NextResponse.json(
          { error: 'Invalid fingerprint (must be string with at least 8 characters)' },
          { status: 400 }
        )
      }

      const fpResult = await clearFingerprint(fingerprint)
      results.fingerprint = {
        cleared: fpResult.cleared,
        recordsUpdated: fpResult.recordsUpdated,
        message: fpResult.cleared 
          ? `Fingerprint cleared, ${fpResult.recordsUpdated} record(s) reset` 
          : `No records found with fingerprint: ${fingerprint.substring(0, 8)}...`
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: 'Records cleared for testing. User can now access the preview again.'
    })
  } catch (error: any) {
    console.error('[Admin] Error clearing records:', error)
    return NextResponse.json(
      { error: 'Failed to clear records', details: error?.message },
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
    description: 'Clears IP and/or fingerprint records from the database for testing',
    usage: {
      headers: {
        'Authorization': 'Bearer YOUR_ADMIN_API_KEY',
        'Content-Type': 'application/json',
      },
      body: {
        ip: 'IP_ADDRESS_TO_CLEAR (optional)',
        fingerprint: 'FINGERPRINT_TO_CLEAR (optional)',
      },
      notes: [
        'At least one of ip or fingerprint is required',
        'If ip is provided, its associated fingerprint is also cleared automatically',
        'If fingerprint is provided, all records with that fingerprint are reset'
      ]
    },
    examples: [
      'curl -X POST https://your-domain/api/admin/clear-ip -H "Authorization: Bearer YOUR_KEY" -H "Content-Type: application/json" -d \'{"ip":"1.2.3.4"}\'',
      'curl -X POST https://your-domain/api/admin/clear-ip -H "Authorization: Bearer YOUR_KEY" -H "Content-Type: application/json" -d \'{"fingerprint":"abc12345..."}\''
    ],
  })
}

