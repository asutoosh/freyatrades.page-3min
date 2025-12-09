import { NextRequest, NextResponse } from 'next/server'
import { parseTelegramMessage, formatSignalForDisplay } from '@/lib/telegram-parser'
import { addSignal } from '@/lib/db/signals-store-db'
import { requireIngestAuth, getClientIP } from '@/lib/api-auth'
import { applyRateLimit } from '@/lib/rate-limiter'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Maximum message length to prevent abuse
const MAX_MESSAGE_LENGTH = 5000

/**
 * POST /api/signals/ingest
 * Receives raw Telegram messages, parses them, and stores valid signals
 */
export async function POST(req: NextRequest) {
  // Apply rate limiting
  const clientIP = getClientIP(req)
  const rateLimitError = applyRateLimit(clientIP, 'ingest')
  if (rateLimitError) return rateLimitError

  // Check API key using secure comparison
  const authError = requireIngestAuth(req)
  if (authError) return authError

  try {
    const body = await req.json()
    const { message, sourceMessageId } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid message field' },
        { status: 400 }
      )
    }

    // Validate message length to prevent abuse
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` },
        { status: 400 }
      )
    }

    // Sanitize sourceMessageId if provided
    let sanitizedSourceMessageId = sourceMessageId
    if (sourceMessageId !== undefined) {
      if (typeof sourceMessageId !== 'string' && typeof sourceMessageId !== 'number') {
        sanitizedSourceMessageId = undefined
      } else if (typeof sourceMessageId === 'string' && sourceMessageId.length > 100) {
        sanitizedSourceMessageId = sourceMessageId.substring(0, 100)
      }
    }

    // Parse the message
    const parsed = parseTelegramMessage(message)

    if (!parsed) {
      // Message was filtered out (doesn't match expected format)
      return NextResponse.json({
        status: 'ignored',
        reason: 'Message does not match signal format',
      })
    }

    // Format for storage
    const formatted = formatSignalForDisplay(parsed)

    // Store the signal in database
    await addSignal({
      ...formatted,
      timestamp: new Date(formatted.timestamp),
      sourceMessageId: sanitizedSourceMessageId,
    })

    return NextResponse.json({
      status: 'success',
      signal: formatted,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/signals/ingest
 * Health check endpoint (requires authentication)
 */
export async function GET(req: NextRequest) {
  // Apply rate limiting
  const clientIP = getClientIP(req)
  const rateLimitError = applyRateLimit(clientIP, 'ingest')
  if (rateLimitError) return rateLimitError

  // Require authentication for documentation endpoint
  const authError = requireIngestAuth(req)
  if (authError) return authError

  return NextResponse.json({
    status: 'ok',
    endpoint: 'Signal Ingest API',
    usage: 'POST with { message: "telegram message text" }',
    auth: 'Bearer token required (INGEST_API_KEY)',
  })
}
