/**
 * Signals Store - Azure Cosmos DB Implementation
 * Stores trading signals from Telegram bot
 */

import { getCollection, isDatabaseConfigured, COLLECTIONS } from './mongodb'
import { ObjectId } from 'mongodb'

// Signal interface
export interface StoredSignal {
  _id?: ObjectId
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
  updateType?: 'tp' | 'sl'
  tpLevel?: number
  hitPrice?: string
  signalDirection?: 'Long' | 'Short'
  timestamp: Date
  color: 'green' | 'red' | 'default'
  // Metadata
  sourceMessageId?: string
  createdAt: Date
}

// In-memory fallback
const memoryStore: StoredSignal[] = []
const MAX_MEMORY_SIGNALS = 100

// Initialize with sample data
let initialized = false

/**
 * Initialize sample signals (for demo)
 */
async function initializeSampleSignals(): Promise<void> {
  if (initialized) return
  initialized = true

  const sampleSignals: Omit<StoredSignal, '_id' | 'createdAt'>[] = [
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
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
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
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
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
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
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
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
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
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      color: 'default',
    },
    {
      id: 'sample_6',
      type: 'update',
      script: 'XAUUSD',
      updateType: 'sl',
      hitPrice: '4249.13',
      signalDirection: 'Long',
      timestamp: new Date(Date.now() - 1000 * 60 * 2),
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
      timestamp: new Date(Date.now() - 1000 * 60 * 1),
      color: 'green',
    },
  ]

  // Add to memory store
  if (memoryStore.length === 0) {
    sampleSignals.forEach(signal => {
      memoryStore.push({
        ...signal,
        createdAt: signal.timestamp,
      })
    })
  }

  // Add to database if configured and empty
  if (isDatabaseConfigured()) {
    try {
      const collection = await getCollection<StoredSignal>(COLLECTIONS.SIGNALS)
      const count = await collection.countDocuments()
      if (count === 0) {
        await collection.insertMany(
          sampleSignals.map(s => ({ ...s, createdAt: s.timestamp })) as any[]
        )
        console.log('📊 Initialized sample signals in database')
      }
    } catch (error) {
      console.error('Error initializing sample signals:', error)
    }
  }
}

/**
 * Add a new signal
 */
export async function addSignal(signal: Omit<StoredSignal, '_id' | 'createdAt'>): Promise<void> {
  const signalWithDate: StoredSignal = {
    ...signal,
    timestamp: signal.timestamp instanceof Date ? signal.timestamp : new Date(signal.timestamp),
    createdAt: new Date(),
  }

  // Add to memory (always, as backup)
  memoryStore.unshift(signalWithDate)
  if (memoryStore.length > MAX_MEMORY_SIGNALS) {
    memoryStore.pop()
  }

  // Add to database
  if (isDatabaseConfigured()) {
    try {
      const collection = await getCollection<StoredSignal>(COLLECTIONS.SIGNALS)
      await collection.insertOne(signalWithDate as any)
    } catch (error) {
      console.error('Error adding signal to database:', error)
    }
  }
}

/**
 * Get signals (newest first)
 */
export async function getSignals(limit: number = 30): Promise<StoredSignal[]> {
  await initializeSampleSignals()

  if (!isDatabaseConfigured()) {
    return memoryStore.slice(0, limit).map(s => ({
      ...s,
      timestamp: s.timestamp instanceof Date ? s.timestamp : new Date(s.timestamp),
    }))
  }

  try {
    const collection = await getCollection<StoredSignal>(COLLECTIONS.SIGNALS)
    const signals = await collection
      .find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray()
    
    return signals.map(s => ({
      ...s,
      timestamp: s.timestamp instanceof Date ? s.timestamp : new Date(s.timestamp),
    }))
  } catch (error) {
    console.error('Error getting signals from database:', error)
    // Fallback to memory
    return memoryStore.slice(0, limit)
  }
}

/**
 * Get signals by script
 */
export async function getSignalsByScript(
  script: string,
  limit: number = 10
): Promise<StoredSignal[]> {
  await initializeSampleSignals()

  if (!isDatabaseConfigured()) {
    return memoryStore
      .filter(s => s.script.toUpperCase() === script.toUpperCase())
      .slice(0, limit)
  }

  try {
    const collection = await getCollection<StoredSignal>(COLLECTIONS.SIGNALS)
    return await collection
      .find({ script: script.toUpperCase() })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray()
  } catch (error) {
    console.error('Error getting signals by script:', error)
    return memoryStore
      .filter(s => s.script.toUpperCase() === script.toUpperCase())
      .slice(0, limit)
  }
}

/**
 * Get only new signals (not updates)
 */
export async function getNewSignalsOnly(limit: number = 10): Promise<StoredSignal[]> {
  await initializeSampleSignals()

  if (!isDatabaseConfigured()) {
    return memoryStore.filter(s => s.type === 'signal').slice(0, limit)
  }

  try {
    const collection = await getCollection<StoredSignal>(COLLECTIONS.SIGNALS)
    return await collection
      .find({ type: 'signal' })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray()
  } catch (error) {
    console.error('Error getting new signals:', error)
    return memoryStore.filter(s => s.type === 'signal').slice(0, limit)
  }
}

/**
 * Get signal statistics
 */
export async function getSignalStats(): Promise<{
  totalSignals: number
  newSignals: number
  tpUpdates: number
  slUpdates: number
  byScript: Record<string, number>
}> {
  await initializeSampleSignals()

  if (!isDatabaseConfigured()) {
    const byScript: Record<string, number> = {}
    memoryStore.forEach(s => {
      byScript[s.script] = (byScript[s.script] || 0) + 1
    })
    return {
      totalSignals: memoryStore.length,
      newSignals: memoryStore.filter(s => s.type === 'signal').length,
      tpUpdates: memoryStore.filter(s => s.updateType === 'tp').length,
      slUpdates: memoryStore.filter(s => s.updateType === 'sl').length,
      byScript,
    }
  }

  try {
    const collection = await getCollection<StoredSignal>(COLLECTIONS.SIGNALS)
    const [total, newSigs, tps, sls, scriptAgg] = await Promise.all([
      collection.countDocuments(),
      collection.countDocuments({ type: 'signal' }),
      collection.countDocuments({ updateType: 'tp' }),
      collection.countDocuments({ updateType: 'sl' }),
      collection.aggregate([
        { $group: { _id: '$script', count: { $sum: 1 } } }
      ]).toArray(),
    ])

    const byScript: Record<string, number> = {}
    scriptAgg.forEach((item: any) => {
      byScript[item._id] = item.count
    })

    return {
      totalSignals: total,
      newSignals: newSigs,
      tpUpdates: tps,
      slUpdates: sls,
      byScript,
    }
  } catch (error) {
    console.error('Error getting signal stats:', error)
    return {
      totalSignals: 0,
      newSignals: 0,
      tpUpdates: 0,
      slUpdates: 0,
      byScript: {},
    }
  }
}

/**
 * Delete old signals (cleanup)
 */
export async function deleteOldSignals(daysToKeep: number = 7): Promise<number> {
  const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)

  if (!isDatabaseConfigured()) {
    const initialLength = memoryStore.length
    const filtered = memoryStore.filter(s => s.timestamp >= cutoff)
    memoryStore.length = 0
    filtered.forEach(s => memoryStore.push(s))
    return initialLength - memoryStore.length
  }

  try {
    const collection = await getCollection<StoredSignal>(COLLECTIONS.SIGNALS)
    const result = await collection.deleteMany({
      timestamp: { $lt: cutoff }
    })
    return result.deletedCount
  } catch (error) {
    console.error('Error deleting old signals:', error)
    return 0
  }
}

/**
 * Clear all signals (for testing)
 */
export async function clearSignals(): Promise<void> {
  memoryStore.length = 0
  initialized = false

  if (isDatabaseConfigured()) {
    try {
      const collection = await getCollection<StoredSignal>(COLLECTIONS.SIGNALS)
      await collection.deleteMany({})
    } catch (error) {
      console.error('Error clearing signals:', error)
    }
  }
}

