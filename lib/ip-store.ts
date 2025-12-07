// In-memory IP store for demo purposes
// In production, replace with a proper database (PostgreSQL, Redis, etc.)

interface IPRecord {
  ip: string
  previewUsed: boolean
  vpnAttempts: number
  vpnWindowEnd: number | null
  firstSeen: number
  lastSeen: number
}

// Global in-memory store (persists across requests in same process)
const ipStore = new Map<string, IPRecord>()

export function getIPRecord(ip: string): IPRecord | null {
  return ipStore.get(ip) || null
}

export function createIPRecord(ip: string): IPRecord {
  const record: IPRecord = {
    ip,
    previewUsed: false,
    vpnAttempts: 0,
    vpnWindowEnd: null,
    firstSeen: Date.now(),
    lastSeen: Date.now(),
  }
  ipStore.set(ip, record)
  return record
}

export function updateIPRecord(ip: string, updates: Partial<IPRecord>): IPRecord | null {
  const existing = ipStore.get(ip)
  if (!existing) return null
  
  const updated = { ...existing, ...updates, lastSeen: Date.now() }
  ipStore.set(ip, updated)
  return updated
}

export function markPreviewUsed(ip: string): void {
  const record = ipStore.get(ip)
  if (record) {
    record.previewUsed = true
    record.lastSeen = Date.now()
    ipStore.set(ip, record)
  } else {
    ipStore.set(ip, {
      ip,
      previewUsed: true,
      vpnAttempts: 0,
      vpnWindowEnd: null,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
    })
  }
}

export function incrementVPNAttempts(ip: string, windowHours: number): { attempts: number; windowEnd: number } {
  let record = ipStore.get(ip)
  const now = Date.now()
  const windowMs = windowHours * 60 * 60 * 1000
  
  if (!record) {
    record = createIPRecord(ip)
  }
  
  // Check if we need to reset the window
  if (!record.vpnWindowEnd || record.vpnWindowEnd < now) {
    // Start new window
    record.vpnAttempts = 1
    record.vpnWindowEnd = now + windowMs
  } else {
    // Within existing window, increment
    record.vpnAttempts += 1
  }
  
  record.lastSeen = now
  ipStore.set(ip, record)
  
  return {
    attempts: record.vpnAttempts,
    windowEnd: record.vpnWindowEnd,
  }
}

// Cleanup old records (call periodically in production)
export function cleanupOldRecords(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): void {
  const now = Date.now()
  for (const [ip, record] of ipStore.entries()) {
    if (now - record.lastSeen > maxAgeMs) {
      ipStore.delete(ip)
    }
  }
}

