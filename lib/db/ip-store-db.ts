/**
 * IP Access Store - Azure Cosmos DB Implementation
 * Tracks IP addresses for preview access control
 */

import { getCollection, isDatabaseConfigured, COLLECTIONS } from './mongodb'
import { ObjectId, WithId, Document } from 'mongodb'

// IP Record interface
export interface IPRecord {
  _id?: ObjectId
  ip: string
  previewUsed: boolean
  vpnAttempts: number
  vpnWindowEnd: Date | null
  firstSeen: Date
  lastSeen: Date
  userAgent?: string
  country?: string
}

// In-memory fallback when database is not configured
const memoryStore = new Map<string, IPRecord>()

/**
 * Get IP record from database
 */
export async function getIPRecord(ip: string): Promise<IPRecord | null> {
  // Fallback to memory if DB not configured
  if (!isDatabaseConfigured()) {
    return memoryStore.get(ip) || null
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    const record = await collection.findOne({ ip })
    return record as IPRecord | null
  } catch (error) {
    console.error('Error getting IP record:', error)
    // Fallback to memory
    return memoryStore.get(ip) || null
  }
}

/**
 * Create new IP record
 */
export async function createIPRecord(
  ip: string,
  metadata?: { userAgent?: string; country?: string }
): Promise<IPRecord> {
  const record: IPRecord = {
    ip,
    previewUsed: false,
    vpnAttempts: 0,
    vpnWindowEnd: null,
    firstSeen: new Date(),
    lastSeen: new Date(),
    userAgent: metadata?.userAgent,
    country: metadata?.country,
  }

  // Fallback to memory if DB not configured
  if (!isDatabaseConfigured()) {
    memoryStore.set(ip, record)
    return record
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    await collection.insertOne(record as any)
    return record
  } catch (error) {
    console.error('Error creating IP record:', error)
    // Fallback to memory
    memoryStore.set(ip, record)
    return record
  }
}

/**
 * Update IP record
 */
export async function updateIPRecord(
  ip: string,
  updates: Partial<IPRecord>
): Promise<IPRecord | null> {
  // Fallback to memory if DB not configured
  if (!isDatabaseConfigured()) {
    const existing = memoryStore.get(ip)
    if (!existing) return null
    const updated = { ...existing, ...updates, lastSeen: new Date() }
    memoryStore.set(ip, updated)
    return updated
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    const result = await collection.findOneAndUpdate(
      { ip },
      { 
        $set: { ...updates, lastSeen: new Date() }
      },
      { returnDocument: 'after' }
    )
    return result as IPRecord | null
  } catch (error) {
    console.error('Error updating IP record:', error)
    return null
  }
}

/**
 * Mark preview as used for IP
 */
export async function markPreviewUsed(ip: string): Promise<void> {
  // Fallback to memory if DB not configured
  if (!isDatabaseConfigured()) {
    const existing = memoryStore.get(ip)
    if (existing) {
      existing.previewUsed = true
      existing.lastSeen = new Date()
    } else {
      memoryStore.set(ip, {
        ip,
        previewUsed: true,
        vpnAttempts: 0,
        vpnWindowEnd: null,
        firstSeen: new Date(),
        lastSeen: new Date(),
      })
    }
    return
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    await collection.updateOne(
      { ip },
      {
        $set: { previewUsed: true, lastSeen: new Date() },
        $setOnInsert: {
          firstSeen: new Date(),
          vpnAttempts: 0,
          vpnWindowEnd: null,
        }
      },
      { upsert: true }
    )
  } catch (error) {
    console.error('Error marking preview used:', error)
    // Fallback to memory
    const existing = memoryStore.get(ip)
    if (existing) {
      existing.previewUsed = true
    }
  }
}

/**
 * Increment VPN attempts for IP
 */
export async function incrementVPNAttempts(
  ip: string,
  windowHours: number
): Promise<{ attempts: number; windowEnd: Date }> {
  const now = new Date()
  const windowMs = windowHours * 60 * 60 * 1000
  const newWindowEnd = new Date(now.getTime() + windowMs)

  // Fallback to memory if DB not configured
  if (!isDatabaseConfigured()) {
    let record = memoryStore.get(ip)
    
    if (!record) {
      record = {
        ip,
        previewUsed: false,
        vpnAttempts: 1,
        vpnWindowEnd: newWindowEnd,
        firstSeen: now,
        lastSeen: now,
      }
      memoryStore.set(ip, record)
    } else if (!record.vpnWindowEnd || record.vpnWindowEnd < now) {
      // Window expired, reset
      record.vpnAttempts = 1
      record.vpnWindowEnd = newWindowEnd
    } else {
      // Within window, increment
      record.vpnAttempts += 1
    }
    record.lastSeen = now
    
    return {
      attempts: record.vpnAttempts,
      windowEnd: record.vpnWindowEnd!,
    }
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    
    // First check if window has expired
    const existing = await collection.findOne({ ip })
    
    if (!existing || !existing.vpnWindowEnd || existing.vpnWindowEnd < now) {
      // Reset window
      await collection.updateOne(
        { ip },
        {
          $set: {
            vpnAttempts: 1,
            vpnWindowEnd: newWindowEnd,
            lastSeen: now,
          },
          $setOnInsert: {
            previewUsed: false,
            firstSeen: now,
          }
        },
        { upsert: true }
      )
      return { attempts: 1, windowEnd: newWindowEnd }
    } else {
      // Increment within window
      const result = await collection.findOneAndUpdate(
        { ip },
        {
          $inc: { vpnAttempts: 1 },
          $set: { lastSeen: now }
        },
        { returnDocument: 'after' }
      )
      return {
        attempts: result?.vpnAttempts || 1,
        windowEnd: existing.vpnWindowEnd,
      }
    }
  } catch (error) {
    console.error('Error incrementing VPN attempts:', error)
    return { attempts: 1, windowEnd: newWindowEnd }
  }
}

/**
 * Get statistics
 */
export async function getIPStats(): Promise<{
  totalIPs: number
  previewsUsed: number
  vpnBlocked: number
}> {
  if (!isDatabaseConfigured()) {
    const records = Array.from(memoryStore.values())
    return {
      totalIPs: records.length,
      previewsUsed: records.filter(r => r.previewUsed).length,
      vpnBlocked: records.filter(r => r.vpnAttempts > 0).length,
    }
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    const [total, previews, vpn] = await Promise.all([
      collection.countDocuments(),
      collection.countDocuments({ previewUsed: true }),
      collection.countDocuments({ vpnAttempts: { $gt: 0 } }),
    ])
    return {
      totalIPs: total,
      previewsUsed: previews,
      vpnBlocked: vpn,
    }
  } catch (error) {
    console.error('Error getting IP stats:', error)
    return { totalIPs: 0, previewsUsed: 0, vpnBlocked: 0 }
  }
}

/**
 * Clean up old records (run periodically)
 */
export async function cleanupOldRecords(maxAgeDays: number = 30): Promise<number> {
  if (!isDatabaseConfigured()) {
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
    let deleted = 0
    for (const [ip, record] of memoryStore.entries()) {
      if (record.lastSeen.getTime() < cutoff) {
        memoryStore.delete(ip)
        deleted++
      }
    }
    return deleted
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000)
    const result = await collection.deleteMany({
      lastSeen: { $lt: cutoff },
      previewUsed: false, // Don't delete records of users who used preview
    })
    return result.deletedCount
  } catch (error) {
    console.error('Error cleaning up old records:', error)
    return 0
  }
}

