'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { AppState, SectionKey, BlockReason, PrecheckResponse } from '@/types'
import { useFingerprint, getStoredFingerprint } from '@/hooks/useFingerprint'
import { useTabSync } from '@/hooks/useTabSync'

// Components
import Onboarding from '@/components/Onboarding'
import LoadingScreen from '@/components/LoadingScreen'
import BlockedScreen from '@/components/BlockedScreen'
import PreviewEndedScreen from '@/components/PreviewEndedScreen'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import TimerBanner from '@/components/TimerBanner'

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
    // Only access localStorage/cookies on client side
    if (typeof window === 'undefined') return
    
    // Check if preview already ended
    const previewEndedLocal = localStorage.getItem('ft_preview_ended')
    if (previewEndedLocal === '1') {
      previewEndedRef.current = true
      setAppState('preview_ended')
      return
    }
    
    // Check for stored expiry timestamp (from previous session/refresh)
    const storedExpiresAt = localStorage.getItem('ft_preview_expires_at')
    if (storedExpiresAt) {
      const expiresAtMs = parseInt(storedExpiresAt, 10)
      if (!isNaN(expiresAtMs)) {
        const now = Date.now()
        const remaining = Math.floor((expiresAtMs - now) / 1000)
        
        if (remaining <= 0) {
          // Preview has expired
          console.log('[Init] Stored preview has expired')
          previewEndedRef.current = true
          setAppState('preview_ended')
          localStorage.setItem('ft_preview_ended', '1')
          return
        }
        
        // Preview still valid - restore expiry timestamp and go directly to preview_active
        console.log('[Init] Restoring preview expiry from localStorage, remaining:', remaining, 'seconds')
        setPreviewExpiresAt(expiresAtMs)
        setTimeLeft(remaining)
        
        // Check if progress was already saved (elapsed > 30 seconds)
        const elapsed = PREVIEW_DURATION_SECONDS - remaining
        if (elapsed >= 30) {
          setProgressSaved(true)
          console.log('[Init] Progress already saved (elapsed:', elapsed, 'seconds)')
        }
        
        // Go directly to preview_active - skip loading since we have valid session
        setAppState('preview_active')
        return
      }
    }
    
    // Check if onboarding was completed recently (within 10 minutes)
    // This prevents showing pop-ups again on refresh
    if (hasOnboardingCookie()) {
      console.log('[Onboarding] Cookie found - skipping onboarding')
      setAppState('loading')
      return
    }
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
      console.log('[Preview] Progress saved:', secondsWatched, 'seconds (', trigger, ')')
    } catch (error) {
      console.error('Failed to save progress:', error)
    }
  }, [])

  // Handle loading screen completion (3 seconds minimum)
  // This function processes the precheck result - only call when precheckResult is ready
  const processPrecheck = useCallback((result: PrecheckResponse) => {
    // Prevent double-processing
    if (precheckProcessedRef.current) {
      console.log('[Loading] Precheck already processed, skipping')
      return
    }
    precheckProcessedRef.current = true
    
    console.log('[Loading] Processing precheck result:', result)
    
    if (result.status === 'blocked') {
      setBlockReason(result.reason || 'error')
      setAppState('blocked')
    } else if (result.status === 'ok') {
      // Use absolute expiry timestamp from server
      if (result.previewExpiresAt) {
        const expiresAtMs = new Date(result.previewExpiresAt).getTime()
        const now = Date.now()
        
        // Validate that expiry is in the future
        if (expiresAtMs <= now) {
          console.error('[Loading] Server returned expired timestamp, blocking')
          setBlockReason('preview_used')
          setAppState('blocked')
          return
        }
        
        const remaining = Math.floor((expiresAtMs - now) / 1000)
        setPreviewExpiresAt(expiresAtMs)
        setTimeLeft(remaining)
        console.log('[Loading] Preview expires at:', new Date(expiresAtMs).toISOString(), 'remaining:', remaining, 's')
        
        // Store in localStorage for persistence across refreshes
        localStorage.setItem('ft_preview_expires_at', expiresAtMs.toString())
      } else {
        // Fallback: use duration from API
        const duration = result.previewDuration || PREVIEW_DURATION_SECONDS
        const expiresAtMs = Date.now() + (duration * 1000)
        setPreviewExpiresAt(expiresAtMs)
        setTimeLeft(duration)
        localStorage.setItem('ft_preview_expires_at', expiresAtMs.toString())
      }
      
      if (result.sessionId) {
        localStorage.setItem('ft_session_id', result.sessionId)
      }
      
      setAppState('preview_active')
    } else {
      // Unknown status - treat as error
      console.error('[Loading] Unknown precheck status:', result)
      setBlockReason('error')
      setAppState('blocked')
    }
  }, [])

  // When entering loading state, start the precheck
  // Wait for fingerprint to be ready before making the precheck call
  useEffect(() => {
    if (appState !== 'loading') return
    
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
      if (cancelled || precheckCompleted) return
      
      const fp = fingerprint || getStoredFingerprint()
      console.log('[Loading] Starting precheck with fingerprint:', fp ? 'yes' : 'no')
      
      // Set a timeout fallback in case precheck fails (10 seconds max wait)
      precheckTimeoutId = setTimeout(() => {
        if (!precheckCompleted && !cancelled) {
          console.error('[Loading] Precheck timeout - treating as error')
          precheckCompleted = true
          setPrecheckResult({ status: 'blocked', reason: 'error' })
        }
      }, 10000)
      
      runPrecheck()
        .then((result) => {
          if (!precheckCompleted && !cancelled) {
            precheckCompleted = true
            if (precheckTimeoutId) clearTimeout(precheckTimeoutId)
            setPrecheckResult(result)
          }
        })
        .catch((error) => {
          if (!precheckCompleted && !cancelled) {
            precheckCompleted = true
            if (precheckTimeoutId) clearTimeout(precheckTimeoutId)
            console.error('[Loading] Precheck failed:', error)
            setPrecheckResult({ status: 'blocked', reason: 'error' })
          }
        })
    }
    
    const checkFingerprint = () => {
      if (cancelled) return
      
      const fp = fingerprint || getStoredFingerprint()
      const waited = Date.now() - fingerprintWaitStart
      
      // If fingerprint ready or waited too long, proceed
      if (fp || waited >= maxFingerprintWait || !fingerprintLoading) {
        runPrecheckNow()
      } else {
        // Wait a bit more for fingerprint
        console.log('[Loading] Waiting for fingerprint...')
        fingerprintWaitId = setTimeout(checkFingerprint, 100)
      }
    }
    
    checkFingerprint()
    
    // Cleanup function - clears ALL timers
    return () => {
      cancelled = true
      precheckCompleted = true
      if (precheckTimeoutId) clearTimeout(precheckTimeoutId)
      if (fingerprintWaitId) clearTimeout(fingerprintWaitId)
    }
  }, [appState, runPrecheck, fingerprint, fingerprintLoading])

  // Monitor loading completion (3 seconds + precheck done)
  // This effect runs when either the timer needs checking OR when precheckResult arrives
  useEffect(() => {
    if (appState !== 'loading' || !loadingStartTime) return
    
    // If no precheck result yet, do nothing - effect will re-run when precheckResult changes
    if (!precheckResult) {
      console.log('[Loading] Waiting for precheck result...')
      return
    }
    
    const elapsed = Date.now() - loadingStartTime
    
    // If minimum time not yet passed, schedule a check when it will be
    if (elapsed < 3000) {
      const remainingTime = 3000 - elapsed
      console.log('[Loading] Waiting for minimum time, remaining:', remainingTime, 'ms')
      
      const timerId = setTimeout(() => {
        // By this time, precheckResult is available (we checked above)
        // Trigger state transition
        if (precheckResult) {
          processPrecheck(precheckResult)
        }
      }, remainingTime)
      
      return () => clearTimeout(timerId)
    }
    
    // Both conditions met: minimum time passed AND we have precheckResult
    console.log('[Loading] Both conditions met, processing precheck...')
    processPrecheck(precheckResult)
    
  }, [appState, loadingStartTime, precheckResult, processPrecheck])

  // End preview function - defined before timer effect that uses it
  const endPreview = useCallback(async () => {
    // Prevent double-ending
    if (previewEndedRef.current) {
      console.log('[Preview] Already ended, skipping')
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
        console.error('Failed to mark preview as ended:', error)
      }
    }
  }, [broadcastPreviewEnded, isTabLeader, fingerprint])

  // Countdown timer using absolute expiry timestamp
  // ALL tabs run this timer for responsiveness, but only leader saves progress
  useEffect(() => {
    if (appState !== 'preview_active' || !previewExpiresAt) return
    
    console.log('[Timer] Starting timer, expires at:', new Date(previewExpiresAt).toISOString())
    
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
        console.log('[Unload] Not leader - skipping save')
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
    console.log('[Navigation] Changing to section:', section)
    setActiveSection(section)
  }, [])

  // Get the component to render for current section
  const SectionComponent = SECTIONS_MAP[activeSection]

  return (
    <div className="min-h-screen bg-[#050608]">
      {/* Overlay screens - use AnimatePresence without mode="wait" to prevent blocking */}
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
            onComplete={() => {}} // Loading completion handled by useEffect
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
            </main>
          </div>
        </div>
      )}
    </div>
  )
}

