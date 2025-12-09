'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface LoadingScreenProps {
  minimumDuration?: number
}

const LOADING_MESSAGES = [
  'Securing your live preview...',
  'Verifying access credentials...',
  'Connecting to signal feeds...',
  'Preparing premium content...',
]

export default function LoadingScreen({ minimumDuration = 3000 }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0)
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min((elapsed / minimumDuration) * 100, 100)
      setProgress(newProgress)

      // Change message every 750ms
      const msgIdx = Math.floor(elapsed / 750) % LOADING_MESSAGES.length
      setMessageIndex(msgIdx)

      if (elapsed >= minimumDuration) {
        clearInterval(interval)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [minimumDuration])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#050608]"
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(252, 213, 53, 0.5) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(252, 213, 53, 0.5) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
        
        {/* Radial glow */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 w-full max-w-md px-8">
        {/* Logo/Icon */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/30"
        >
          <span className="text-4xl">💎</span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-center text-white mb-2"
        >
          The Preview Hub
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-zinc-400 text-center mb-8"
        >
          Premium Signals Access
        </motion.p>

        {/* Progress bar container */}
        <div className="relative mb-4">
          {/* Background bar */}
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            {/* Progress fill */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full relative"
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 shimmer-bg" />
            </motion.div>
          </div>
        </div>

        {/* Progress percentage */}
        <div className="flex justify-between text-sm text-zinc-500 mb-6">
          <span>{Math.round(progress)}%</span>
          <span>Initializing...</span>
        </div>

        {/* Status message */}
        <motion.div
          key={messageIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-800">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full"
            />
            <span className="text-zinc-300 text-sm">{LOADING_MESSAGES[messageIndex]}</span>
          </div>
        </motion.div>

        {/* Security badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-4 mt-8 text-xs text-zinc-600"
        >
          <span className="flex items-center gap-1">
            <span>🔒</span> Secure
          </span>
          <span className="flex items-center gap-1">
            <span>⚡</span> Real-time
          </span>
          <span className="flex items-center gap-1">
            <span>🛡️</span> Protected
          </span>
        </motion.div>
      </div>
    </motion.div>
  )
}

