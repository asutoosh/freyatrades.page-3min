'use client'

import { motion } from 'framer-motion'

const RESULTS = [
  { asset: 'XAUUSD', entry: '2645.50', exit: 'TP3', pips: '+127', profit: '+$635', status: 'win' },
  { asset: 'DJI30', entry: '44892.00', exit: 'TP2', pips: '+185', profit: '+$370', status: 'win' },
  { asset: 'USOUSD', entry: '69.24', exit: 'TP4', pips: '+98', profit: '+$490', status: 'win' },
  { asset: 'NAS100', entry: '21205.50', exit: 'SL', pips: '-45', profit: '-$225', status: 'loss' },
  { asset: 'XAUUSD', entry: '2658.20', exit: 'TP2', pips: '+89', profit: '+$445', status: 'win' },
  { asset: 'EURUSD', entry: '1.0542', exit: 'TP1', pips: '+32', profit: '+$160', status: 'win' },
]

export default function LiveResults() {
  const wins = RESULTS.filter(r => r.status === 'win').length
  const total = RESULTS.length
  const winRate = Math.round((wins / total) * 100)

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

        <div className="space-y-6 text-zinc-200">
          <p className="text-lg font-semibold">
            <span>📊</span> Live Results — Recent Performance
          </p>

          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
              <div className="text-2xl font-bold text-green-400">{winRate}%</div>
              <div className="text-xs text-zinc-500">Win Rate</div>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
              <div className="text-2xl font-bold text-blue-400">{total}</div>
              <div className="text-xs text-zinc-500">Signals</div>
            </div>
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
              <div className="text-2xl font-bold text-yellow-400">+$1,875</div>
              <div className="text-xs text-zinc-500">Net Profit</div>
            </div>
          </div>

          {/* Results table */}
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900/50">
                  <th className="px-4 py-3 text-left text-zinc-400 font-medium">Asset</th>
                  <th className="px-4 py-3 text-left text-zinc-400 font-medium">Entry</th>
                  <th className="px-4 py-3 text-left text-zinc-400 font-medium">Exit</th>
                  <th className="px-4 py-3 text-right text-zinc-400 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {RESULTS.map((result, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-zinc-900/30"
                  >
                    <td className="px-4 py-3 font-medium text-white">{result.asset}</td>
                    <td className="px-4 py-3 text-zinc-400">{result.entry}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        result.status === 'win' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {result.exit}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-medium ${
                      result.status === 'win' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {result.profit}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-zinc-500 text-center">
            * Results based on $50/pip standard lot sizing. Past performance doesn't guarantee future results.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

