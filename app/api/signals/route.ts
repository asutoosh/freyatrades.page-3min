import { NextResponse } from 'next/server'
import { getSignals } from '@/lib/db/signals-store-db'

export async function GET() {
  try {
    const signals = await getSignals(30)

    // Format timestamps as ISO strings for JSON
    const formattedSignals = signals.map(signal => ({
      ...signal,
      timestamp: signal.timestamp instanceof Date 
        ? signal.timestamp.toISOString() 
        : signal.timestamp,
    }))

    return NextResponse.json({
      signals: formattedSignals,
      count: formattedSignals.length,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching signals:', error)
    return NextResponse.json({
      signals: [],
      count: 0,
      lastUpdated: new Date().toISOString(),
      error: 'Failed to fetch signals',
    })
  }
}
