'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import { AppState, SectionKey, BlockReason, PrecheckResponse } from '@/types'
import { useFingerprint, getStoredFingerprint } from '@/hooks/useFingerprint'
import { useTabSync } from '@/hooks/useTabSync'

// ============ DEBUG LOGGING ============
// Set to true to enable console logs (useful for debugging)
const DEBUG = process.env.NODE_ENV === 'development'
const debugLog = (area: string, message: string, data?: any) => {
  if (!DEBUG) return
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12)
  const style = 'background: #1a1a2e; color: #00ff88; padding: 2px 6px; border-radius: 3px;'
  if (data !== undefined) {
    console.log(`%c[${timestamp}] [${area}]`, style, message, data)
  } else {
    console.log(`%c[${timestamp}] [${area}]`, style, message)
  }
}
// ======================================

// Components
import Onboarding from '@/components/Onboarding'
import LoadingScreen from '@/components/LoadingScreen'
import BlockedScreen from '@/components/BlockedScreen'
import PreviewEndedScreen from '@/components/PreviewEndedScreen'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import TimerBanner from '@/components/TimerBanner'
import ErrorBoundary from '@/components/ErrorBoundary'
import SectionLoader from '@/components/SectionLoader'
import { motion } from 'framer-motion'

// Sections
import Welcome from '@/components/sections/Welcome'
import MoneyGlitch from '@/components/sections/MoneyGlitch'
import HowItWorks from '@/components/sections/HowItWorks'
import LiveResults from '@/components/sections/LiveResults'
import Reviews from '@/components/sections/Reviews'
import SneakPeek from '@/components/sections/SneakPeek'
import FAQ from '@/components/sections/FAQ'

// Cookie helpers for onboarding (10 minute expiry)
const ONBOARDING_COOKIE_NAME = 'ft_onboarding_completed'
const ONBOARDING_COOKIE_EXPIRY_MINUTES = 10

function setOnboardingCookie() {
  const expiryDate = new Date()
  expiryDate.setMinutes(expiryDate.getMinutes() + ONBOARDING_COOKIE_EXPIRY_MINUTES)
  document.cookie = `${ONBOARDING_COOKIE_NAME}=1; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`
}

function hasOnboardingCookie(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some(c => c.trim().startsWith(`${ONBOARDING_COOKIE_NAME}=`))
}

const SECTIONS_MAP: Record<SectionKey, React.ComponentType> = {
  'welcome': Welcome,
  'money-glitch': MoneyGlitch,
  'how-it-works': HowItWorks,
  'live-results': LiveResults,
  'reviews': Reviews,
  'sneak-peek': SneakPeek,
  'faq': FAQ,
}

export default function MoneyGlitchPage() {
  // Constants
  const PREVIEW_DURATION_SECONDS = 180
  
  // State
  const [appState, setAppState] = useState<AppState>('onboarding')
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [blockReason, setBlockReason] = useState<BlockReason | null>(null)
  const [activeSection, setActiveSection] = useState<SectionKey>('money-glitch')
  const [timeLeft, setTimeLeft] = useState(PREVIEW_DURATION_SECONDS)
  const [precheckResult, setPrecheckResult] = useState<PrecheckResponse | null>(null)
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null)
  const [progressSaved, setProgressSaved] = useState(false) // Track if 30-second save was made
  const [isTabLeader, setIsTabLeader] = useState(true) // Is this tab the leader for timer?
  const [showErrorPopup, setShowErrorPopup] = useState(false) // Show error retry popup
  
  // Absolute timestamp for accurate timer (survives refresh/new tabs)
  const [previewExpiresAt, setPreviewExpiresAt] = useState<number | null>(null)
  
  // Refs to prevent double-processing
  const precheckProcessedRef = useRef(false)
  const previewEndedRef = useRef(false)
  
  // Get browser fingerprint for anti-bypass protection
  const { visitorId: fingerprint, isLoading: fingerprintLoading } = useFingerprint()

  // End preview function (defined early for useTabSync)
  const endPreviewCallback = useCallback(() => {
    if (previewEndedRef.current) return // Prevent double-ending
    previewEndedRef.current = true
    setAppState('preview_ended')
    localStorage.setItem('ft_preview_ended', '1')
  }, [])

  // Stable callback for setting time from number value
  const setTimeLeftDirect = useCallback((time: number) => {
    setTimeLeft(time)
  }, [])
  
  // Stable callback for setting expiry timestamp (for multi-tab sync)
  const setExpiresAtDirect = useCallback((expiresAt: number) => {
    setPreviewExpiresAt(expiresAt)
  }, [])

  // Stable callbacks for leader changes
  const handleBecameLeader = useCallback(() => {
    setIsTabLeader(true)
    console.log('[Page] This tab is now the leader')
  }, [])

  const handleLostLeadership = useCallback(() => {
    setIsTabLeader(false)
    console.log('[Page] This tab lost leadership')
  }, [])

  // Multi-tab synchronization - uses absolute expiry timestamp
  const { isLeader, broadcastPreviewEnded, broadcastProgressSaved } = useTabSync({
    timeLeft,
    setTimeLeft: setTimeLeftDirect,
    previewExpiresAt,
    setPreviewExpiresAt: setExpiresAtDirect,
    onPreviewEnded: endPreviewCallback,
    onBecameLeader: handleBecameLeader,
    onLostLeadership: handleLostLeadership
  })

  // Update isTabLeader when leadership changes
  useEffect(() => {
    setIsTabLeader(isLeader)
  }, [isLeader])

  // Check if preview already ended or onboarding was completed recently
  useEffect(() => {
    debugLog('INIT', '🚀 Initial useEffect running')
    
    // Only access localStorage/cookies on client side
    if (typeof window === 'undefined') {
      debugLog('INIT', '❌ Window undefined - SSR context')
      return
    }
    
    // Check if preview already ended
    const previewEndedLocal = localStorage.getItem('ft_preview_ended')
    debugLog('INIT', 'localStorage ft_preview_ended:', previewEndedLocal)
    
    if (previewEndedLocal === '1') {
      debugLog('INIT', '⏹️ Preview already ended - showing ended screen')
      previewEndedRef.current = true
      setAppState('preview_ended')
      return
    }
    
    // Check for stored expiry timestamp (from previous session/refresh)
    const storedExpiresAt = localStorage.getItem('ft_preview_expires_at')
    debugLog('INIT', 'localStorage ft_preview_expires_at:', storedExpiresAt)
    
    if (storedExpiresAt) {
      const expiresAtMs = parseInt(storedExpiresAt, 10)
      if (!isNaN(expiresAtMs)) {
        const now = Date.now()
        const remaining = Math.floor((expiresAtMs - now) / 1000)
        debugLog('INIT', `Stored expiry: ${expiresAtMs}, now: ${now}, remaining: ${remaining}s`)
        
        if (remaining <= 0) {
          // Preview has expired
          debugLog('INIT', '⏹️ Stored preview has expired')
          previewEndedRef.current = true
          setAppState('preview_ended')
          localStorage.setItem('ft_preview_ended', '1')
          return
        }
        
        // Preview still valid - restore expiry timestamp and go directly to preview_active
        debugLog('INIT', `✅ Restoring active preview with ${remaining}s remaining`)
        setPreviewExpiresAt(expiresAtMs)
        setTimeLeft(remaining)
        
        // Check if progress was already saved (elapsed > 30 seconds)
        const elapsed = PREVIEW_DURATION_SECONDS - remaining
        if (elapsed >= 30) {
          setProgressSaved(true)
        }
        
        // Go directly to preview_active - skip loading since we have valid session
        setAppState('preview_active')
        return
      }
    }
    
    // Check if onboarding was completed recently (within 10 minutes)
    // This prevents showing pop-ups again on refresh
    const hasOnboarding = hasOnboardingCookie()
    debugLog('INIT', 'Has onboarding cookie:', hasOnboarding)
    
    if (hasOnboarding) {
      debugLog('INIT', '➡️ Skipping onboarding, going to loading')
      setAppState('loading')
      return
    }
    
    debugLog('INIT', '📋 Showing onboarding (default state)')
  }, [])

  // Run precheck API call with fingerprint
  const runPrecheck = useCallback(async (): Promise<PrecheckResponse> => {
    try {
      // Include fingerprint in query string for server-side validation
      const fp = fingerprint || getStoredFingerprint() || ''
      const url = fp ? `/api/precheck?fp=${encodeURIComponent(fp)}` : '/api/precheck'
      const res = await fetch(url)
      const data = await res.json()
      return data
    } catch (error) {
      console.error('Precheck failed:', error)
      return { status: 'blocked', reason: 'error' }
    }
  }, [fingerprint])

  // Save progress to server (at 30 seconds and on unload)
  const saveProgress = useCallback(async (secondsWatched: number, trigger: 'threshold' | 'periodic' | 'unload') => {
    try {
      await fetch('/api/saveProgress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secondsWatched, trigger }),
      })
    } catch (error) {
      // Silent fail - non-critical
    }
  }, [])

  // Handle loading screen completion (3 seconds minimum)
  // This function processes the precheck result - only call when precheckResult is ready
  const processPrecheck = useCallback((result: PrecheckResponse) => {
    debugLog('PROCESS', `processPrecheck called with status: ${result.status}`)
    debugLog('PROCESS', `precheckProcessedRef.current: ${precheckProcessedRef.current}`)
    
    // Prevent double-processing
    if (precheckProcessedRef.current) {
      debugLog('PROCESS', '⚠️ Already processed - skipping')
      return
    }
    precheckProcessedRef.current = true
    debugLog('PROCESS', '🔒 Set precheckProcessedRef to true')
    
    if (result.status === 'blocked') {
      debugLog('PROCESS', `🚫 BLOCKED - reason: ${result.reason || 'error'}`)
      setBlockReason(result.reason || 'error')
      setAppState('blocked')
    } else if (result.status === 'ok') {
      debugLog('PROCESS', '✅ Status OK - setting up preview')
      // Use absolute expiry timestamp from server
      // Use absolute expiry timestamp from server
      if (result.previewExpiresAt) {
        const expiresAtMs = new Date(result.previewExpiresAt).getTime()
        const now = Date.now()
        
        debugLog('PROCESS', `Server expiry: ${result.previewExpiresAt}, parsed: ${expiresAtMs}, now: ${now}`)
        
        // Validate that expiry is in the future
        if (expiresAtMs <= now) {
          debugLog('PROCESS', '❌ Expiry is in the past!')
          setBlockReason('preview_used')
          setAppState('blocked')
          return
        }
        
        const remaining = Math.floor((expiresAtMs - now) / 1000)
        debugLog('PROCESS', `Setting preview - remaining: ${remaining}s`)
        setPreviewExpiresAt(expiresAtMs)
        setTimeLeft(remaining)
        
        // Store in localStorage for persistence across refreshes
        localStorage.setItem('ft_preview_expires_at', expiresAtMs.toString())
      } else {
        // Fallback: use duration from API
        const duration = result.previewDuration || PREVIEW_DURATION_SECONDS
        const expiresAtMs = Date.now() + (duration * 1000)
        debugLog('PROCESS', `No server expiry - using duration: ${duration}s`)
        setPreviewExpiresAt(expiresAtMs)
        setTimeLeft(duration)
        localStorage.setItem('ft_preview_expires_at', expiresAtMs.toString())
      }
      
      if (result.sessionId) {
        localStorage.setItem('ft_session_id', result.sessionId)
      }
      
      debugLog('PROCESS', '🎉 Setting appState to preview_active')
      setAppState('preview_active')
    } else {
      // Unknown status - treat as error
      debugLog('PROCESS', `❓ Unknown status: ${result.status}`)
      setBlockReason('error')
      setAppState('blocked')
    }
  }, [])

  // When entering loading state, start the precheck
  // Wait for fingerprint to be ready before making the precheck call
  useEffect(() => {
    if (appState !== 'loading') {
      debugLog('PRECHECK', `Skipping - appState is "${appState}", not "loading"`)
      return
    }
    
    debugLog('PRECHECK', '🔄 Starting precheck flow')
    debugLog('PRECHECK', `Fingerprint: ${fingerprint || 'null'}, loading: ${fingerprintLoading}`)
    
    // Reset processing flag when entering loading state
    precheckProcessedRef.current = false
    setLoadingStartTime(Date.now())
    setPrecheckResult(null) // Reset previous result
    
    let cancelled = false
    let precheckCompleted = false
    let precheckTimeoutId: NodeJS.Timeout | null = null
    let fingerprintWaitId: NodeJS.Timeout | null = null
    
    const fingerprintWaitStart = Date.now()
    const maxFingerprintWait = 2000
    
    const runPrecheckNow = () => {
      if (cancelled || precheckCompleted) {
        debugLog('PRECHECK', `⚠️ runPrecheckNow skipped - cancelled: ${cancelled}, completed: ${precheckCompleted}`)
        return
      }
      
      debugLog('PRECHECK', '📡 Making precheck API call...')
      
      // Set a timeout fallback in case precheck fails (10 seconds max wait)
      precheckTimeoutId = setTimeout(() => {
        if (!precheckCompleted && !cancelled) {
          debugLog('PRECHECK', '❌ Precheck TIMEOUT after 10s')
          precheckCompleted = true
          setPrecheckResult({ status: 'blocked', reason: 'error' })
        }
      }, 10000)
      
      runPrecheck()
        .then((result) => {
          debugLog('PRECHECK', '✅ Precheck API response:', result)
          if (!precheckCompleted && !cancelled) {
            precheckCompleted = true
            if (precheckTimeoutId) clearTimeout(precheckTimeoutId)
            setPrecheckResult(result)
            debugLog('PRECHECK', '📦 setPrecheckResult called')
          } else {
            debugLog('PRECHECK', `⚠️ Result ignored - completed: ${precheckCompleted}, cancelled: ${cancelled}`)
          }
        })
        .catch((error) => {
          debugLog('PRECHECK', '❌ Precheck API error:', error)
          if (!precheckCompleted && !cancelled) {
            precheckCompleted = true
            if (precheckTimeoutId) clearTimeout(precheckTimeoutId)
            setPrecheckResult({ status: 'blocked', reason: 'error' })
          }
        })
    }
    
    const checkFingerprint = () => {
      if (cancelled) {
        debugLog('PRECHECK', '⚠️ checkFingerprint cancelled')
        return
      }
      
      const fp = fingerprint || getStoredFingerprint()
      const waited = Date.now() - fingerprintWaitStart
      
      debugLog('PRECHECK', `Fingerprint check - fp: ${fp ? 'ready' : 'null'}, waited: ${waited}ms, loading: ${fingerprintLoading}`)
      
      // If fingerprint ready or waited too long, proceed
      if (fp || waited >= maxFingerprintWait || !fingerprintLoading) {
        debugLog('PRECHECK', '✅ Proceeding with precheck')
        runPrecheckNow()
      } else {
        // Wait a bit more for fingerprint
        debugLog('PRECHECK', '⏳ Waiting for fingerprint...')
        fingerprintWaitId = setTimeout(checkFingerprint, 100)
      }
    }
    
    checkFingerprint()
    
    // Cleanup function - clears ALL timers
    return () => {
      debugLog('PRECHECK', '🧹 Cleanup - cancelling precheck flow')
      cancelled = true
      precheckCompleted = true
      if (precheckTimeoutId) clearTimeout(precheckTimeoutId)
      if (fingerprintWaitId) clearTimeout(fingerprintWaitId)
    }
  }, [appState, runPrecheck, fingerprint, fingerprintLoading])

  // Monitor loading completion (3 seconds + precheck done)
  // This effect runs when either the timer needs checking OR when precheckResult arrives
  useEffect(() => {
    debugLog('LOADING', `Monitor effect - appState: ${appState}, loadingStartTime: ${loadingStartTime}, precheckResult: ${precheckResult ? 'present' : 'null'}`)
    
    if (appState !== 'loading' || !loadingStartTime) {
      debugLog('LOADING', '⏭️ Skipping - not in loading state or no start time')
      return
    }
    
    // If no precheck result yet, do nothing - effect will re-run when precheckResult changes
    if (!precheckResult) {
      debugLog('LOADING', '⏳ Waiting for precheck result...')
      return
    }
    
    const elapsed = Date.now() - loadingStartTime
    debugLog('LOADING', `Elapsed: ${elapsed}ms, precheckResult status: ${precheckResult.status}`)
    
    // If minimum time not yet passed, schedule a check when it will be
    if (elapsed < 3000) {
      const remainingTime = 3000 - elapsed
      debugLog('LOADING', `⏱️ Scheduling processPrecheck in ${remainingTime}ms`)
      
      const timerId = setTimeout(() => {
        debugLog('LOADING', '⏰ Timer fired - calling processPrecheck')
        // By this time, precheckResult is available (we checked above)
        // Trigger state transition
        if (precheckResult) {
          processPrecheck(precheckResult)
        }
      }, remainingTime)
      
      return () => {
        debugLog('LOADING', '🧹 Clearing loading timer')
        clearTimeout(timerId)
      }
    }
    
    // Both conditions met: minimum time passed AND we have precheckResult
    debugLog('LOADING', '✅ Both conditions met - calling processPrecheck immediately')
    processPrecheck(precheckResult)
    
  }, [appState, loadingStartTime, precheckResult, processPrecheck])

  // End preview function - defined before timer effect that uses it
  const endPreview = useCallback(async () => {
    // Prevent double-ending
    if (previewEndedRef.current) {
      return
    }
    previewEndedRef.current = true
    
    setAppState('preview_ended')
    localStorage.setItem('ft_preview_ended', '1')
    
    // Clear stored expiry
    localStorage.removeItem('ft_preview_expires_at')
    localStorage.removeItem('ft_session_id')
    
    // Broadcast to other tabs that preview ended
    broadcastPreviewEnded()
    
    // Call API to mark preview as used (include fingerprint) - only leader should call
    if (isTabLeader) {
      try {
        const fp = fingerprint || getStoredFingerprint() || ''
        await fetch('/api/endPreview', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fingerprint: fp })
        })
      } catch (error) {
        // Silent fail - non-critical
      }
    }
  }, [broadcastPreviewEnded, isTabLeader, fingerprint])

  // Countdown timer using absolute expiry timestamp
  // ALL tabs run this timer for responsiveness, but only leader saves progress
  useEffect(() => {
    if (appState !== 'preview_active' || !previewExpiresAt) return
    
    const timer = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, Math.floor((previewExpiresAt - now) / 1000))
      
      setTimeLeft(remaining)
      
      // Calculate elapsed time for progress saving
      const elapsed = PREVIEW_DURATION_SECONDS - remaining
      
      // Save progress at 30 seconds (only once, only leader)
      if (elapsed >= 30 && !progressSaved && isTabLeader) {
        setProgressSaved(true)
        saveProgress(30, 'threshold')
        broadcastProgressSaved()
      }
      
      // End preview when time runs out
      if (remaining <= 0) {
        clearInterval(timer)
        // Save final progress before ending (only leader)
        if (isTabLeader) {
          saveProgress(PREVIEW_DURATION_SECONDS, 'unload')
        }
        endPreview()
      }
    }, 1000)
    
    // Run immediately to set initial time
    const now = Date.now()
    const initialRemaining = Math.max(0, Math.floor((previewExpiresAt - now) / 1000))
    setTimeLeft(initialRemaining)
    
    // Check if already expired
    if (initialRemaining <= 0) {
      clearInterval(timer)
      endPreview()
    }
    
    return () => clearInterval(timer)
  }, [appState, previewExpiresAt, progressSaved, saveProgress, isTabLeader, broadcastProgressSaved, endPreview])

  // Save progress on tab close/unload (only leader saves)
  useEffect(() => {
    if (appState !== 'preview_active' || !previewExpiresAt) return
    
    const handleUnload = () => {
      // Only leader tab saves progress on unload to prevent double-counting
      if (!isTabLeader) {
        return
      }
      
      // Calculate elapsed time from absolute timestamp
      const remaining = Math.max(0, Math.floor((previewExpiresAt - Date.now()) / 1000))
      const elapsed = PREVIEW_DURATION_SECONDS - remaining
      
      // Use sendBeacon for reliable unload tracking (with Blob for proper content-type)
      const data = JSON.stringify({ secondsWatched: elapsed, trigger: 'unload' })
      const blob = new Blob([data], { type: 'application/json' })
      navigator.sendBeacon('/api/saveProgress', blob)
    }
    
    window.addEventListener('beforeunload', handleUnload)
    window.addEventListener('pagehide', handleUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      window.removeEventListener('pagehide', handleUnload)
    }
  }, [appState, previewExpiresAt, isTabLeader])

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    // Set cookie (expires in 10 minutes) - prevents showing pop-ups on refresh
    setOnboardingCookie()
    // Also keep localStorage for backward compatibility
    localStorage.setItem('ft_onboarding_done', '1')
    setAppState('loading')
  }

  // Handle section change - wrapped in useCallback for stable reference
  const handleSectionChange = useCallback((section: SectionKey) => {
    setActiveSection(section)
  }, [])

  // Get the component to render for current section
  const SectionComponent = SECTIONS_MAP[activeSection]

  // Debug state for UI panel
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  
  // Toggle debug panel with keyboard shortcut (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setShowDebugPanel(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Show error popup after 5 seconds if user might be stuck
  // This gives users a way to retry if something goes wrong
  useEffect(() => {
    if (appState !== 'preview_active') return
    
    const timer = setTimeout(() => {
      // Only show if user hasn't interacted (section still on money-glitch)
      // This suggests they might be stuck
      if (activeSection === 'money-glitch') {
        setShowErrorPopup(true)
      }
    }, 2000) // Show after 2 seconds
    
    return () => clearTimeout(timer)
  }, [appState, activeSection])

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-[#050608]">
      {/* DEBUG PANEL - Press Ctrl+Shift+D to toggle */}
      {showDebugPanel && (
        <div className="fixed top-4 right-4 z-[9999] bg-black/95 border border-yellow-500/50 rounded-lg p-4 text-xs font-mono max-w-sm shadow-xl">
          <div className="flex justify-between items-center mb-3">
            <span className="text-yellow-400 font-bold">🔧 DEBUG PANEL</span>
            <button onClick={() => setShowDebugPanel(false)} className="text-zinc-500 hover:text-white">✕</button>
          </div>
          <div className="space-y-2 text-zinc-300">
            <div>
              <span className="text-zinc-500">appState:</span>{' '}
              <span className={appState === 'preview_active' ? 'text-green-400' : appState === 'loading' ? 'text-yellow-400' : 'text-red-400'}>
                {appState}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">isTabLeader:</span>{' '}
              <span className={isTabLeader ? 'text-green-400' : 'text-red-400'}>{String(isTabLeader)}</span>
            </div>
            <div>
              <span className="text-zinc-500">fingerprint:</span>{' '}
              <span className="text-blue-400">{fingerprint ? fingerprint.slice(0, 12) + '...' : 'null'}</span>
            </div>
            <div>
              <span className="text-zinc-500">fingerprintLoading:</span>{' '}
              <span className={fingerprintLoading ? 'text-yellow-400' : 'text-green-400'}>{String(fingerprintLoading)}</span>
            </div>
            <div>
              <span className="text-zinc-500">precheckResult:</span>{' '}
              <span className={precheckResult ? 'text-green-400' : 'text-yellow-400'}>{precheckResult ? precheckResult.status : 'null'}</span>
            </div>
            <div>
              <span className="text-zinc-500">precheckProcessed:</span>{' '}
              <span>{String(precheckProcessedRef.current)}</span>
            </div>
            <div>
              <span className="text-zinc-500">timeLeft:</span>{' '}
              <span className="text-cyan-400">{timeLeft}s</span>
            </div>
            <div>
              <span className="text-zinc-500">previewExpiresAt:</span>{' '}
              <span className="text-purple-400">{previewExpiresAt ? new Date(previewExpiresAt).toLocaleTimeString() : 'null'}</span>
            </div>
            <div>
              <span className="text-zinc-500">activeSection:</span>{' '}
              <span>{activeSection}</span>
            </div>
            <div className="pt-2 border-t border-zinc-700 mt-2">
              <button 
                onClick={() => {
                  localStorage.clear()
                  document.cookie.split(";").forEach(c => {
                    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
                  })
                  window.location.reload()
                }}
                className="w-full py-1 px-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded"
              >
                🗑️ Clear All & Reload
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Overlay screens - AnimatePresence handles exit animations */}
      <AnimatePresence>
        {/* Onboarding */}
        {appState === 'onboarding' && (
          <Onboarding
            key="onboarding"
            step={onboardingStep}
            onNext={() => setOnboardingStep((s) => s + 1)}
            onComplete={handleOnboardingComplete}
          />
        )}

        {/* Loading Screen */}
        {appState === 'loading' && (
          <LoadingScreen
            key="loading"
            minimumDuration={3000}
          />
        )}

        {/* Blocked Screen - always show when blocked (default to 'error' if reason missing) */}
        {appState === 'blocked' && (
          <BlockedScreen key="blocked" reason={blockReason || 'error'} />
        )}

        {/* Preview Ended Screen */}
        {appState === 'preview_ended' && (
          <PreviewEndedScreen key="ended" />
        )}
      </AnimatePresence>

      {/* Main UI (only when preview is active) */}
      {appState === 'preview_active' && (
        <div className="flex h-screen">
          {/* Desktop Sidebar */}
          <Sidebar
            active={activeSection}
            onChange={handleSectionChange}
          />

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Mobile Navigation */}
            <MobileNav
              active={activeSection}
              onChange={handleSectionChange}
              timeLeft={timeLeft}
            />

            {/* Desktop Timer Banner */}
            <TimerBanner timeLeft={timeLeft} />

            {/* Content Area */}
            <main className="flex-1 min-h-0 flex flex-col overflow-auto">
              {/* Money-Glitch section gets full height for chat layout */}
              <Suspense fallback={<SectionLoader />}>
                {activeSection === 'money-glitch' ? (
                  <div className="flex-1 min-h-0 flex flex-col max-w-3xl w-full mx-auto">
                    <SectionComponent />
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto overscroll-contain">
                    <div className="max-w-3xl mx-auto p-4 md:p-6">
                      <SectionComponent />
                    </div>
                  </div>
                )}
              </Suspense>
            </main>
          </div>

          {/* Error Retry Popup */}
          <AnimatePresence>
            {showErrorPopup && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
              >
                <motion.div
                  initial={{ y: 20 }}
                  animate={{ y: 0 }}
                  className="bg-gradient-to-b from-[#141418] to-[#0f0f12] rounded-2xl border border-white/10 p-6 max-w-sm w-full shadow-2xl"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <span className="text-4xl">⚠️</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      Something went wrong
                    </h3>
                    <p className="text-zinc-400 text-sm mb-6">
                      We encountered an error loading the content. Please retry to continue.
                    </p>
                    <button
                      onClick={() => {
                        window.location.href = 'https://live.freyatrades.page'
                      }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold hover:from-yellow-300 hover:to-yellow-400 transition-all"
                    >
                      🔄 Retry
                    </button>
                    <button
                      onClick={() => setShowErrorPopup(false)}
                      className="w-full mt-2 py-2 text-zinc-500 text-sm hover:text-white transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
    </ErrorBoundary>
  )
}

