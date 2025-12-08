/**
 * Signals Store - Azure Cosmos DB Implementation
 * Stores trading signals from Telegram bot
 * 
 * NO DUMMY/SAMPLE SIGNALS - only real signals from the bot
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

// In-memory fallback (no sample data)
const memoryStore: StoredSignal[] = []
const MAX_MEMORY_SIGNALS = 100

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
 * Get signals (newest first) with pagination
 * Returns empty array if no real signals exist
 * 
 * Note: Cosmos DB requires indexes for sorting, so we fetch and sort in JS
 */
export async function getSignals(limit: number = 100, skip: number = 0): Promise<StoredSignal[]> {
  if (!isDatabaseConfigured()) {
    // Return memory store (empty if no signals ingested)
    const sorted = [...memoryStore].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.timestamp || 0)
      const dateB = new Date(b.createdAt || b.timestamp || 0)
      return dateB.getTime() - dateA.getTime()
    })
    return sorted.slice(skip, skip + limit)
  }

  try {
    const collection = await getCollection(COLLECTIONS.SIGNALS)
    
    // Fetch all signals (no sort in DB - Cosmos DB needs indexes)
    const allSignals = await collection.find({}).toArray()
    
    console.log(`[Signals] Fetched ${allSignals.length} total signals from DB`)
    
    if (allSignals.length === 0) {
      console.log('[Signals] No signals found in database')
      return []
    }
    
    // Sort by createdAt descending (newest first) in JavaScript
    const sorted = allSignals.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || a.timestamp || 0)
      const dateB = new Date(b.createdAt || b.timestamp || 0)
      return dateB.getTime() - dateA.getTime()
    })
    
    // Apply pagination
    const paginated = sorted.slice(skip, skip + limit)
    
    console.log(`[Signals] Returning ${paginated.length} signals (skip=${skip}, limit=${limit})`)
    
    // Return as StoredSignal type - convert timestamp strings to Date
    return paginated.map((s: any) => ({
      ...s,
      timestamp: new Date(s.timestamp || s.createdAt),
      createdAt: new Date(s.createdAt || s.timestamp),
    })) as StoredSignal[]
  } catch (error) {
    console.error('Error getting signals from database:', error)
    // Fallback to memory (may be empty)
    return memoryStore.slice(skip, skip + limit)
  }
}

/**
 * Get total signal count
 */
export async function getSignalCount(): Promise<number> {
  if (!isDatabaseConfigured()) {
    return memoryStore.length
  }

  try {
    const collection = await getCollection<StoredSignal>(COLLECTIONS.SIGNALS)
    return await collection.countDocuments()
  } catch (error) {
    console.error('Error getting signal count:', error)
    return memoryStore.length
  }
}

/**
 * Get signals by script
 */
export async function getSignalsByScript(
  script: string,
  limit: number = 10
): Promise<StoredSignal[]> {
  if (!isDatabaseConfigured()) {
    return memoryStore
      .filter(s => s.script.toUpperCase() === script.toUpperCase())
      .slice(0, limit)
  }

  try {
    const collection = await getCollection<StoredSignal>(COLLECTIONS.SIGNALS)
    const signals = await collection
      .find({ script: script.toUpperCase() })
      .toArray()
    
    // Sort in JS (Cosmos DB needs indexes for sort)
    return signals
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, limit)
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
  if (!isDatabaseConfigured()) {
    return memoryStore.filter(s => s.type === 'signal').slice(0, limit)
  }

  try {
    const collection = await getCollection<StoredSignal>(COLLECTIONS.SIGNALS)
    const signals = await collection
      .find({ type: 'signal' })
      .toArray()
    
    // Sort in JS (Cosmos DB needs indexes for sort)
    return signals
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, limit)
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

  if (isDatabaseConfigured()) {
    try {
      const collection = await getCollection<StoredSignal>(COLLECTIONS.SIGNALS)
      await collection.deleteMany({})
    } catch (error) {
      console.error('Error clearing signals:', error)
    }
  }
}
