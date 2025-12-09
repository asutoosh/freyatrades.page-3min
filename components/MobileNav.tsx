'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SectionKey } from '@/types'
import { SECTIONS, EXTERNAL_LINKS } from '@/lib/constants'

interface MobileNavProps {
  active: SectionKey
  onChange: (section: SectionKey) => void
  timeLeft: number
  memberCount?: number
}

export default function MobileNav({ active, onChange, timeLeft, memberCount = 158 }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const lastClickRef = useRef<number>(0)
  const DEBOUNCE_MS = 300
  
  const handleSectionClick = useCallback((section: SectionKey) => {
    const now = Date.now()
    if (now - lastClickRef.current < DEBOUNCE_MS) return
    lastClickRef.current = now
    onChange(section)
    setIsOpen(false)
  }, [onChange])
  
  const activeSection = SECTIONS.find(s => s.id === active)
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    } else {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }, [isOpen])

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-30 bg-[#0a0a0b]/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Menu button - larger touch area for mobile */}
          <button
            onClick={() => setIsOpen(true)}
            className="p-3 -ml-3 text-zinc-400 hover:text-white active:text-white transition-colors touch-manipulation"
            style={{ touchAction: 'manipulation' }}
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Current section */}
          <div className="flex items-center gap-2">
            <span>{activeSection?.icon}</span>
            <span className="font-semibold text-white">{activeSection?.label}</span>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
            <span className="text-yellow-400">⏱️</span>
            <span className="font-mono text-sm text-white">{timeString}</span>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="md:hidden fixed inset-y-0 left-0 z-50 w-80 bg-[#0a0a0b] border-r border-white/5 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <div>
                  <h1 className="text-lg font-bold text-white">The Preview Hub</h1>
                  <p className="text-sm text-zinc-500">{memberCount} members</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => handleSectionClick(section.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all cursor-pointer select-none active:scale-[0.98]
                      ${active === section.id 
                        ? 'bg-zinc-800/80 text-white' 
                        : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
                      }
                    `}
                  >
                    <span className="text-xl">{section.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium ${active === section.id ? 'text-white' : ''}`}>
                        {section.label}
                      </div>
                      <div className="text-xs text-zinc-500 truncate">{section.subtitle}</div>
                    </div>
                    {section.id === 'money-glitch' && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                    )}
                  </button>
                ))}
              </nav>

              {/* CTA Button */}
              <div className="p-4 border-t border-white/5">
                <motion.a
                  href={EXTERNAL_LINKS.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold"
                >
                  <span>📅</span>
                  Join 3-Day Trial
                </motion.a>
                <p className="text-center text-xs text-zinc-600 mt-2">
                  Free access • No credit card
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

