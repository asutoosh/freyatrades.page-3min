'use client'

import { motion } from 'framer-motion'
import { EXTERNAL_LINKS } from '@/lib/constants'

interface TrialPopupProps {
  onClose: () => void
}

export default function TrialPopup({ onClose }: TrialPopupProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 20, scale: 0.95 }}
        className="bg-gradient-to-b from-[#141418] to-[#0f0f12] rounded-2xl border border-white/10 p-6 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          {/* Header */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <span className="text-4xl">🔥</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Join Our 3-Day Trial
          </h3>
          <p className="text-zinc-400 text-sm mb-6">
            Get full access to premium signals. Choose your preferred platform:
          </p>

          {/* Telegram Button */}
          <a
            href={EXTERNAL_LINKS.telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#229ed9] text-white font-bold hover:bg-[#1e8dc2] transition-colors mb-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            Join via Telegram
          </a>

          {/* Whop Button */}
          <a
            href={EXTERNAL_LINKS.whop}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold hover:from-yellow-300 hover:to-yellow-400 transition-all"
          >
            <span>🎯</span>
            Join via Whop
          </a>

          {/* Dismiss */}
          <button
            onClick={onClose}
            className="w-full mt-4 py-2 text-zinc-500 text-sm hover:text-white transition-colors"
          >
            Maybe later
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
