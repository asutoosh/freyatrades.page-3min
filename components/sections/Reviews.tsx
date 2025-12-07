'use client'

import { motion } from 'framer-motion'

const REVIEWS = [
  {
    name: 'TraderMike',
    avatar: '🧔',
    time: '2 days ago',
    rating: 5,
    review: "Been following Freya's signals for 2 weeks now. Hit TP3 on gold twice this week alone. The risk management is next level.",
  },
  {
    name: 'CryptoSarah',
    avatar: '👩',
    time: '3 days ago',
    rating: 5,
    review: "Finally found a signal provider that actually explains the logic. Not just random calls. The system makes sense and the results speak for themselves.",
  },
  {
    name: 'ForexKing_UK',
    avatar: '👑',
    time: '5 days ago',
    rating: 5,
    review: "80% win rate is no joke. I was skeptical but the trial convinced me. Now in the inner circle. Best decision I made this year.",
  },
  {
    name: 'newbie_trader22',
    avatar: '🚀',
    time: '1 week ago',
    rating: 4,
    review: "Started trading 6 months ago and lost money with other groups. This is different. Clear entries, clear exits, no BS. Up 12% this month.",
  },
  {
    name: 'OilBaron',
    avatar: '🛢️',
    time: '1 week ago',
    rating: 5,
    review: "The USO signals are insane. Caught a 200 pip move last Thursday. Worth every penny of the subscription.",
  },
]

export default function Reviews() {
  return (
    <div className="space-y-4">
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
            <span className="text-xs text-zinc-500">14:42</span>
          </div>
        </div>

        <div className="space-y-4 text-zinc-200">
          <p className="text-lg font-semibold">
            <span>⭐</span> Member Reviews
          </p>
          <p className="text-sm text-zinc-400">
            Real feedback from real traders in our community
          </p>
        </div>
      </motion.div>

      {/* Reviews list */}
      {REVIEWS.map((review, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="message-card"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xl">
              {review.avatar}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-white">{review.name}</span>
                <span className="text-xs text-zinc-500">{review.time}</span>
              </div>
              
              {/* Stars */}
              <div className="flex gap-0.5 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < review.rating ? 'text-yellow-400' : 'text-zinc-700'}>
                    ★
                  </span>
                ))}
              </div>
              
              <p className="text-zinc-300 text-sm leading-relaxed">
                "{review.review}"
              </p>
            </div>
          </div>
        </motion.div>
      ))}

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 text-center"
      >
        <p className="text-yellow-400 font-medium mb-2">
          💬 Join 150+ traders in the Inner Circle
        </p>
        <p className="text-xs text-zinc-400">
          Be part of a community that actually wins
        </p>
      </motion.div>
    </div>
  )
}

