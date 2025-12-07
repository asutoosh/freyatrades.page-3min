'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface Signal {
  id: string
  type: 'signal' | 'update'
  script: string
  position?: 'BUY' | 'SELL'
  entryPrice?: string
  tp1?: string
  tp2?: string
  tp3?: string
  tp4?: string
  stopLoss?: string
  updateType?: 'tp' | 'sl'
  tpLevel?: number
  hitPrice?: string
  signalDirection?: 'Long' | 'Short'
  timestamp: string
  color: 'green' | 'red' | 'default'
}

export default function MoneyGlitch() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSignals = async () => {
    try {
      const res = await fetch('/api/signals')
      const data = await res.json()
      setSignals(data.signals || [])
    } catch (error) {
      console.error('Failed to fetch signals:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSignals()
    
    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchSignals, 15000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="message-card animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-zinc-800" />
              <div className="h-4 w-24 bg-zinc-800 rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-zinc-800 rounded" />
              <div className="h-4 w-48 bg-zinc-800 rounded" />
              <div className="h-4 w-40 bg-zinc-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Live indicator */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 mb-6">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <span className="text-green-400 text-sm font-medium">Live Signals Feed</span>
        <span className="text-zinc-500 text-xs ml-auto">Auto-refreshes</span>
      </div>

      {signals.map((signal, index) => (
        <motion.div
          key={signal.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`message-card ${
            signal.color === 'green' 
              ? 'border-l-4 border-l-green-500 bg-green-500/5' 
              : signal.color === 'red' 
                ? 'border-l-4 border-l-red-500 bg-red-500/5'
                : 'hover:border-yellow-500/20'
          }`}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              signal.color === 'green' 
                ? 'bg-gradient-to-br from-green-400 to-green-600'
                : signal.color === 'red'
                  ? 'bg-gradient-to-br from-red-400 to-red-600'
                  : 'bg-gradient-to-br from-orange-400 to-red-600'
            }`}>
              <span className="text-lg">
                {signal.color === 'green' ? '✅' : signal.color === 'red' ? '❌' : '🔥'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">sorcerer</span>
              <span className="admin-badge">admin</span>
              <span className="text-xs text-zinc-500">
                {new Date(signal.timestamp).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                })}
              </span>
            </div>
          </div>

          {/* Content based on type */}
          {signal.type === 'signal' ? (
            // New Signal Card
            <div className="space-y-1.5 font-mono text-sm">
              <p className="text-zinc-300">
                script         : <span className="text-white font-semibold">{signal.script}</span>
              </p>
              <p className="text-zinc-300">
                Position       : 
                <span className={`ml-1 font-bold ${signal.position === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                  {signal.position} {signal.position === 'BUY' ? '⬆️' : '⬇️'}
                </span>
              </p>
              <p className="text-zinc-300">
                Enter Price    : <span className="text-white">{signal.entryPrice}</span>
              </p>
              
              <div className="pt-2 space-y-1">
                <p className="text-green-400">
                  Take Profit 1  : <span className="text-green-300">{signal.tp1}</span>
                </p>
                <p className="text-green-400">
                  Take Profit 2  : <span className="text-green-300">{signal.tp2}</span>
                </p>
                <p className="text-green-400">
                  Take Profit 3  : <span className="text-green-300">{signal.tp3}</span>
                </p>
                <p className="text-green-400">
                  Take Profit 4  : <span className="text-green-300">{signal.tp4}</span>
                </p>
              </div>
              
              <p className="text-red-400 pt-2">
                Stoploss       : <span className="text-red-300">{signal.stopLoss}</span>
              </p>

              {/* Signal badge */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-zinc-500">Premium Signal</span>
                <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-400 text-xs font-medium">
                  💎 Active
                </span>
              </div>
            </div>
          ) : (
            // Update Card (TP or SL)
            <div className="space-y-2">
              <p className="text-zinc-400 text-sm">Position Status</p>
              
              {signal.updateType === 'tp' ? (
                // Take Profit Update - GREEN
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-green-400 font-semibold">
                    ✅ Take Profit {signal.tpLevel} From {signal.signalDirection} Signal
                  </p>
                  <p className="text-green-300 text-sm mt-1">
                    at Price: <span className="font-mono font-bold">{signal.hitPrice}</span> in <span className="font-bold">{signal.script}</span>
                  </p>
                </div>
              ) : (
                // Stop Loss Hit - RED
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 font-semibold">
                    ❌ Hit SL From {signal.signalDirection} Signal
                  </p>
                  <p className="text-red-300 text-sm mt-1">
                    Price: <span className="font-mono font-bold">{signal.hitPrice}</span> in <span className="font-bold">{signal.script}</span>
                  </p>
                </div>
              )}

              {/* Update badge */}
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-zinc-500">Position Update</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  signal.updateType === 'tp' 
                    ? 'bg-green-500/10 text-green-400' 
                    : 'bg-red-500/10 text-red-400'
                }`}>
                  {signal.updateType === 'tp' ? '🎯 Profit' : '🛑 Stopped'}
                </span>
              </div>
            </div>
          )}
        </motion.div>
      ))}

      {signals.length === 0 && (
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block">📡</span>
          <p className="text-zinc-400">Waiting for signals...</p>
          <p className="text-zinc-600 text-sm mt-1">Signals will appear here in real-time</p>
        </div>
      )}
    </div>
  )
}
