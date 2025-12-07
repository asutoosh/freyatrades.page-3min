'use client'

import { motion } from 'framer-motion'

export default function Welcome() {
  return (
    <div className="space-y-4">
      {/* Message from Freya */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="message-card"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-lg">
            🔥
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">sorcerer</span>
            <span className="admin-badge">admin</span>
            <span className="text-xs text-zinc-500">14:06</span>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 text-zinc-200 leading-relaxed">
          <p className="text-lg">
            <span className="text-blue-400">💼</span> Welcome to Your 3-Day Trial — I'm Freya Quinn
          </p>

          <p>
            Hey, I'm Freya <span>👋</span>
          </p>

          <p>
            I'm a UK-based trader and systems builder.
          </p>

          <p>
            Since you're reading this, you've passed the basic verification and officially entered the trial.
          </p>

          <p>
            Good choice <span>🤩</span>
          </p>

          <div className="pt-4">
            <p className="text-yellow-400 font-semibold">
              <span>🌟</span> A quick note about me
            </p>
            <p className="mt-2">
              I've spent the last few years building an automated, rule-based trading approach —
            </p>
            <p className="mt-2">
              inspired by growing up around structured thinkers (my father worked in quantitative finance for decades).
            </p>
          </div>

          <div className="pt-4">
            <p>
              I'm not here to promise perfection or magic.
            </p>
            <p>
              Markets can't be mastered — only respected.
            </p>
            <p>
              But a disciplined system can beat emotions — and that's exactly what this channel is built on <span>⚙️</span> <span>📊</span>
            </p>
          </div>

          <div className="pt-4">
            <p className="text-orange-400 font-semibold">
              <span>🔥</span> What You'll Get in This 3-Day Trial
            </p>
            <p className="mt-2">
              You'll receive automated signals on major assets:
            </p>
            <ul className="mt-2 space-y-1">
              <li><span>🥇</span> Gold (XAU)</li>
              <li><span>🛢️</span> Oil (USO/WTI)</li>
              <li><span>📈</span> US Indices (DJ30, NAS100)</li>
              <li><span>💱</span> Major Forex pairs</li>
            </ul>
          </div>

          <div className="pt-4 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
            <p className="text-green-400 font-semibold mb-2">
              <span>💎</span> Each signal includes:
            </p>
            <ul className="space-y-1 text-sm">
              <li>• Entry price</li>
              <li>• 4 Take Profit levels (TP1–TP4)</li>
              <li>• Stop Loss</li>
              <li>• Position direction (BUY/SELL)</li>
            </ul>
          </div>

          <p className="pt-4 text-zinc-400 text-sm">
            Take your time, explore the sections, and see for yourself why this approach works.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

