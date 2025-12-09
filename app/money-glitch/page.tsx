'use client'

import { useState, useEffect, useCallback } from 'react'
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
  // State
  const [appState, setAppState] = useState<AppState>('onboarding')
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [blockReason, setBlockReason] = useState<BlockReason | null>(null)
  const [activeSection, setActiveSection] = useState<SectionKey>('money-glitch')
  const [timeLeft, setTimeLeft] = useState(180) // 3 minutes
  const [previewDuration, setPreviewDuration] = useState(180)
  const [precheckResult, setPrecheckResult] = useState<PrecheckResponse | null>(null)
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null)
  const [progressSaved, setProgressSaved] = useState(false) // Track if 30-second save was made
  const [previewStartTime, setPreviewStartTime] = useState<number | null>(null) // When preview started
  const [isTabLeader, setIsTabLeader] = useState(true) // Is this tab the leader for timer?
  
  // Get browser fingerprint for anti-bypass protection
  const { visitorId: fingerprint } = useFingerprint()

  // End preview function (defined early for useTabSync)
  const endPreviewCallback = useCallback(() => {
    setAppState('preview_ended')
    localStorage.setItem('ft_preview_ended', '1')
  }, [])

  // Stable callback for setting time from number value
  const setTimeLeftDirect = useCallback((time: number) => {
    setTimeLeft(time)
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

  // Multi-tab synchronization - only leader tab runs timer and saves progress
  const { isLeader, broadcastPreviewEnded, broadcastProgressSaved } = useTabSync({
    timeLeft,
    setTimeLeft: setTimeLeftDirect,
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
      setAppState('preview_ended')
      return
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
    console.log('[Loading] Processing precheck result:', result)
    
    if (result.status === 'blocked') {
      setBlockReason(result.reason || 'error')
      setAppState('blocked')
    } else if (result.status === 'ok') {
      // Set preview duration from API (already accounts for previously consumed time)
      const duration = result.previewDuration || 180
      setPreviewDuration(duration)
      setTimeLeft(duration)
      setPreviewStartTime(Date.now())
      setAppState('preview_active')
    } else {
      // Unknown status - treat as error
      console.error('[Loading] Unknown precheck status:', result)
      setBlockReason('error')
      setAppState('blocked')
    }
  }, [])

  // When entering loading state, start the precheck
  useEffect(() => {
    if (appState === 'loading') {
      setLoadingStartTime(Date.now())
      setPrecheckResult(null) // Reset previous result
      
      let precheckCompleted = false
      
      // Set a timeout fallback in case precheck fails (10 seconds max wait)
      const timeoutId = setTimeout(() => {
        if (!precheckCompleted) {
          console.error('[Loading] Precheck timeout - treating as error')
          precheckCompleted = true
          setPrecheckResult({ status: 'blocked', reason: 'error' })
        }
      }, 10000)
      
      runPrecheck()
        .then((result) => {
          if (!precheckCompleted) {
            precheckCompleted = true
            clearTimeout(timeoutId)
            setPrecheckResult(result)
          }
        })
        .catch((error) => {
          if (!precheckCompleted) {
            precheckCompleted = true
            clearTimeout(timeoutId)
            console.error('[Loading] Precheck failed:', error)
            setPrecheckResult({ status: 'blocked', reason: 'error' })
          }
        })
      
      return () => {
        clearTimeout(timeoutId)
        precheckCompleted = true
      }
    }
  }, [appState, runPrecheck])

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

  // Countdown timer with 30-second save (only leader tab runs this)
  useEffect(() => {
    if (appState !== 'preview_active' || !previewStartTime) return
    // Only leader tab runs the timer countdown and saves progress
    if (!isTabLeader) {
      console.log('[Timer] Not leader - skipping timer logic')
      return
    }
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        // Calculate how many seconds have elapsed in this session
        const elapsed = Math.floor((Date.now() - previewStartTime) / 1000)
        
        // Save progress at 30 seconds (only once, only leader)
        if (elapsed >= 30 && !progressSaved) {
          setProgressSaved(true)
          saveProgress(30, 'threshold')
          broadcastProgressSaved()
        }
        
        if (prev <= 1) {
          clearInterval(timer)
          // Save final progress before ending (only leader)
          const finalElapsed = Math.floor((Date.now() - previewStartTime) / 1000)
          saveProgress(finalElapsed, 'unload')
          // End preview
          endPreview()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [appState, previewStartTime, progressSaved, saveProgress, isTabLeader, broadcastProgressSaved])

  // End preview function
  const endPreview = async () => {
    setAppState('preview_ended')
    localStorage.setItem('ft_preview_ended', '1')
    
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
  }

  // Save progress on tab close/unload (only leader saves)
  useEffect(() => {
    if (appState !== 'preview_active' || !previewStartTime) return
    
    const handleUnload = () => {
      // Only leader tab saves progress on unload to prevent double-counting
      if (!isTabLeader) {
        console.log('[Unload] Not leader - skipping save')
        return
      }
      
      // Calculate elapsed time
      const elapsed = Math.floor((Date.now() - previewStartTime) / 1000)
      
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
  }, [appState, previewStartTime, isTabLeader])

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
      <AnimatePresence mode="wait">
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
                <div key={`section-${activeSection}`} className="flex-1 min-h-0 flex flex-col max-w-3xl w-full mx-auto">
                  <SectionComponent key={activeSection} />
                </div>
              ) : (
                <div key={`section-${activeSection}`} className="flex-1 overflow-y-auto overscroll-contain">
                  <div className="max-w-3xl mx-auto p-4 md:p-6">
                    <SectionComponent key={activeSection} />
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

