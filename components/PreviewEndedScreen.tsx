'use client'

import { motion } from 'framer-motion'
import { EXTERNAL_LINKS } from '@/lib/constants'

export default function PreviewEndedScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#050608]/95 backdrop-blur-sm px-4"
    >
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-3xl"
        />
      </div>

      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="relative max-w-lg w-full"
      >
        <div className="bg-gradient-to-b from-[#141418] to-[#0f0f12] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Top accent */}
          <div className="h-1.5 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />

          <div className="p-8 text-center">
            {/* Animated icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', damping: 15 }}
              className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 flex items-center justify-center"
            >
              <span className="text-5xl">⏱️</span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white mb-2"
            >
              Your Preview Has Ended
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-zinc-400 mb-6"
            >
              You just experienced what our members see daily
            </motion.p>

            {/* Stats highlight */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 mb-6"
            >
              <div>
                <div className="text-2xl font-bold text-yellow-400">80%</div>
                <div className="text-xs text-zinc-500">Win Rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">4x</div>
                <div className="text-xs text-zinc-500">Take Profits</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">24/7</div>
                <div className="text-xs text-zinc-500">Signals</div>
              </div>
            </motion.div>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-zinc-300 text-sm mb-8 leading-relaxed"
            >
              Those were <span className="text-yellow-400 font-semibold">REAL premium signals</span> — 
              not a demo. Ready to catch the next one? Join our 3-Day Trial and keep the momentum going.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="space-y-3"
            >
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href={EXTERNAL_LINKS.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-[#229ed9] text-white font-bold text-lg hover:bg-[#1e8dc2] transition-colors shadow-lg shadow-blue-500/20"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
                Join 3-Day Trial (Telegram)
              </motion.a>

              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href={EXTERNAL_LINKS.whop}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold text-lg hover:from-yellow-300 hover:to-yellow-400 transition-all shadow-lg shadow-yellow-500/20"
              >
                🎯 Join 3-Day Trial (Whop)
              </motion.a>

              <div className="pt-2">
                <a
                  href={EXTERNAL_LINKS.innerCircle}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-zinc-400 hover:text-yellow-400 transition-colors text-sm"
                >
                  <span>💎</span>
                  Skip straight to Inner Circle — Full Access
                  <span>→</span>
                </a>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-zinc-600 text-xs mt-4"
        >
          Free access • No credit card required for trial
        </motion.p>
      </motion.div>
    </motion.div>
  )
}

