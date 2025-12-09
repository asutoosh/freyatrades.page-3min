'use client'

import { motion } from 'framer-motion'

const REVIEWS = [
  {
    id: 'review-1',
    name: 'Marcus T.',
    avatar: '👨‍💼',
    time: '2 days ago',
    rating: 5,
    review: "I finally understood market sessions properly. Trading only New York session made my chart so much cleaner and my results way more consistent.",
  },
  {
    id: 'review-2',
    name: 'Sarah K.',
    avatar: '👩',
    time: '2 days ago',
    rating: 4,
    review: "Their weekly journal template changed everything for me. Seeing my mistakes written down helped me fix them fast.",
  },
  {
    id: 'review-3',
    name: 'James R.',
    avatar: '🧔',
    time: '3 days ago',
    rating: 5,
    review: "I always struggled with exits. Their partial-close method helped me secure profits without stressing over reversals.",
  },
  {
    id: 'review-4',
    name: 'Emily W.',
    avatar: '👩‍🦰',
    time: '3 days ago',
    rating: 5,
    review: "In the last month, I've avoided every major news trap thanks to their alerts. Saved my account more than once.",
  },
  {
    id: 'review-5',
    name: 'David L.',
    avatar: '👨',
    time: '4 days ago',
    rating: 5,
    review: "I used to scalp, but switching to intraday trading made me way calmer. Their guidance helped me find a style that actually fits me.",
  },
  {
    id: 'review-6',
    name: 'Michael B.',
    avatar: '🧑‍💻',
    time: '4 days ago',
    rating: 4,
    review: "I learned to stop chasing every candle. Waiting for confirmation saved me so many unnecessary losses this week.",
  },
  {
    id: 'review-7',
    name: 'Jessica M.',
    avatar: '👩‍💼',
    time: '5 days ago',
    rating: 5,
    review: "Before this, my charts were overloaded. Now I trade with two lines and a zone — simple and effective.",
  },
  {
    id: 'review-8',
    name: 'Chris P.',
    avatar: '👨‍🦱',
    time: '5 days ago',
    rating: 5,
    review: "I never understood liquidity until they explained it in plain English. Now I know exactly why I kept getting stopped out.",
  },
  {
    id: 'review-9',
    name: 'Amanda H.',
    avatar: '👱‍♀️',
    time: '6 days ago',
    rating: 5,
    review: "What surprised me most was how much psychology matters. Their mindset tips helped me stop revenge trading.",
  },
  {
    id: 'review-10',
    name: 'Ryan S.',
    avatar: '🧔‍♂️',
    time: '6 days ago',
    rating: 5,
    review: "I finally passed my funded account evaluation after organizing my trades with their session planner. It helped me stop random entries.",
  },
  {
    id: 'review-11',
    name: 'Kevin D.',
    avatar: '👨‍🔬',
    time: '1 week ago',
    rating: 4,
    review: "The risk-to-reward method they teach is actually realistic. Not everything needs to be a 1:5 — smaller wins added up fast.",
  },
  {
    id: 'review-12',
    name: 'Nicole F.',
    avatar: '👩‍🎤',
    time: '1 week ago',
    rating: 5,
    review: "I used to panic when trades went against me. Their patience rule helped me trust my analysis instead of closing early.",
  },
  {
    id: 'review-13',
    name: 'Brandon C.',
    avatar: '💪',
    time: '1 week ago',
    rating: 5,
    review: "I recovered 30% of my previous losses in the last 13 days just by removing counter-trend trades. It changed my whole equity curve.",
  },
  {
    id: 'review-14',
    name: 'Lisa G.',
    avatar: '👩‍🏫',
    time: '1 week ago',
    rating: 4,
    review: "The community feedback helped me fix my bias problem. I don't force trades anymore.",
  },
  {
    id: 'review-15',
    name: 'Daniel A.',
    avatar: '🎯',
    time: '8 days ago',
    rating: 5,
    review: "Their weekly gold analysis is insanely accurate. Helped me avoid two fake breakouts last week.",
  },
  {
    id: 'review-16',
    name: 'Rachel N.',
    avatar: '👩‍💻',
    time: '9 days ago',
    rating: 5,
    review: "I finally learned how to set proper stop-loss levels. No more random placements — everything has logic now.",
  },
  {
    id: 'review-17',
    name: 'Tyler J.',
    avatar: '🚀',
    time: '9 days ago',
    rating: 5,
    review: "I didn't realize I was risking too much until they showed me proper lot sizing. No wonder I kept blowing accounts.",
  },
  {
    id: 'review-18',
    name: 'Megan O.',
    avatar: '💎',
    time: '10 days ago',
    rating: 4,
    review: "I improved my discipline by trading only two pairs. Their advice to 'master your pair' really works.",
  },
  {
    id: 'review-19',
    name: 'Andrew V.',
    avatar: '📈',
    time: '10 days ago',
    rating: 5,
    review: "The London open volatility used to scare me. Their strategy helped me enter after the manipulation instead of during it.",
  },
  {
    id: 'review-20',
    name: 'Stephanie E.',
    avatar: '⭐',
    time: '11 days ago',
    rating: 5,
    review: "I've been profitable three weeks in a row for the first time ever. Their structure and clarity made all the difference.",
  },
  {
    id: 'review-21',
    name: 'Jason W.',
    avatar: '🏆',
    time: '11 days ago',
    rating: 5,
    review: "I stopped trading out of boredom thanks to their rule of 'no setup, no trade.' Surprisingly, my win rate improved instantly.",
  },
  {
    id: 'review-22',
    name: 'Olivia Z.',
    avatar: '👩‍🚀',
    time: '12 days ago',
    rating: 4,
    review: "I used to ignore higher timeframes. Now I start every day with them and my entries make so much more sense.",
  },
  {
    id: 'review-23',
    name: 'Nathan Q.',
    avatar: '🛡️',
    time: '12 days ago',
    rating: 5,
    review: "The break-even technique they taught saved me during a fakeout yesterday. I kept the trade safe without giving it up too early.",
  },
  {
    id: 'review-24',
    name: 'Hannah Y.',
    avatar: '🌟',
    time: '13 days ago',
    rating: 5,
    review: "I finally learned not to switch strategies every week. Sticking to one plan made me way more confident.",
  },
  {
    id: 'review-25',
    name: 'Ethan U.',
    avatar: '📊',
    time: '13 days ago',
    rating: 5,
    review: "Backtesting sessions taught me more than any YouTube video ever did. I finally understand patterns instead of guessing.",
  },
  {
    id: 'review-26',
    name: 'Victoria I.',
    avatar: '💰',
    time: '2 weeks ago',
    rating: 5,
    review: "I cleared my funded account challenge on the second attempt! One solid trade a day beats ten random ones — their rule works.",
  },
  {
    id: 'review-27',
    name: 'Samuel X.',
    avatar: '📝',
    time: '2 weeks ago',
    rating: 5,
    review: "Their emphasis on journaling wins AND losses helped me recognize my strongest setups. Now I only take those.",
  },
  {
    id: 'review-28',
    name: 'Grace T.',
    avatar: '⏰',
    time: '2 weeks ago',
    rating: 5,
    review: "I used to enter late. Learning timing and patience helped me catch clean moves instead of chasing spikes.",
  },
  {
    id: 'review-29',
    name: 'William K.',
    avatar: '🧠',
    time: '2 weeks ago',
    rating: 5,
    review: "Their explanation of market makers helped me stop blaming the broker. Now I actually understand the moves.",
  },
  {
    id: 'review-30',
    name: 'Sophia R.',
    avatar: '🎖️',
    time: '2 weeks ago',
    rating: 5,
    review: "My biggest improvement came from removing emotions. Their daily reminder to trade the plan, not the feeling, finally clicked.",
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
            <span>⭐</span> Member Reviews
          </p>
          <p className="text-sm text-zinc-400">
            Real feedback from {REVIEWS.length} traders in our community
          </p>
        </div>
      </motion.div>

      {/* Reviews list */}
      {REVIEWS.map((review, index) => (
        <motion.div
          key={review.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(index * 0.05, 0.5) }}
          className="message-card"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xl shrink-0">
              {review.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
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
        transition={{ delay: 0.6 }}
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
