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
  fingerprint?: string // Browser fingerprint for device tracking
  fingerprintFirstSeen?: Date // When this fingerprint was first seen
  previewUsed: boolean
  timeConsumed: number // Total seconds consumed across all sessions
  previewStartedAt: Date | null // When current/last preview session started
  cookieSaved: boolean // Whether 30-second cookie was saved
  vpnAttempts: number
  vpnWindowEnd: Date | null
  firstSeen: Date
  lastSeen: Date
  userAgent?: string
  country?: string
}

// In-memory fallback when database is not configured
const memoryStore = new Map<string, IPRecord>()
const fingerprintStore = new Map<string, IPRecord>() // Maps fingerprint -> IPRecord

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
    timeConsumed: 0,
    previewStartedAt: null,
    cookieSaved: false,
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
      existing.timeConsumed = 180 // Full 3 minutes
      existing.lastSeen = new Date()
    } else {
      memoryStore.set(ip, {
        ip,
        previewUsed: true,
        timeConsumed: 180,
        previewStartedAt: null,
        cookieSaved: true,
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
        $set: { 
          previewUsed: true, 
          timeConsumed: 180,
          lastSeen: new Date() 
        },
        $setOnInsert: {
          firstSeen: new Date(),
          previewStartedAt: null,
          cookieSaved: true,
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
      existing.timeConsumed = 180
    }
  }
}

/**
 * Start a preview session - records when user starts viewing
 */
export async function startPreviewSession(ip: string): Promise<void> {
  const now = new Date()
  
  if (!isDatabaseConfigured()) {
    const existing = memoryStore.get(ip)
    if (existing) {
      existing.previewStartedAt = now
      existing.lastSeen = now
    }
    return
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    await collection.updateOne(
      { ip },
      {
        $set: { 
          previewStartedAt: now,
          lastSeen: now 
        }
      }
    )
  } catch (error) {
    console.error('Error starting preview session:', error)
  }
}

/**
 * Save at 30 seconds - marks cookie saved and updates time consumed
 * Called when user has watched for 30 seconds
 */
export async function saveAt30Seconds(ip: string, secondsWatched: number): Promise<{ success: boolean; shouldSetCookie: boolean }> {
  const now = new Date()
  
  if (!isDatabaseConfigured()) {
    const existing = memoryStore.get(ip)
    if (existing) {
      // Only save if not already saved
      if (!existing.cookieSaved) {
        existing.cookieSaved = true
        existing.timeConsumed = (existing.timeConsumed || 0) + secondsWatched
        existing.lastSeen = now
        return { success: true, shouldSetCookie: true }
      }
      // Already saved, just update time
      existing.timeConsumed = (existing.timeConsumed || 0) + secondsWatched
      existing.lastSeen = now
      return { success: true, shouldSetCookie: false }
    }
    return { success: false, shouldSetCookie: false }
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    
    // Check current state
    const record = await collection.findOne({ ip })
    const alreadySaved = record?.cookieSaved || false
    
    await collection.updateOne(
      { ip },
      {
        $set: { 
          cookieSaved: true,
          lastSeen: now 
        },
        $inc: {
          timeConsumed: secondsWatched
        }
      }
    )
    
    return { success: true, shouldSetCookie: !alreadySaved }
  } catch (error) {
    console.error('Error saving at 30 seconds:', error)
    return { success: false, shouldSetCookie: false }
  }
}

/**
 * Update time consumed for an IP
 */
export async function updateTimeConsumed(ip: string, additionalSeconds: number): Promise<void> {
  const now = new Date()
  
  if (!isDatabaseConfigured()) {
    const existing = memoryStore.get(ip)
    if (existing) {
      existing.timeConsumed = (existing.timeConsumed || 0) + additionalSeconds
      existing.lastSeen = now
    }
    return
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    await collection.updateOne(
      { ip },
      {
        $inc: { timeConsumed: additionalSeconds },
        $set: { lastSeen: now }
      }
    )
  } catch (error) {
    console.error('Error updating time consumed:', error)
  }
}

/**
 * Get time consumed for an IP
 */
export async function getTimeConsumed(ip: string): Promise<number> {
  if (!isDatabaseConfigured()) {
    const existing = memoryStore.get(ip)
    return existing?.timeConsumed || 0
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    const record = await collection.findOne({ ip })
    return record?.timeConsumed || 0
  } catch (error) {
    console.error('Error getting time consumed:', error)
    return 0
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
        timeConsumed: 0,
        previewStartedAt: null,
        cookieSaved: false,
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
            timeConsumed: 0,
            previewStartedAt: null,
            cookieSaved: false,
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
 * Delete a specific IP record (for admin/testing purposes)
 */
export async function deleteIPRecord(ip: string): Promise<boolean> {
  console.log(`[IP Store] Deleting IP record for: ${ip}`)
  
  if (!isDatabaseConfigured()) {
    const existed = memoryStore.has(ip)
    memoryStore.delete(ip)
    console.log(`[IP Store] Deleted from memory: ${existed}`)
    return existed
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    const result = await collection.deleteOne({ ip })
    console.log(`[IP Store] Deleted from database: ${result.deletedCount > 0}`)
    return result.deletedCount > 0
  } catch (error) {
    console.error('[IP Store] Error deleting IP record:', error)
    return false
  }
}

/**
 * Clear fingerprint from an IP record (for admin/testing)
 * Also removes the fingerprint from all other records that have it
 */
export async function clearFingerprint(fingerprint: string): Promise<{ cleared: boolean; recordsUpdated: number }> {
  if (!fingerprint) return { cleared: false, recordsUpdated: 0 }
  
  console.log(`[IP Store] Clearing fingerprint: ${fingerprint.substring(0, 8)}...`)
  
  if (!isDatabaseConfigured()) {
    // Remove from fingerprint store
    const existed = fingerprintStore.has(fingerprint)
    fingerprintStore.delete(fingerprint)
    
    // Clear fingerprint from all memory records
    let count = 0
    for (const record of memoryStore.values()) {
      if (record.fingerprint === fingerprint) {
        record.fingerprint = undefined
        record.fingerprintFirstSeen = undefined
        record.previewUsed = false
        record.timeConsumed = 0
        count++
      }
    }
    
    console.log(`[IP Store] Cleared fingerprint from memory: ${existed}, records reset: ${count}`)
    return { cleared: existed, recordsUpdated: count }
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    
    // Update all records with this fingerprint - reset their preview status
    const result = await collection.updateMany(
      { fingerprint },
      {
        $unset: { fingerprint: '', fingerprintFirstSeen: '' },
        $set: { 
          previewUsed: false, 
          timeConsumed: 0,
          lastSeen: new Date() 
        }
      }
    )
    
    console.log(`[IP Store] Cleared fingerprint from database, records updated: ${result.modifiedCount}`)
    return { cleared: result.modifiedCount > 0, recordsUpdated: result.modifiedCount }
  } catch (error) {
    console.error('[IP Store] Error clearing fingerprint:', error)
    return { cleared: false, recordsUpdated: 0 }
  }
}

/**
 * Get record by fingerprint - for detecting IP-switching attempts
 */
export async function getRecordByFingerprint(fingerprint: string): Promise<IPRecord | null> {
  if (!fingerprint) return null
  
  if (!isDatabaseConfigured()) {
    return fingerprintStore.get(fingerprint) || null
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    const record = await collection.findOne({ fingerprint })
    return record as IPRecord | null
  } catch (error) {
    console.error('Error getting record by fingerprint:', error)
    return fingerprintStore.get(fingerprint) || null
  }
}

/**
 * Save fingerprint to IP record - links device to IP record
 */
export async function saveFingerprint(ip: string, fingerprint: string): Promise<void> {
  if (!fingerprint) return
  
  const now = new Date()
  
  if (!isDatabaseConfigured()) {
    const existing = memoryStore.get(ip)
    if (existing) {
      // Only set fingerprint if not already set (first device wins)
      if (!existing.fingerprint) {
        existing.fingerprint = fingerprint
        existing.fingerprintFirstSeen = now
      }
      // Also update fingerprint store
      fingerprintStore.set(fingerprint, existing)
    }
    return
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    
    // Update record with fingerprint (only if not already set)
    await collection.updateOne(
      { ip, fingerprint: { $exists: false } },
      {
        $set: { 
          fingerprint,
          fingerprintFirstSeen: now,
          lastSeen: now 
        }
      }
    )
    
    // Also update if fingerprint field is empty string
    await collection.updateOne(
      { ip, fingerprint: '' },  
      {
        $set: { 
          fingerprint,
          fingerprintFirstSeen: now,
          lastSeen: now 
        }
      }
    )
  } catch (error) {
    console.error('Error saving fingerprint:', error)
  }
}

/**
 * Check if fingerprint has already used preview (across any IP)
 */
export async function isFingerprintUsed(fingerprint: string): Promise<{ used: boolean; timeConsumed: number }> {
  if (!fingerprint) return { used: false, timeConsumed: 0 }
  
  if (!isDatabaseConfigured()) {
    const record = fingerprintStore.get(fingerprint)
    if (record) {
      return { 
        used: record.previewUsed, 
        timeConsumed: record.timeConsumed || 0 
      }
    }
    return { used: false, timeConsumed: 0 }
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    const record = await collection.findOne({ fingerprint })
    
    if (record) {
      return { 
        used: record.previewUsed, 
        timeConsumed: record.timeConsumed || 0 
      }
    }
    return { used: false, timeConsumed: 0 }
  } catch (error) {
    console.error('Error checking fingerprint usage:', error)
    return { used: false, timeConsumed: 0 }
  }
}

/**
 * Mark preview used by fingerprint (blocks all IPs with same fingerprint)
 */
export async function markFingerprintUsed(fingerprint: string): Promise<void> {
  if (!fingerprint) return
  
  if (!isDatabaseConfigured()) {
    const record = fingerprintStore.get(fingerprint)
    if (record) {
      record.previewUsed = true
      record.timeConsumed = 180
      record.lastSeen = new Date()
    }
    return
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    await collection.updateMany(
      { fingerprint },
      {
        $set: { 
          previewUsed: true, 
          timeConsumed: 180,
          lastSeen: new Date() 
        }
      }
    )
  } catch (error) {
    console.error('Error marking fingerprint used:', error)
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

