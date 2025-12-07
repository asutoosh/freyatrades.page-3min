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

  // Check if preview already ended (via cookie detection)
  useEffect(() => {
    // Only access localStorage on client side
    if (typeof window === 'undefined') return
    
    // Check local storage for onboarding completed
    const onboardingDone = localStorage.getItem('ft_onboarding_done')
    const previewEndedLocal = localStorage.getItem('ft_preview_ended')
    
    if (previewEndedLocal === '1') {
      setAppState('preview_ended')
      return
    }
    
    // If onboarding was done before but preview not ended, we still show onboarding
    // because the blueprint says everyone sees popups first
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

  // Handle loading screen completion (3 seconds minimum)
  const handleLoadingComplete = useCallback(() => {
    if (!precheckResult) return
    
    if (precheckResult.status === 'blocked') {
      setBlockReason(precheckResult.reason || 'error')
      setAppState('blocked')
    } else {
      // Set preview duration from API
      const duration = precheckResult.previewDuration || 180
      setPreviewDuration(duration)
      setTimeLeft(duration)
      setAppState('preview_active')
    }
  }, [precheckResult])

  // When entering loading state, start the precheck
  useEffect(() => {
    if (appState === 'loading') {
      setLoadingStartTime(Date.now())
      
      runPrecheck().then((result) => {
        setPrecheckResult(result)
      })
    }
  }, [appState, runPrecheck])

  // Monitor loading completion (3 seconds + precheck done)
  useEffect(() => {
    if (appState !== 'loading' || !loadingStartTime || !precheckResult) return
    
    const checkCompletion = () => {
      const elapsed = Date.now() - loadingStartTime
      if (elapsed >= 3000) {
        handleLoadingComplete()
      } else {
        // Wait until 3 seconds pass
        setTimeout(checkCompletion, 3000 - elapsed)
      }
    }
    
    checkCompletion()
  }, [appState, loadingStartTime, precheckResult, handleLoadingComplete])

  // Countdown timer
  useEffect(() => {
    if (appState !== 'preview_active') return
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          // End preview
          endPreview()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [appState])

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

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
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
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-4 md:p-6">
                <CurrentSection />
              </div>
            </main>
          </div>
        </div>
      )}
    </div>
  )
}

