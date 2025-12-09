/**
 * IP Access Store - Azure Cosmos DB Implementation
 * Tracks IP addresses for preview access control
 * 
 * IMPORTANT: Uses absolute timestamps for accurate time tracking
 * - previewStartedAt: When the preview session first started (never changes once set)
 * - previewExpiresAt: When the preview expires (previewStartedAt + 180 seconds)
 * - This prevents double-counting and race conditions
 */

import { getCollection, isDatabaseConfigured, COLLECTIONS } from './mongodb'
import { ObjectId } from 'mongodb'

// Preview duration in seconds
const PREVIEW_DURATION_SECONDS = 180

// IP Record interface
export interface IPRecord {
  _id?: ObjectId
  ip: string
  fingerprint?: string // Browser fingerprint for device tracking
  fingerprintFirstSeen?: Date // When this fingerprint was first seen
  previewUsed: boolean
  // NEW: Absolute timestamp approach
  previewStartedAt: Date | null // When preview FIRST started (immutable once set)
  previewExpiresAt: Date | null // When preview expires (startedAt + 180s)
  sessionId?: string // Unique session ID to prevent duplicate saves
  // DEPRECATED: timeConsumed - kept for backward compatibility but not used for new logic
  timeConsumed: number // Legacy field - calculated from timestamps now
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
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Calculate time consumed from absolute timestamps
 */
export function calculateTimeConsumed(record: IPRecord | null): number {
  if (!record || !record.previewStartedAt) return 0
  
  const startTime = new Date(record.previewStartedAt).getTime()
  const now = Date.now()
  const elapsed = Math.floor((now - startTime) / 1000)
  
  // Cap at preview duration
  return Math.min(elapsed, PREVIEW_DURATION_SECONDS)
}

/**
 * Calculate remaining time from absolute timestamps
 */
export function calculateRemainingTime(record: IPRecord | null): number {
  if (!record || !record.previewExpiresAt) return PREVIEW_DURATION_SECONDS
  
  const expiresAt = new Date(record.previewExpiresAt).getTime()
  const now = Date.now()
  const remaining = Math.floor((expiresAt - now) / 1000)
  
  return Math.max(0, remaining)
}

/**
 * Check if preview has expired based on absolute timestamp
 */
export function isPreviewExpired(record: IPRecord | null): boolean {
  if (!record) return false
  if (record.previewUsed) return true
  if (!record.previewExpiresAt) return false
  
  return new Date(record.previewExpiresAt).getTime() <= Date.now()
}

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
    previewExpiresAt: null,
    sessionId: undefined,
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
    await collection.insertOne(record as IPRecord & { _id?: ObjectId })
    return record
  } catch (error) {
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
    return null
  }
}

/**
 * Mark preview as used for IP
 */
export async function markPreviewUsed(ip: string): Promise<void> {
  const now = new Date()
  
  // Fallback to memory if DB not configured
  if (!isDatabaseConfigured()) {
    const existing = memoryStore.get(ip)
    if (existing) {
      existing.previewUsed = true
      existing.timeConsumed = 180 // Full 3 minutes
      existing.lastSeen = now
    } else {
      memoryStore.set(ip, {
        ip,
        previewUsed: true,
        timeConsumed: 180,
        previewStartedAt: null,
        previewExpiresAt: null,
        sessionId: undefined,
        cookieSaved: true,
        vpnAttempts: 0,
        vpnWindowEnd: null,
        firstSeen: now,
        lastSeen: now,
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
          lastSeen: now 
        },
        $setOnInsert: {
          firstSeen: now,
          previewStartedAt: null,
          previewExpiresAt: null,
          cookieSaved: true,
          vpnAttempts: 0,
          vpnWindowEnd: null,
        }
      },
      { upsert: true }
    )
  } catch (error) {
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
 * IMPORTANT: Only sets previewStartedAt if not already set (immutable once started)
 * Returns the session info including expiry time
 */
export async function startPreviewSession(ip: string): Promise<{
  sessionId: string
  previewStartedAt: Date
  previewExpiresAt: Date
  isNewSession: boolean
}> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + PREVIEW_DURATION_SECONDS * 1000)
  const newSessionId = generateSessionId()
  
  if (!isDatabaseConfigured()) {
    const existing = memoryStore.get(ip)
    if (existing) {
      // Only set start time if not already set (preserve original start)
      if (!existing.previewStartedAt) {
        existing.previewStartedAt = now
        existing.previewExpiresAt = expiresAt
        existing.sessionId = newSessionId
        existing.lastSeen = now
        return {
          sessionId: newSessionId,
          previewStartedAt: now,
          previewExpiresAt: expiresAt,
          isNewSession: true
        }
      }
      // Return existing session info
      existing.lastSeen = now
      return {
        sessionId: existing.sessionId || newSessionId,
        previewStartedAt: existing.previewStartedAt,
        previewExpiresAt: existing.previewExpiresAt || expiresAt,
        isNewSession: false
      }
    }
    return {
      sessionId: newSessionId,
      previewStartedAt: now,
      previewExpiresAt: expiresAt,
      isNewSession: true
    }
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    
    // First check if session already exists
    const existing = await collection.findOne({ ip })
    
    if (existing?.previewStartedAt) {
      // Session already started - return existing times
      await collection.updateOne(
        { ip },
        { $set: { lastSeen: now } }
      )
      return {
        sessionId: existing.sessionId || newSessionId,
        previewStartedAt: new Date(existing.previewStartedAt),
        previewExpiresAt: existing.previewExpiresAt ? new Date(existing.previewExpiresAt) : expiresAt,
        isNewSession: false
      }
    }
    
    // New session - set start and expiry times
    await collection.updateOne(
      { ip },
      {
        $set: { 
          previewStartedAt: now,
          previewExpiresAt: expiresAt,
          sessionId: newSessionId,
          lastSeen: now 
        }
      }
    )
    
    return {
      sessionId: newSessionId,
      previewStartedAt: now,
      previewExpiresAt: expiresAt,
      isNewSession: true
    }
  } catch (error) {
    return {
      sessionId: newSessionId,
      previewStartedAt: now,
      previewExpiresAt: expiresAt,
      isNewSession: true
    }
  }
}

/**
 * Save at 30 seconds - marks cookie saved
 * NOTE: Server-side validates that at least 30 seconds have elapsed
 */
export async function saveAt30Seconds(ip: string): Promise<{ success: boolean; shouldSetCookie: boolean }> {
  const now = new Date()
  const MIN_ELAPSED_SECONDS = 25 // Allow 5 second tolerance for network latency
  
  if (!isDatabaseConfigured()) {
    const existing = memoryStore.get(ip)
    if (existing) {
      // Verify at least 25 seconds have elapsed (server-side validation)
      const elapsed = calculateTimeConsumed(existing)
      if (elapsed < MIN_ELAPSED_SECONDS) {
        return { success: false, shouldSetCookie: false }
      }
      
      // Only save if not already saved
      if (!existing.cookieSaved) {
        existing.cookieSaved = true
        existing.lastSeen = now
        existing.timeConsumed = elapsed
        return { success: true, shouldSetCookie: true }
      }
      // Already saved
      existing.lastSeen = now
      return { success: true, shouldSetCookie: false }
    }
    return { success: false, shouldSetCookie: false }
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    
    // Check current state
    const record = await collection.findOne({ ip })
    
    // Server-side validation: verify at least 25 seconds have elapsed
    const timeConsumed = calculateTimeConsumed(record)
    if (timeConsumed < MIN_ELAPSED_SECONDS) {
      return { success: false, shouldSetCookie: false }
    }
    
    const alreadySaved = record?.cookieSaved || false
    
    await collection.updateOne(
      { ip },
      {
        $set: { 
          cookieSaved: true,
          timeConsumed: timeConsumed,
          lastSeen: now 
        }
      }
    )
    
    return { success: true, shouldSetCookie: !alreadySaved }
  } catch (error) {
    return { success: false, shouldSetCookie: false }
  }
}

/**
 * Update time consumed for an IP
 * NOTE: Now calculates from absolute timestamp instead of incrementing
 */
export async function updateTimeConsumed(ip: string): Promise<void> {
  const now = new Date()
  
  if (!isDatabaseConfigured()) {
    const existing = memoryStore.get(ip)
    if (existing) {
      // Calculate from absolute timestamp
      existing.timeConsumed = calculateTimeConsumed(existing)
      existing.lastSeen = now
    }
    return
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    const record = await collection.findOne({ ip })
    const timeConsumed = calculateTimeConsumed(record)
    
    await collection.updateOne(
      { ip },
      {
        $set: { 
          timeConsumed: timeConsumed, // Set absolute value
          lastSeen: now 
        }
      }
    )
  } catch (error) {
    // Silent fail - non-critical operation
  }
}

/**
 * Get time consumed for an IP
 * NOTE: Now calculates from absolute timestamp
 */
export async function getTimeConsumed(ip: string): Promise<number> {
  if (!isDatabaseConfigured()) {
    const existing = memoryStore.get(ip)
    return calculateTimeConsumed(existing || null)
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    const record = await collection.findOne({ ip })
    return calculateTimeConsumed(record as IPRecord | null)
  } catch (error) {
    return 0
  }
}

/**
 * Get preview session info for an IP
 * Returns timing information for accurate client-side countdown
 */
export async function getPreviewSessionInfo(ip: string): Promise<{
  previewStartedAt: Date | null
  previewExpiresAt: Date | null
  remainingSeconds: number
  isExpired: boolean
} | null> {
  let record: IPRecord | null = null
  
  if (!isDatabaseConfigured()) {
    record = memoryStore.get(ip) || null
  } else {
    try {
      const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
      record = await collection.findOne({ ip }) as IPRecord | null
    } catch (error) {
      return null
    }
  }
  
  if (!record) return null
  
  return {
    previewStartedAt: record.previewStartedAt ? new Date(record.previewStartedAt) : null,
    previewExpiresAt: record.previewExpiresAt ? new Date(record.previewExpiresAt) : null,
    remainingSeconds: calculateRemainingTime(record),
    isExpired: isPreviewExpired(record)
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
        previewExpiresAt: null,
        sessionId: undefined,
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
            previewExpiresAt: null,
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
  if (!isDatabaseConfigured()) {
    const existed = memoryStore.has(ip)
    memoryStore.delete(ip)
    return existed
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    const result = await collection.deleteOne({ ip })
    return result.deletedCount > 0
  } catch (error) {
    return false
  }
}

/**
 * Clear fingerprint from an IP record (for admin/testing)
 * Also removes the fingerprint from all other records that have it
 */
export async function clearFingerprint(fingerprint: string): Promise<{ cleared: boolean; recordsUpdated: number }> {
  if (!fingerprint) return { cleared: false, recordsUpdated: 0 }
  
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
        record.previewStartedAt = null
        record.previewExpiresAt = null
        record.sessionId = undefined
        record.cookieSaved = false
        count++
      }
    }
    
    return { cleared: existed, recordsUpdated: count }
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    
    // Update all records with this fingerprint - reset their preview status completely
    const result = await collection.updateMany(
      { fingerprint },
      {
        $unset: { fingerprint: '', fingerprintFirstSeen: '', sessionId: '' },
        $set: { 
          previewUsed: false, 
          timeConsumed: 0,
          previewStartedAt: null,
          previewExpiresAt: null,
          cookieSaved: false,
          lastSeen: new Date() 
        }
      }
    )
    
    return { cleared: result.modifiedCount > 0, recordsUpdated: result.modifiedCount }
  } catch (error) {
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
    const result1 = await collection.findOneAndUpdate(
      { ip, fingerprint: { $exists: false } },
      {
        $set: { 
          fingerprint,
          fingerprintFirstSeen: now,
          lastSeen: now 
        }
      },
      { returnDocument: 'after' }
    )
    
    // Also update if fingerprint field is empty string
    const result2 = await collection.findOneAndUpdate(
      { ip, fingerprint: '' },  
      {
        $set: { 
          fingerprint,
          fingerprintFirstSeen: now,
          lastSeen: now 
        }
      },
      { returnDocument: 'after' }
    )
    
    // Update in-memory fingerprint store for consistency
    const updatedRecord = result1 || result2
    if (updatedRecord) {
      fingerprintStore.set(fingerprint, updatedRecord as IPRecord)
    }
  } catch (error) {
    // Silent fail - non-critical operation
  }
}

/**
 * Check if fingerprint has already used preview (across any IP)
 * Uses absolute timestamps for accurate time calculation
 */
export async function isFingerprintUsed(fingerprint: string): Promise<{ used: boolean; timeConsumed: number; isExpired: boolean }> {
  if (!fingerprint) return { used: false, timeConsumed: 0, isExpired: false }
  
  if (!isDatabaseConfigured()) {
    const record = fingerprintStore.get(fingerprint)
    if (record) {
      const expired = isPreviewExpired(record)
      return { 
        used: record.previewUsed || expired, 
        timeConsumed: calculateTimeConsumed(record),
        isExpired: expired
      }
    }
    return { used: false, timeConsumed: 0, isExpired: false }
  }

  try {
    const collection = await getCollection<IPRecord>(COLLECTIONS.IP_ACCESS)
    const record = await collection.findOne({ fingerprint })
    
    if (record) {
      const expired = isPreviewExpired(record as IPRecord)
      return { 
        used: record.previewUsed || expired, 
        timeConsumed: calculateTimeConsumed(record as IPRecord),
        isExpired: expired
      }
    }
    return { used: false, timeConsumed: 0, isExpired: false }
  } catch (error) {
    return { used: false, timeConsumed: 0, isExpired: false }
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
    // Silent fail - non-critical operation
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

