'use client'

import { motion } from 'framer-motion'

interface TimerBannerProps {
  timeLeft: number
}

export default function TimerBanner({ timeLeft }: TimerBannerProps) {
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`
  
  // Calculate progress (180 seconds = 100%)
  const totalDuration = 180
  const progress = (timeLeft / totalDuration) * 100
  
  // Color changes based on time
  const isUrgent = timeLeft <= 30
  const isWarning = timeLeft <= 60 && !isUrgent
  
  // Accessible time announcement
  const timeAnnouncement = `${minutes} minute${minutes !== 1 ? 's' : ''} and ${seconds} second${seconds !== 1 ? 's' : ''} remaining`

  return (
    <div className="hidden md:block sticky top-0 z-20 bg-[#0a0a0b]/95 backdrop-blur-sm border-b border-white/5">
      {/* Progress bar */}
      <div className="h-0.5 bg-zinc-800">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          className={`h-full transition-colors duration-500 ${
            isUrgent 
              ? 'bg-red-500' 
              : isWarning 
                ? 'bg-orange-500' 
                : 'bg-gradient-to-r from-yellow-400 to-yellow-500'
          }`}
        />
      </div>
      
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="text-lg">🔴</span>
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          </div>
          <div>
            <span className="text-sm font-medium text-white">Live Premium Signals Preview</span>
            <span className="text-xs text-zinc-500 ml-2">• 3-minute access window</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Urgency message */}
          {isUrgent && (
            <motion.span
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm text-red-400 font-medium"
            >
              Almost over!
            </motion.span>
          )}
          
          {/* Timer */}
          <div 
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
              ${isUrgent 
                ? 'bg-red-500/20 border border-red-500/30' 
                : isWarning 
                  ? 'bg-orange-500/20 border border-orange-500/30' 
                  : 'bg-zinc-900 border border-zinc-800'
              }
            `}
            role="timer"
            aria-live="polite"
            aria-atomic="true"
            aria-label={timeAnnouncement}
          >
            <span className={isUrgent ? 'text-red-400' : isWarning ? 'text-orange-400' : 'text-yellow-400'} aria-hidden="true">
              ⏱️
            </span>
            <span 
              className={`
                font-mono text-lg font-bold
                ${isUrgent ? 'text-red-400' : isWarning ? 'text-orange-400' : 'text-white'}
              `}
              aria-hidden="true"
            >
              {timeString}
            </span>
            <span className="sr-only">{timeAnnouncement}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

