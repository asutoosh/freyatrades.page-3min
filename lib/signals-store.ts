/**
 * In-memory signals store
 * In production, replace with database (Supabase, Redis, etc.)
 */

export interface StoredSignal {
  id: string
  type: 'signal' | 'update'
  script: string
  position?: 'BUY' | 'SELL'
  entryPrice?: string
  tp1?: string
  tp2?: string
  tp3?: string
  tp4?: string
  stopLoss?: string
  // For updates (TP/SL)
  updateType?: 'tp' | 'sl'
  tpLevel?: number
  hitPrice?: string
  signalDirection?: 'Long' | 'Short'
  timestamp: string
  color: 'green' | 'red' | 'default'
}

// Global in-memory store
const signalsStore: StoredSignal[] = []

// Maximum signals to keep (to prevent memory overflow)
const MAX_SIGNALS = 100

/**
 * Add a new signal to the store
 */
export function addSignal(signal: StoredSignal): void {
  // Add to beginning (newest first)
  signalsStore.unshift(signal)
  
  // Trim if exceeds max
  if (signalsStore.length > MAX_SIGNALS) {
    signalsStore.pop()
  }
}

/**
 * Get all signals (newest first)
 */
export function getSignals(limit: number = 20): StoredSignal[] {
  return signalsStore.slice(0, limit)
}

/**
 * Get signals by script (e.g., all XAUUSD signals)
 */
export function getSignalsByScript(script: string, limit: number = 10): StoredSignal[] {
  return signalsStore
    .filter(s => s.script.toUpperCase() === script.toUpperCase())
    .slice(0, limit)
}

/**
 * Get only new signals (not updates)
 */
export function getNewSignalsOnly(limit: number = 10): StoredSignal[] {
  return signalsStore
    .filter(s => s.type === 'signal')
    .slice(0, limit)
}

/**
 * Clear all signals (for testing)
 */
export function clearSignals(): void {
  signalsStore.length = 0
}

/**
 * Get signal count
 */
export function getSignalCount(): number {
  return signalsStore.length
}

/**
 * Initialize with sample data (for demo/testing)
 */
export function initializeSampleSignals(): void {
  const sampleSignals: StoredSignal[] = [
    {
      id: 'sample_1',
      type: 'signal',
      script: 'USOUSD',
      position: 'BUY',
      entryPrice: '60.244',
      tp1: '60.490',
      tp2: '60.653',
      tp3: '60.899',
      tp4: '61.227',
      stopLoss: '59.835',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      color: 'default',
    },
    {
      id: 'sample_2',
      type: 'signal',
      script: 'DJ30',
      position: 'BUY',
      entryPrice: '48058.68',
      tp1: '48174.43',
      tp2: '48251.60',
      tp3: '48367.35',
      tp4: '48521.69',
      stopLoss: '47965.76',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      color: 'default',
    },
    {
      id: 'sample_3',
      type: 'update',
      script: 'DJ30',
      updateType: 'tp',
      tpLevel: 4,
      hitPrice: '48133.32',
      signalDirection: 'Long',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      color: 'green',
    },
    {
      id: 'sample_4',
      type: 'signal',
      script: 'BTCUSD',
      position: 'BUY',
      entryPrice: '90827.56',
      tp1: '91528.57',
      tp2: '91995.90',
      tp3: '92696.91',
      tp4: '93631.58',
      stopLoss: '89659.22',
      timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      color: 'default',
    },
    {
      id: 'sample_5',
      type: 'signal',
      script: 'XAUUSD',
      position: 'SELL',
      entryPrice: '4236.36',
      tp1: '4228.70',
      tp2: '4223.59',
      tp3: '4215.93',
      tp4: '4205.72',
      stopLoss: '4249.13',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      color: 'default',
    },
    {
      id: 'sample_6',
      type: 'update',
      script: 'XAUUSD',
      updateType: 'sl',
      hitPrice: '4249.13',
      signalDirection: 'Long',
      timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      color: 'red',
    },
    {
      id: 'sample_7',
      type: 'update',
      script: 'NAS100',
      updateType: 'tp',
      tpLevel: 3,
      hitPrice: '25822.02',
      signalDirection: 'Long',
      timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
      color: 'green',
    },
  ]

  // Only initialize if store is empty
  if (signalsStore.length === 0) {
    sampleSignals.forEach(signal => signalsStore.push(signal))
  }
}

// Auto-initialize with sample data
initializeSampleSignals()

