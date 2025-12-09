'use client'

import { useState, useEffect } from 'react'
import FingerprintJS from '@fingerprintjs/fingerprintjs'

// ============ DEBUG LOGGING ============
const DEBUG = process.env.NODE_ENV === 'development'
const debugLog = (message: string, data?: any) => {
  if (!DEBUG) return
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12)
  const style = 'background: #1b3d4e; color: #88ddff; padding: 2px 6px; border-radius: 3px;'
  if (data !== undefined) {
    console.log(`%c[${timestamp}] [FINGERPRINT]`, style, message, data)
  } else {
    console.log(`%c[${timestamp}] [FINGERPRINT]`, style, message)
  }
}
// ======================================

/**
 * Hook to get browser fingerprint using FingerprintJS
 * Returns a unique visitorId that persists across IP changes
 */
export function useFingerprint() {
  const [visitorId, setVisitorId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true
    debugLog('🚀 Fingerprint effect starting')

    const loadFingerprint = async () => {
      const startTime = Date.now()
      debugLog('📡 Loading FingerprintJS...')
      
      try {
        // Load the FingerprintJS agent
        const fp = await FingerprintJS.load()
        debugLog(`✅ FingerprintJS loaded in ${Date.now() - startTime}ms`)
        
        // Get the visitor identifier
        const result = await fp.get()
        debugLog(`✅ Got visitorId in ${Date.now() - startTime}ms total:`, result.visitorId)
        
        if (mounted) {
          setVisitorId(result.visitorId)
          setIsLoading(false)
          debugLog('✅ State updated - fingerprint ready')
          
          // Also store in localStorage as backup
          try {
            localStorage.setItem('ft_fingerprint', result.visitorId)
          } catch {
            // Ignore localStorage errors
          }
        } else {
          debugLog('⚠️ Component unmounted - not updating state')
        }
      } catch (err) {
        debugLog('❌ FingerprintJS error:', err)
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)))
          setIsLoading(false)
          
          // Try to get from localStorage as fallback
          try {
            const stored = localStorage.getItem('ft_fingerprint')
            debugLog(`Fallback to localStorage: ${stored}`)
            if (stored) {
              setVisitorId(stored)
            }
          } catch {
            // Ignore localStorage errors
          }
        }
      }
    }

    loadFingerprint()

    return () => {
      debugLog('🧹 Fingerprint effect cleanup')
      mounted = false
    }
  }, [])

  return { visitorId, isLoading, error }
}

/**
 * Get fingerprint synchronously from localStorage
 * Useful for sendBeacon on page unload
 */
export function getStoredFingerprint(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem('ft_fingerprint')
  } catch {
    return null
  }
}
