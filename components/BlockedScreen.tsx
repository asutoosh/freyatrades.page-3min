'use client'

import { motion } from 'framer-motion'
import { BlockReason } from '@/types'
import { EXTERNAL_LINKS } from '@/lib/constants'

interface BlockedScreenProps {
  reason: BlockReason
}

const BLOCK_MESSAGES: Record<BlockReason, { title: string; message: string; icon: string }> = {
  vpn_detected: {
    title: 'VPN/Proxy Detected',
    message: 'Please turn off your VPN or proxy and reload this page to access the live premium signals preview.',
    icon: '🔒',
  },
  vpn_max_retries: {
    title: 'Maximum Attempts Reached',
    message: "You've reached the maximum VPN detection attempts in the last 2 hours. Please try again later without a VPN.",
    icon: '⏰',
  },
  restricted_country: {
    title: 'Region Restricted',
    message: "We're sorry, but we don't currently provide service in your region. You can still join our community through other channels.",
    icon: '🌍',
  },
  preview_used: {
    title: 'Preview Already Used',
    message: "Your preview session was already used on this device/IP. Ready for more? Join our 3-Day Trial to continue accessing premium signals.",
    icon: '✅',
  },
  error: {
    title: 'Something Went Wrong',
    message: 'We encountered an error while verifying your access. Please try again later.',
    icon: '⚠️',
  },
}

export default function BlockedScreen({ reason }: BlockedScreenProps) {
  const content = BLOCK_MESSAGES[reason] || BLOCK_MESSAGES.error

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#050608] px-4"
    >
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="relative max-w-md w-full"
      >
        <div className="bg-gradient-to-b from-[#141418] to-[#0f0f12] rounded-2xl border border-white/10 overflow-hidden">
          {/* Top border accent */}
          <div className="h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

          <div className="p-8">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-zinc-800/50 flex items-center justify-center text-4xl"
            >
              {content.icon}
            </motion.div>

            {/* Title */}
            <h2 className="text-xl font-bold text-center text-white mb-3">
              {content.title}
            </h2>

            {/* Message */}
            <p className="text-zinc-400 text-center mb-8 leading-relaxed">
              {content.message}
            </p>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href={EXTERNAL_LINKS.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#229ed9] text-white font-semibold hover:bg-[#1e8dc2] transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
                Join 3-Day Trial on Telegram
              </motion.a>

              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href={EXTERNAL_LINKS.whop}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-semibold hover:from-yellow-300 hover:to-yellow-400 transition-all"
              >
                🎯 Join 3-Day Trial via Whop
              </motion.a>

              <a
                href={EXTERNAL_LINKS.innerCircle}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors pt-2"
              >
                Ready for full access? → Inner Circle
              </a>
            </div>

            {/* Retry button for VPN */}
            {reason === 'vpn_detected' && (
              <button
                onClick={() => window.location.reload()}
                className="w-full mt-4 py-2 text-zinc-500 text-sm hover:text-white transition-colors"
              >
                I turned off my VPN — Retry
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

