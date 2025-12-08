'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { AppState, SectionKey, BlockReason, PrecheckResponse } from '@/types'

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

  // Run precheck API call
  const runPrecheck = useCallback(async (): Promise<PrecheckResponse> => {
    try {
      const res = await fetch('/api/precheck')
      const data = await res.json()
      return data
    } catch (error) {
      console.error('Precheck failed:', error)
      return { status: 'blocked', reason: 'error' }
    }
  }, [])

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
  const handleLoadingComplete = useCallback(() => {
    // If precheck hasn't completed yet, wait for it
    if (!precheckResult) {
      console.log('[Loading] Waiting for precheck result...')
      // Check again after a short delay
      setTimeout(() => {
        handleLoadingComplete()
      }, 100)
      return
    }
    
    console.log('[Loading] Precheck result received:', precheckResult)
    
    if (precheckResult.status === 'blocked') {
      setBlockReason(precheckResult.reason || 'error')
      setAppState('blocked')
    } else if (precheckResult.status === 'ok') {
      // Set preview duration from API (already accounts for previously consumed time)
      const duration = precheckResult.previewDuration || 180
      setPreviewDuration(duration)
      setTimeLeft(duration)
      setPreviewStartTime(Date.now())
      setAppState('preview_active')
    } else {
      // Unknown status - treat as error
      console.error('[Loading] Unknown precheck status:', precheckResult)
      setBlockReason('error')
      setAppState('blocked')
    }
  }, [precheckResult])

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
  useEffect(() => {
    if (appState !== 'loading' || !loadingStartTime) return
    
    const checkCompletion = () => {
      const elapsed = Date.now() - loadingStartTime
      const minElapsed = elapsed >= 3000
      const hasResult = precheckResult !== null
      
      // Only proceed if both minimum time passed AND precheck completed
      if (minElapsed && hasResult) {
        handleLoadingComplete()
      } else if (minElapsed && !hasResult) {
        // Minimum time passed but precheck still loading - wait a bit more
        console.log('[Loading] Minimum time passed, waiting for precheck...')
        setTimeout(checkCompletion, 200)
      } else {
        // Still need to wait for minimum time
        setTimeout(checkCompletion, 3000 - elapsed)
      }
    }
    
    checkCompletion()
  }, [appState, loadingStartTime, precheckResult, handleLoadingComplete])

  // Countdown timer with 30-second save
  useEffect(() => {
    if (appState !== 'preview_active' || !previewStartTime) return
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        // Calculate how many seconds have elapsed in this session
        const elapsed = Math.floor((Date.now() - previewStartTime) / 1000)
        
        // Save progress at 30 seconds (only once)
        if (elapsed >= 30 && !progressSaved) {
          setProgressSaved(true)
          saveProgress(30, 'threshold')
        }
        
        if (prev <= 1) {
          clearInterval(timer)
          // Save final progress before ending
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
  }, [appState, previewStartTime, progressSaved, saveProgress])

  // End preview function
  const endPreview = async () => {
    setAppState('preview_ended')
    localStorage.setItem('ft_preview_ended', '1')
    
    // Call API to mark preview as used
    try {
      await fetch('/api/endPreview', { method: 'POST' })
    } catch (error) {
      console.error('Failed to mark preview as ended:', error)
    }
  }

  // Save progress on tab close/unload
  useEffect(() => {
    if (appState !== 'preview_active' || !previewStartTime) return
    
    const handleUnload = () => {
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
  }, [appState, previewStartTime])

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    // Set cookie (expires in 10 minutes) - prevents showing pop-ups on refresh
    setOnboardingCookie()
    // Also keep localStorage for backward compatibility
    localStorage.setItem('ft_onboarding_done', '1')
    setAppState('loading')
  }

  // Render current section
  const CurrentSection = SECTIONS_MAP[activeSection]

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
            onComplete={handleLoadingComplete}
            minimumDuration={3000}
          />
        )}

        {/* Blocked Screen */}
        {appState === 'blocked' && blockReason && (
          <BlockedScreen key="blocked" reason={blockReason} />
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
            onChange={setActiveSection}
          />

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Mobile Navigation */}
            <MobileNav
              active={activeSection}
              onChange={setActiveSection}
              timeLeft={timeLeft}
            />

            {/* Desktop Timer Banner */}
            <TimerBanner timeLeft={timeLeft} />

            {/* Content Area */}
            <main className="flex-1 overflow-hidden flex flex-col">
              {/* Money-Glitch section gets full height for chat layout */}
              {activeSection === 'money-glitch' ? (
                <div className="flex-1 overflow-hidden max-w-3xl w-full mx-auto">
                  <CurrentSection />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <div className="max-w-3xl mx-auto p-4 md:p-6">
                    <CurrentSection />
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

