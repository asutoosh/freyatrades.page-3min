'use client'

import { useState, useEffect } from 'react'
import FingerprintJS from '@fingerprintjs/fingerprintjs'

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

    const loadFingerprint = async () => {
      try {
        // Load the FingerprintJS agent
        const fp = await FingerprintJS.load()
        
        // Get the visitor identifier
        const result = await fp.get()
        
        if (mounted) {
          setVisitorId(result.visitorId)
          setIsLoading(false)
          
          // Also store in localStorage as backup
          try {
            localStorage.setItem('ft_fingerprint', result.visitorId)
          } catch {
            // Ignore localStorage errors
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)))
          setIsLoading(false)
          
          // Try to get from localStorage as fallback
          try {
            const stored = localStorage.getItem('ft_fingerprint')
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
