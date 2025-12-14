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
          <img 
            src="/favicon.jpg" 
            alt="Freya Quinn" 
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">Freya Quinn</span>
            <span className="admin-badge">admin</span>
            <span className="text-xs text-zinc-500">14:06</span>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 text-zinc-200 leading-relaxed">
          <p className="text-lg">
            <span>👋</span> Welcome
          </p>

          <p>
            Hey, I'm Freya <span>👋</span>
          </p>

          <p>
            A UK-based trader and systems builder.
          </p>

          <p>
            If you're reading this, you're officially inside — welcome.
          </p>

          <p>
            This space is built for traders who value structure over hype and discipline over emotion. No gimmicks. No magic promises. Just a clear, rule-based approach to navigating the markets.
          </p>

          <p>
            Good choice <span>😌</span>
          </p>

          <div className="pt-4">
            <p className="text-yellow-400 font-semibold">
              <span>🌻</span> A Quick Note About Me
            </p>
            <p className="mt-2">
              Over the past few years, I've focused on building an automated, rules-driven trading framework — shaped by growing up around structured thinkers. (My father worked in quantitative finance for decades, so systems and probabilities were part of everyday conversation.)
            </p>
            <p className="mt-2">
              I don't believe markets can be mastered — only respected.
            </p>
            <p className="mt-2">
              But I do believe a well-designed system can outperform emotion, impulse, and guesswork. That's exactly what this channel is built on <span>⚙️</span>
            </p>
          </div>

          <div className="pt-4">
            <p className="text-blue-400 font-semibold">
              <span>📊</span> What You'll Find Here
            </p>
            <p className="mt-2">
              Inside this space, you'll get:
            </p>
            <ul className="mt-2 space-y-1 text-zinc-300">
              <li>• Rule-based trading signals on major assets</li>
              <li>• Clear execution logic — no vague entries or emotional calls</li>
              <li>• Risk-aware setups designed for consistency, not adrenaline</li>
              <li>• A mindset focused on process over outcomes</li>
            </ul>
            <p className="mt-3">
              This is not about chasing every move. It's about showing up, following rules, and letting probabilities do the work.
            </p>
          </div>

          <div className="pt-4 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
            <p className="text-orange-400 font-semibold mb-2">
              <span>🔥</span> Final Note
            </p>
            <p>
              If you're looking for guarantees, this won't be for you. If you're looking for clarity, structure, and discipline — you're in the right place.
            </p>
            <p className="mt-2">
              Let's trade with intention. <span>📈</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
