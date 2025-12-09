'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const FAQS = [
  {
    q: "What's included in the 3-Day Trial?",
    a: "Full access to all premium signals including Gold (XAU), Oil (WTI), Indices (US30, NAS100, GER40, SPX500), Forex pairs (EUR/USD, GBP/USD, USD/JPY, GBP/JPY, AUD/USD), Crypto (BTC, ETH), and US Stocks (TSLA, NVDA, AAPL). You'll receive the exact same signals as our paying members — entry price, 4 take profit levels, and stop loss.",
  },
  {
    q: "How are signals delivered?",
    a: "Signals are posted automatically to our Telegram channel or Whop community as soon as they're generated. You'll get a notification with all the details you need to place the trade.",
  },
  {
    q: "What's the average win rate?",
    a: "Our system maintains an 80% win rate across all signals. We focus on high-probability setups with strict risk management, which is why we include 4 TP levels to lock in profits along the way.",
  },
  {
    q: "Do I need trading experience?",
    a: "Basic knowledge helps, but each signal comes with clear instructions. We also have guides in the Welcome section to help you understand position sizing and risk management.",
  },
  {
    q: "What's the difference between Trial and Inner Circle?",
    a: "The Trial gives you 3 days of signal access. Inner Circle members get lifetime access, priority support, exclusive analysis breakdowns, and early access to new trading strategies.",
  },
  {
    q: "Can I use these signals with any broker?",
    a: "Yes! Our signals work with any broker that offers the assets we trade. Most popular brokers like IC Markets, Pepperstone, OANDA, and others are compatible.",
  },
  {
    q: "What if I miss a signal?",
    a: "Signals are time-sensitive, but we always include valid price ranges. If price hasn't moved significantly from the entry, you can still take the trade. Each signal also shows whether it's still active or closed.",
  },
  {
    q: "Is there a money-back guarantee?",
    a: "The 3-Day Trial is completely free — no credit card required. For Inner Circle, we're confident in our system, but we recommend using the trial to see if our style matches your trading.",
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="message-card"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <img 
            src="/favicon.jpg" 
            alt="Freya Quinn" 
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">Freya Quinn</span>
            <span className="admin-badge">admin</span>
            <span className="text-xs text-zinc-500">14:42</span>
          </div>
        </div>

        <div className="space-y-4 text-zinc-200">
          <p className="text-lg font-semibold">
            <span>❓</span> Frequently Asked Questions
          </p>
          <p className="text-sm text-zinc-400">
            Got questions? We've got answers.
          </p>
        </div>
      </motion.div>

      {/* FAQ items */}
      <div className="space-y-2">
        {FAQS.map((faq, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-xl border border-zinc-800 overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-900/50 transition-colors"
            >
              <span className="font-medium text-white pr-4">{faq.q}</span>
              <motion.span
                animate={{ rotate: openIndex === index ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-zinc-500 flex-shrink-0"
              >
                ▼
              </motion.span>
            </button>
            
            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 text-sm text-zinc-400 leading-relaxed">
                    {faq.a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Still have questions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center"
      >
        <p className="text-zinc-400 text-sm mb-2">
          Still have questions?
        </p>
        <p className="text-white text-sm">
          DM <span className="text-yellow-400">@freyatrades</span> on Telegram
        </p>
      </motion.div>
    </div>
  )
}

