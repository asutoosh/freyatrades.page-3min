import { NextRequest, NextResponse } from 'next/server'
import { parseTelegramMessage, formatSignalForDisplay } from '@/lib/telegram-parser'
import { addSignal } from '@/lib/db/signals-store-db'

// Secret key for API authentication (set in env)
const INGEST_API_KEY = process.env.INGEST_API_KEY || 'your-secret-key'

/**
 * POST /api/signals/ingest
 * Receives raw Telegram messages, parses them, and stores valid signals
 */
export async function POST(req: NextRequest) {
  // Check API key
  const authHeader = req.headers.get('authorization')
  const apiKey = authHeader?.replace('Bearer ', '')
  
  if (apiKey !== INGEST_API_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await req.json()
    const { message, sourceMessageId } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid message field' },
        { status: 400 }
      )
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
      sourceMessageId,
    })

    return NextResponse.json({
      status: 'success',
      signal: formatted,
    })
  } catch (error) {
    console.error('Error ingesting signal:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/signals/ingest
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Signal Ingest API',
    usage: 'POST with { message: "telegram message text" }',
    auth: 'Bearer token required (INGEST_API_KEY)',
  })
}
