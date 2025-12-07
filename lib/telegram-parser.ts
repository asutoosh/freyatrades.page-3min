/**
 * Telegram Message Parser
 * Filters and reformats messages from source channel
 */

export type SignalType = 'NEW_SIGNAL' | 'TAKE_PROFIT' | 'STOP_LOSS' | 'UNKNOWN'

export interface ParsedSignal {
  type: SignalType
  script: string
  position?: 'BUY' | 'SELL'
  entryPrice?: string
  tp1?: string
  tp2?: string
  tp3?: string
  tp4?: string
  stopLoss?: string
  // For TP/SL updates
  tpLevel?: number
  hitPrice?: string
  signalDirection?: 'Long' | 'Short'
  timestamp: string
  id: string
}

/**
 * Check if message is a new signal (script, position, entry, TPs, SL format)
 */
function isNewSignalMessage(text: string): boolean {
  const hasScript = /script\s*:\s*\w+/i.test(text)
  const hasPosition = /position\s*:\s*(BUY|SELL)/i.test(text)
  const hasEntryPrice = /enter\s*price\s*:\s*[\d.]+/i.test(text)
  const hasTakeProfit = /take\s*profit\s*1\s*:\s*[\d.]+/i.test(text)
  const hasStoploss = /stoploss\s*:\s*[\d.]+/i.test(text)
  
  return hasScript && hasPosition && hasEntryPrice && hasTakeProfit && hasStoploss
}

/**
 * Check if message is a Take Profit update
 */
function isTakeProfitMessage(text: string): boolean {
  return /take\s*profit\s*\d+\s*from\s*(long|short)\s*signal/i.test(text) &&
         /at\s*price\s*:\s*[\d.]+\s*in\s*\w+/i.test(text)
}

/**
 * Check if message is a Stop Loss hit
 */
function isStopLossMessage(text: string): boolean {
  return /hit\s*sl\s*from\s*(long|short)\s*signal/i.test(text) &&
         /price\s*:\s*[\d.]+\s*in\s*\w+/i.test(text)
}

/**
 * Parse a new signal message
 */
function parseNewSignal(text: string): Partial<ParsedSignal> {
  const scriptMatch = text.match(/script\s*:\s*(\w+)/i)
  const positionMatch = text.match(/position\s*:\s*(BUY|SELL)/i)
  const entryMatch = text.match(/enter\s*price\s*:\s*([\d.]+)/i)
  const tp1Match = text.match(/take\s*profit\s*1\s*:\s*([\d.]+)/i)
  const tp2Match = text.match(/take\s*profit\s*2\s*:\s*([\d.]+)/i)
  const tp3Match = text.match(/take\s*profit\s*3\s*:\s*([\d.]+)/i)
  const tp4Match = text.match(/take\s*profit\s*4\s*:\s*([\d.]+)/i)
  const slMatch = text.match(/stoploss\s*:\s*([\d.]+)/i)

  return {
    type: 'NEW_SIGNAL',
    script: scriptMatch?.[1]?.toUpperCase() || '',
    position: (positionMatch?.[1]?.toUpperCase() as 'BUY' | 'SELL') || undefined,
    entryPrice: entryMatch?.[1] || '',
    tp1: tp1Match?.[1] || '',
    tp2: tp2Match?.[1] || '',
    tp3: tp3Match?.[1] || '',
    tp4: tp4Match?.[1] || '',
    stopLoss: slMatch?.[1] || '',
  }
}

/**
 * Parse a Take Profit update message
 */
function parseTakeProfitMessage(text: string): Partial<ParsedSignal> {
  // Extract TP level: "Take Profit 3 From Long Signal"
  const tpMatch = text.match(/take\s*profit\s*(\d+)\s*from\s*(long|short)\s*signal/i)
  // Extract price and script: "at Price : 25822.02 in NAS100"
  const priceMatch = text.match(/(?:at\s*)?price\s*:\s*([\d.]+)\s*in\s*(\w+)/i)

  return {
    type: 'TAKE_PROFIT',
    tpLevel: tpMatch ? parseInt(tpMatch[1]) : undefined,
    signalDirection: tpMatch?.[2]?.toLowerCase() === 'long' ? 'Long' : 'Short',
    hitPrice: priceMatch?.[1] || '',
    script: priceMatch?.[2]?.toUpperCase() || '',
  }
}

/**
 * Parse a Stop Loss hit message
 */
function parseStopLossMessage(text: string): Partial<ParsedSignal> {
  // Extract direction: "Hit SL From Long Signal"
  const slMatch = text.match(/hit\s*sl\s*from\s*(long|short)\s*signal/i)
  // Extract price and script: "Price : 4249.13 in XAUUSD"
  const priceMatch = text.match(/price\s*:\s*([\d.]+)\s*in\s*(\w+)/i)

  return {
    type: 'STOP_LOSS',
    signalDirection: slMatch?.[1]?.toLowerCase() === 'long' ? 'Long' : 'Short',
    hitPrice: priceMatch?.[1] || '',
    script: priceMatch?.[2]?.toUpperCase() || '',
  }
}

/**
 * Generate unique ID for signal
 */
function generateId(): string {
  return `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Main parser function - filters and parses Telegram messages
 * Returns null if message should be ignored
 */
export function parseTelegramMessage(text: string): ParsedSignal | null {
  // Skip empty messages
  if (!text || text.trim().length === 0) {
    return null
  }

  // Clean the text - remove WAZIR headers and inquiry footers
  let cleanText = text
    .replace(/WAZIR\s*FOREX\s*ALERTS?,?\s*\[[\d\-\s:]+\]/gi, '')
    .replace(/WAZIR\s*FOREX\s*ALGO/gi, '')
    .replace(/any\s*inquiries?\s*dm\s*@\w+/gi, '')
    .trim()

  // Skip if nothing left after cleaning
  if (!cleanText || cleanText.length < 10) {
    return null
  }

  const timestamp = new Date().toISOString()
  const id = generateId()

  // Check message type and parse accordingly
  if (isNewSignalMessage(cleanText)) {
    const parsed = parseNewSignal(cleanText)
    return {
      ...parsed,
      type: 'NEW_SIGNAL',
      timestamp,
      id,
    } as ParsedSignal
  }

  if (isTakeProfitMessage(cleanText)) {
    const parsed = parseTakeProfitMessage(cleanText)
    return {
      ...parsed,
      type: 'TAKE_PROFIT',
      timestamp,
      id,
    } as ParsedSignal
  }

  if (isStopLossMessage(cleanText)) {
    const parsed = parseStopLossMessage(cleanText)
    return {
      ...parsed,
      type: 'STOP_LOSS',
      timestamp,
      id,
    } as ParsedSignal
  }

  // Message doesn't match any known format - ignore
  return null
}

/**
 * Format signal for display in Money-Glitch section
 */
export function formatSignalForDisplay(signal: ParsedSignal): {
  id: string
  type: 'signal' | 'update'
  script: string
  content: string
  position?: 'BUY' | 'SELL'
  entryPrice?: string
  tp1?: string
  tp2?: string
  tp3?: string
  tp4?: string
  stopLoss?: string
  updateType?: 'tp' | 'sl'
  tpLevel?: number
  hitPrice?: string
  signalDirection?: 'Long' | 'Short'
  timestamp: string
  color: 'green' | 'red' | 'default'
} {
  if (signal.type === 'NEW_SIGNAL') {
    return {
      id: signal.id,
      type: 'signal',
      script: signal.script,
      content: '',
      position: signal.position,
      entryPrice: signal.entryPrice,
      tp1: signal.tp1,
      tp2: signal.tp2,
      tp3: signal.tp3,
      tp4: signal.tp4,
      stopLoss: signal.stopLoss,
      timestamp: signal.timestamp,
      color: 'default',
    }
  }

  if (signal.type === 'TAKE_PROFIT') {
    return {
      id: signal.id,
      type: 'update',
      script: signal.script,
      content: `Take Profit ${signal.tpLevel} From ${signal.signalDirection} Signal at Price: ${signal.hitPrice} in ${signal.script}`,
      updateType: 'tp',
      tpLevel: signal.tpLevel,
      hitPrice: signal.hitPrice,
      signalDirection: signal.signalDirection,
      timestamp: signal.timestamp,
      color: 'green',
    }
  }

  // STOP_LOSS
  return {
    id: signal.id,
    type: 'update',
    script: signal.script,
    content: `Hit SL From ${signal.signalDirection} Signal at Price: ${signal.hitPrice} in ${signal.script}`,
    updateType: 'sl',
    hitPrice: signal.hitPrice,
    signalDirection: signal.signalDirection,
    timestamp: signal.timestamp,
    color: 'red',
  }
}

// Test function for development
export function testParser() {
  const testMessages = [
    // Should parse - new signal
    `WAZIR FOREX ALERTS, [05-12-2025 13:39]
WAZIR FOREX  ALGO
script          : TSLA
Position        : SELL
Enter Price     : 452.36
Take Profit 1   : 450.55
Take Profit 2   : 449.34
Take Profit 3   : 447.52
Take Profit 4   : 445.10
Stoploss        : 455.38
Any inquiries Dm @zubarekhan01`,

    // Should parse - TP update
    `Position Status
Take Profit 3 From Long Signal
at Price : 25822.02 in NAS100`,

    // Should parse - SL hit
    `Position Status
Hit SL From Long Signal
 Price : 4249.13 in XAUUSD`,

    // Should ignore - random message
    `Hello everyone!`,

    // Should ignore - just a link
    `https://example.com`,
  ]

  console.log('Testing parser...\n')
  testMessages.forEach((msg, i) => {
    const result = parseTelegramMessage(msg)
    console.log(`Message ${i + 1}:`, result ? 'PARSED' : 'IGNORED')
    if (result) {
      console.log('  Type:', result.type)
      console.log('  Script:', result.script)
      if (result.type === 'NEW_SIGNAL') {
        console.log('  Position:', result.position)
      }
    }
    console.log('')
  })
}

