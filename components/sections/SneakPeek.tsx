'use client'

import { motion } from 'framer-motion'

const TRADES = [
  {
    asset: 'XAUUSD',
    date: 'Dec 5, 2024',
    direction: 'BUY',
    entry: '2648.50',
    tp1: '2652.30 ✅',
    tp2: '2655.80 ✅',
    tp3: '2660.20 ✅',
    tp4: '2668.00',
    sl: '2639.00',
    status: 'TP3 Hit',
    profit: '+$585',
  },
  {
    asset: 'USOUSD',
    date: 'Dec 4, 2024',
    direction: 'SELL',
    entry: '68.45',
    tp1: '68.12 ✅',
    tp2: '67.85 ✅',
    tp3: '67.50',
    tp4: '67.00',
    sl: '68.90',
    status: 'TP2 Hit',
    profit: '+$300',
  },
  {
    asset: 'NAS100',
    date: 'Dec 3, 2024',
    direction: 'BUY',
    entry: '21150.00',
    tp1: '21185.00 ✅',
    tp2: '21220.00 ✅',
    tp3: '21280.00 ✅',
    tp4: '21350.00 ✅',
    sl: '21080.00',
    status: 'TP4 Hit',
    profit: '+$1,000',
  },
]

export default function SneakPeek() {
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
            <span>👀</span> Sneak Peek — Real Trade Breakdowns
          </p>
          <p className="text-sm text-zinc-400">
            Here's a look at some recent trades with full entry/exit details
          </p>
        </div>
      </motion.div>

      {/* Trade cards */}
      {TRADES.map((trade, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.15 }}
          className="message-card border-l-4 border-l-green-500"
        >
          {/* Trade header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {trade.asset.includes('XAU') ? '🥇' : trade.asset.includes('USO') ? '🛢️' : '📈'}
              </span>
              <div>
                <div className="font-bold text-white">{trade.asset}</div>
                <div className="text-xs text-zinc-500">{trade.date}</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${
                trade.profit.startsWith('+') ? 'text-green-400' : 'text-red-400'
              }`}>
                {trade.profit}
              </div>
              <div className="text-xs text-green-400">{trade.status}</div>
            </div>
          </div>

          {/* Trade details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">Direction</span>
                <span className={`font-medium ${
                  trade.direction === 'BUY' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {trade.direction} {trade.direction === 'BUY' ? '⬆️' : '⬇️'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Entry</span>
                <span className="text-white font-mono">{trade.entry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Stop Loss</span>
                <span className="text-red-400 font-mono">{trade.sl}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">TP1</span>
                <span className="text-green-400 font-mono text-xs">{trade.tp1}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">TP2</span>
                <span className="text-green-400 font-mono text-xs">{trade.tp2}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">TP3</span>
                <span className="text-green-400 font-mono text-xs">{trade.tp3}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">TP4</span>
                <span className="text-green-400 font-mono text-xs">{trade.tp4}</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

